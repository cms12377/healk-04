-- Fix rapid continuous draws after admin schedule (countdown stuck at 0)
-- Run in Supabase SQL Editor if member draws every second with no 5-min countdown
-- Safe to re-run. Requires fix_scheduled_draw_results.sql (table + helpers) already applied.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_resolve_scheduled_draw(
  p_games_id BIGINT,
  p_issue TEXT,
  p_draw_time BIGINT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_row RECORD;
  v_result TEXT;
BEGIN
  SELECT id, result INTO v_row
  FROM scheduled_draw_results
  WHERE games_id = p_games_id
    AND issue = p_issue
    AND status = 0
    AND result IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_result := fn_normalize_draw_result(v_row.result);

  UPDATE scheduled_draw_results
  SET status = 1, updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = v_row.id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.advance_game_round(p_games_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game RECORD;
  v_issue RECORD;
  v_result TEXT;
  v_settled INT;
  v_new_issue TEXT;
  v_now BIGINT;
  v_cycle INT;
  v_bet_count INT;
  v_win_count INT;
  v_mode TEXT;
  v_used_fallback BOOLEAN := FALSE;
  v_used_scheduled BOOLEAN := FALSE;
  v_scheduled_draw_time BIGINT;
  v_next_draw_time BIGINT;
BEGIN
  v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;

  SELECT id, code, name, draw_mode, next_draw_result
  INTO v_game
  FROM games WHERE id = p_games_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;

  v_mode := COALESCE(v_game.draw_mode, 'random');
  IF v_mode NOT IN ('random', 'manual') THEN
    v_mode := 'random';
  END IF;

  SELECT * INTO v_issue FROM game_issues
  WHERE games_id = p_games_id AND status = 0
  ORDER BY draw_time DESC LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'no open issue'; END IF;

  IF v_issue.draw_time > v_now THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason', 'not_due',
      'seconds_left', v_issue.draw_time - v_now
    );
  END IF;

  SELECT COUNT(*)::INT INTO v_bet_count
  FROM bet_records
  WHERE games_id = p_games_id AND issue = v_issue.issue AND status = '0';

  IF NOT EXISTS (
    SELECT 1 FROM draw_results WHERE games_id = p_games_id AND issue = v_issue.issue
  ) THEN
    v_result := fn_resolve_scheduled_draw(p_games_id, v_issue.issue, v_issue.draw_time);
    IF v_result IS NOT NULL THEN
      v_used_scheduled := TRUE;
    ELSIF v_mode = 'manual' THEN
      v_result := fn_resolve_draw_result(v_game.code, 'manual', v_game.next_draw_result);
      IF v_result IS NULL THEN
        v_result := fn_random_draw(v_game.code);
        v_used_fallback := TRUE;
      ELSE
        UPDATE games SET next_draw_result = NULL WHERE id = p_games_id;
      END IF;
    ELSE
      v_result := fn_random_draw(v_game.code);
    END IF;

    INSERT INTO draw_results (games_id, issue, result, createtime)
    VALUES (p_games_id, v_issue.issue, v_result, v_now);
  ELSE
    SELECT result INTO v_result FROM draw_results
    WHERE games_id = p_games_id AND issue = v_issue.issue LIMIT 1;
  END IF;

  v_win_count := fn_count_issue_wins(p_games_id, v_issue.issue, v_result);
  v_settled := fn_settle_issue_bets(p_games_id, v_issue.issue, v_result);

  UPDATE game_issues SET status = 1 WHERE id = v_issue.id;

  v_cycle := fn_game_cycle_seconds(v_game.code);
  v_new_issue := fn_next_issue_number(p_games_id);

  v_scheduled_draw_time := NULL;
  SELECT s.draw_time INTO v_scheduled_draw_time
  FROM scheduled_draw_results s
  WHERE s.games_id = p_games_id AND s.issue = v_new_issue AND s.status = 0
  LIMIT 1;

  v_next_draw_time := v_now + v_cycle;
  IF v_scheduled_draw_time IS NOT NULL AND v_scheduled_draw_time > v_now THEN
    v_next_draw_time := v_scheduled_draw_time;
  END IF;

  INSERT INTO game_issues (games_id, issue, draw_time, status, bet_quick_amount)
  VALUES (
    p_games_id,
    v_new_issue,
    v_next_draw_time,
    0,
    COALESCE(v_issue.bet_quick_amount, '["1000","5000","10000","50000"]'::JSONB)
  );

  RETURN jsonb_build_object(
    'skipped', false,
    'drawn_issue', v_issue.issue,
    'result', v_result,
    'settled', v_settled,
    'new_issue', v_new_issue,
    'draw_time', v_next_draw_time,
    'draw_mode', v_mode,
    'manual_fallback', v_used_fallback,
    'scheduled', v_used_scheduled,
    'fair_random', (v_mode = 'random' OR v_used_fallback) AND NOT v_used_scheduled,
    'pending_bets', v_bet_count,
    'result_wins', v_win_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_game_round(BIGINT) TO anon, authenticated;

-- Reset open issues stuck in the past (rapid-draw loop)
UPDATE game_issues gi
SET draw_time = EXTRACT(EPOCH FROM NOW())::BIGINT + fn_game_cycle_seconds(g.code)
FROM games g
WHERE gi.games_id = g.id
  AND gi.status = 0
  AND gi.draw_time <= EXTRACT(EPOCH FROM NOW())::BIGINT + 30;

COMMIT;
