-- th6688 house model: fair random only (no casino / biased draw)
--   random = fn_random_draw (house edge from play_items.odds — like laoadmin)
--   manual = admin preset, or fair random fallback if unset
-- Run after fix_draw_mode.sql + fix_th6688_parity.sql

BEGIN;

-- Remove legacy casino engine (safe if already absent)
DROP FUNCTION IF EXISTS public.admin_set_random_win_rate(BIGINT, NUMERIC);
DROP FUNCTION IF EXISTS public.fn_biased_random_draw(BIGINT, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.fn_biased_random_draw(BIGINT, TEXT, TEXT, NUMERIC, INT);
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_random_win_rate_check;
ALTER TABLE games DROP COLUMN IF EXISTS random_win_rate;

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_draw_mode_check;
ALTER TABLE games ADD CONSTRAINT games_draw_mode_check
  CHECK (draw_mode IN ('random', 'manual'));

UPDATE games SET draw_mode = 'random' WHERE draw_mode IS NULL OR draw_mode NOT IN ('random', 'manual');
UPDATE games SET draw_mode = 'random' WHERE draw_mode = 'casino';

CREATE OR REPLACE FUNCTION public.admin_set_draw_mode(
  p_games_id BIGINT,
  p_mode TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF p_mode NOT IN ('random', 'manual') THEN
    RAISE EXCEPTION 'invalid draw mode';
  END IF;

  UPDATE games SET draw_mode = p_mode WHERE id = p_games_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;

  RETURN admin_list_games();
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
    IF v_mode = 'manual' THEN
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

  INSERT INTO game_issues (games_id, issue, draw_time, status, bet_quick_amount)
  VALUES (
    p_games_id,
    v_new_issue,
    v_now + v_cycle,
    0,
    COALESCE(v_issue.bet_quick_amount, '["1000","5000","10000","50000"]'::JSONB)
  );

  RETURN jsonb_build_object(
    'skipped', false,
    'drawn_issue', v_issue.issue,
    'result', v_result,
    'settled', v_settled,
    'new_issue', v_new_issue,
    'draw_time', v_now + v_cycle,
    'draw_mode', v_mode,
    'manual_fallback', v_used_fallback,
    'fair_random', v_mode = 'random' OR v_used_fallback,
    'pending_bets', v_bet_count,
    'result_wins', v_win_count
  );
END;
$$;

-- Strip win-rate from admin game list (casino mode removed)
CREATE OR REPLACE FUNCTION public.admin_list_games()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_assert_staff();

  RETURN jsonb_build_object(
    'data',
    COALESCE(
      (
        SELECT jsonb_agg(row_data ORDER BY sort_val, id_val)
        FROM (
          SELECT
            g.sort AS sort_val,
            g.id AS id_val,
            jsonb_build_object(
              'id', g.id,
              'code', g.code,
              'name', g.name,
              'game_type', g.game_type,
              'status', g.status,
              'sort', g.sort,
              'draw_mode', COALESCE(g.draw_mode, 'random'),
              'next_draw_result', g.next_draw_result,
              'issue', gi.issue,
              'draw_time', gi.draw_time,
              'seconds_left',
                CASE
                  WHEN gi.draw_time IS NOT NULL THEN
                    GREATEST(0, gi.draw_time - EXTRACT(EPOCH FROM NOW())::BIGINT)
                  ELSE NULL
                END,
              'last_issue', dr.issue,
              'last_result', dr.result
            ) AS row_data
          FROM games g
          LEFT JOIN LATERAL (
            SELECT issue, draw_time
            FROM game_issues
            WHERE games_id = g.id AND status = 0
            ORDER BY draw_time DESC
            LIMIT 1
          ) gi ON TRUE
          LEFT JOIN LATERAL (
            SELECT issue, result
            FROM draw_results
            WHERE games_id = g.id
            ORDER BY createtime DESC
            LIMIT 1
          ) dr ON TRUE
          ORDER BY g.sort, g.id
        ) sub
      ),
      '[]'::JSONB
    )
  );
END;
$$;

COMMIT;
