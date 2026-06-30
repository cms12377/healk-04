-- Random draw mode: target ~30% of pending bets win per issue (house ~70%)
-- Manual mode unchanged (admin preset result)
-- Run in Supabase SQL Editor after game_betting.sql + fix_draw_mode.sql

BEGIN;

ALTER TABLE games ADD COLUMN IF NOT EXISTS random_win_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.30;

DO $$ BEGIN
  ALTER TABLE games ADD CONSTRAINT games_random_win_rate_check
    CHECK (random_win_rate >= 0 AND random_win_rate <= 1);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE games SET random_win_rate = 0.30 WHERE random_win_rate IS NULL;

-- Count how many pending bets would win for a candidate result
CREATE OR REPLACE FUNCTION public.fn_count_issue_wins(
  p_games_id BIGINT,
  p_issue TEXT,
  p_result TEXT
)
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bet RECORD;
  v_wins INT := 0;
  v_game_code TEXT;
  v_group_code TEXT;
  v_bc TEXT;
BEGIN
  SELECT code INTO v_game_code FROM games WHERE id = p_games_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR v_bet IN
    SELECT br.*, pg.code AS group_code, pi.bet_content AS item_bc
    FROM bet_records br
    LEFT JOIN play_items pi ON pi.id = br.play_item_id
    LEFT JOIN play_groups pg ON pg.id = pi.group_id
    WHERE br.games_id = p_games_id
      AND br.issue = p_issue
      AND br.status = '0'
  LOOP
    v_group_code := COALESCE(v_bet.group_code, '');
    v_bc := regexp_replace(
      COALESCE(NULLIF(trim(v_bet.bet_content), ''), v_bet.item_bc, ''),
      '[,，、]', '', 'g'
    );
    IF fn_evaluate_bet_win(v_game_code, v_group_code, v_bc, p_result) THEN
      v_wins := v_wins + 1;
    END IF;
  END LOOP;

  RETURN v_wins;
END;
$$;

-- Pick a random draw result biased toward target win rate on pending bets
CREATE OR REPLACE FUNCTION public.fn_biased_random_draw(
  p_games_id BIGINT,
  p_issue TEXT,
  p_game_code TEXT,
  p_win_rate NUMERIC DEFAULT 0.30,
  p_attempts INT DEFAULT 120
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bet_count INT;
  v_rate NUMERIC;
  v_floor INT;
  v_frac NUMERIC;
  v_target INT;
  v_candidate TEXT;
  v_wins INT;
  v_best_result TEXT;
  v_best_diff INT := 999999;
  v_best_wins INT := 999999;
  v_i INT;
BEGIN
  v_rate := LEAST(1, GREATEST(0, COALESCE(p_win_rate, 0.30)));

  SELECT COUNT(*)::INT INTO v_bet_count
  FROM bet_records
  WHERE games_id = p_games_id
    AND issue = p_issue
    AND status = '0';

  IF v_bet_count = 0 THEN
    RETURN fn_random_draw(p_game_code);
  END IF;

  -- Stochastic rounding: e.g. 1 bet @ 30% → 30% chance of 1 win, 10 bets → 3 wins
  v_floor := FLOOR(v_bet_count * v_rate)::INT;
  v_frac := (v_bet_count * v_rate) - v_floor;
  v_target := v_floor + CASE WHEN random() < v_frac THEN 1 ELSE 0 END;
  v_target := LEAST(v_bet_count, GREATEST(0, v_target));

  v_best_result := fn_random_draw(p_game_code);
  v_wins := fn_count_issue_wins(p_games_id, p_issue, v_best_result);
  v_best_wins := v_wins;
  v_best_diff := ABS(v_wins - v_target);

  FOR v_i IN 2..GREATEST(2, p_attempts) LOOP
    v_candidate := fn_random_draw(p_game_code);
    v_wins := fn_count_issue_wins(p_games_id, p_issue, v_candidate);
    IF ABS(v_wins - v_target) < v_best_diff
       OR (ABS(v_wins - v_target) = v_best_diff AND v_wins < v_best_wins)
    THEN
      v_best_diff := ABS(v_wins - v_target);
      v_best_result := v_candidate;
      v_best_wins := v_wins;
      IF v_best_diff = 0 THEN EXIT; END IF;
    END IF;
  END LOOP;

  RETURN v_best_result;
END;
$$;

-- Patch advance_game_round: random mode uses biased draw
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
  v_day_prefix TEXT;
  v_next_seq INT;
  v_bet_count INT;
  v_win_count INT;
  v_rate NUMERIC;
BEGIN
  v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;

  SELECT id, code, name, draw_mode, next_draw_result, random_win_rate
  INTO v_game
  FROM games WHERE id = p_games_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;

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

  v_rate := LEAST(1, GREATEST(0, COALESCE(v_game.random_win_rate, 0.30)));

  IF NOT EXISTS (
    SELECT 1 FROM draw_results WHERE games_id = p_games_id AND issue = v_issue.issue
  ) THEN
    IF COALESCE(v_game.draw_mode, 'random') = 'manual' THEN
      v_result := fn_resolve_draw_result(v_game.code, 'manual', v_game.next_draw_result);
      IF v_result IS NULL THEN
        RETURN jsonb_build_object(
          'skipped', true,
          'reason', 'manual_result_required',
          'issue', v_issue.issue,
          'draw_mode', 'manual'
        );
      END IF;
      UPDATE games SET next_draw_result = NULL WHERE id = p_games_id;
    ELSE
      v_result := fn_biased_random_draw(
        p_games_id,
        v_issue.issue,
        v_game.code,
        v_rate
      );
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
  v_day_prefix := to_char(NOW(), 'YYYYMMDD');

  SELECT COALESCE(MAX(SUBSTRING(issue FROM 9 FOR 3)::INT), 0) + 1
  INTO v_next_seq
  FROM game_issues
  WHERE games_id = p_games_id AND issue LIKE v_day_prefix || '%';

  LOOP
    v_new_issue := v_day_prefix || lpad(v_next_seq::TEXT, 3, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM game_issues gi2
      WHERE gi2.games_id = p_games_id AND gi2.issue = v_new_issue
    );
    v_next_seq := v_next_seq + 1;
  END LOOP;

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
    'draw_mode', COALESCE(v_game.draw_mode, 'random'),
    'win_control', jsonb_build_object(
      'rate', v_rate,
      'pending_bets', v_bet_count,
      'expected_wins', ROUND(v_bet_count * v_rate)::INT,
      'result_wins', v_win_count
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_count_issue_wins(BIGINT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_biased_random_draw(BIGINT, TEXT, TEXT, NUMERIC, INT) TO authenticated;

COMMIT;
