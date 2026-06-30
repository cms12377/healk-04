-- th6688 parity: issue number format + betting cutoff (seal) seconds
-- Run after fix_random_win_rate.sql + fix_casino_house_edge.sql
-- Reference: laoadmin.top /api/game/games + /api/game/current_game

BEGIN;

-- Cutoff seconds before draw_time when betting is sealed (th6688 `cutoff` field)
CREATE OR REPLACE FUNCTION public.fn_game_cutoff_seconds(p_game_code TEXT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_game_code
    WHEN 'df_pk10' THEN 5
    WHEN 'df_pk10_3' THEN 5
    WHEN 'df_pk10_5' THEN 5
    WHEN 'df_k3' THEN 0
    WHEN 'xam_6' THEN 5
    WHEN 'xy_28' THEN 5
    WHEN 'df_ssc' THEN 0
    ELSE 5
  END;
$$;

-- th6688 issue format: YYYY-MMDD-NNN (e.g. 2026-0701-001)
CREATE OR REPLACE FUNCTION public.fn_next_issue_number(p_games_id BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix TEXT;
  v_next_seq INT;
  v_new_issue TEXT;
BEGIN
  v_prefix := to_char(NOW(), 'YYYY') || '-' || to_char(NOW(), 'MMDD');

  SELECT COALESCE(MAX(SUBSTRING(issue FROM 12 FOR 3)::INT), 0) + 1
  INTO v_next_seq
  FROM game_issues
  WHERE games_id = p_games_id
    AND issue ~ ('^' || v_prefix || '-[0-9]{3}$');

  LOOP
    v_new_issue := v_prefix || '-' || lpad(v_next_seq::TEXT, 3, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM game_issues gi2
      WHERE gi2.games_id = p_games_id AND gi2.issue = v_new_issue
    );
    v_next_seq := v_next_seq + 1;
  END LOOP;

  RETURN v_new_issue;
END;
$$;

-- submit_bets: honor cutoff (seal) like th6688
CREATE OR REPLACE FUNCTION public.submit_bets(
  p_games_id BIGINT,
  p_issue TEXT,
  p_bets JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id BIGINT;
  v_game_name VARCHAR(128);
  v_game_code TEXT;
  v_bet JSONB;
  v_amount NUMERIC(18, 2);
  v_total NUMERIC(18, 2) := 0;
  v_balance NUMERIC(18, 2);
  v_bet_id BIGINT;
  v_draw_time BIGINT;
  v_cutoff INT;
  v_now BIGINT;
  v_item_odds NUMERIC;
  v_item_bc TEXT;
  v_bc TEXT;
BEGIN
  IF p_bets IS NULL OR jsonb_array_length(p_bets) = 0 THEN
    RAISE EXCEPTION 'no bets';
  END IF;

  v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;

  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  SELECT name, code INTO v_game_name, v_game_code FROM games WHERE id = p_games_id;
  IF v_game_name IS NULL THEN RAISE EXCEPTION 'game not found'; END IF;

  v_cutoff := fn_game_cutoff_seconds(v_game_code);

  SELECT draw_time INTO v_draw_time FROM game_issues
  WHERE games_id = p_games_id AND issue = p_issue AND status = 0
  LIMIT 1;

  IF v_draw_time IS NULL THEN
    RAISE EXCEPTION 'issue closed or not found';
  END IF;

  IF v_draw_time - v_cutoff <= v_now THEN
    RAISE EXCEPTION 'betting closed';
  END IF;

  FOR v_bet IN SELECT * FROM jsonb_array_elements(p_bets)
  LOOP
    v_amount := (v_bet->>'amount')::NUMERIC;
    IF v_amount IS NULL OR v_amount <= 0 OR v_amount <> trunc(v_amount) THEN
      RAISE EXCEPTION 'invalid bet amount';
    END IF;
    v_total := v_total + v_amount;
  END LOOP;

  SELECT money INTO v_balance FROM users WHERE id = v_user_id FOR UPDATE;
  IF v_balance < v_total THEN
    RAISE EXCEPTION 'insufficient balance';
  END IF;

  FOR v_bet IN SELECT * FROM jsonb_array_elements(p_bets)
  LOOP
    v_amount := (v_bet->>'amount')::NUMERIC;
    v_bc := regexp_replace(COALESCE(v_bet->>'bet_content', ''), '[,，、]', '', 'g');
    v_item_odds := NULL;
    v_item_bc := NULL;

    IF NULLIF(v_bet->>'play_item_id', '') IS NOT NULL THEN
      SELECT pi.odds, pi.bet_content
      INTO v_item_odds, v_item_bc
      FROM play_items pi
      WHERE pi.id = (v_bet->>'play_item_id')::BIGINT
        AND pi.games_id = p_games_id
        AND pi.status = 1;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'invalid play item';
      END IF;

      IF v_bc = '' OR v_bc IS NULL THEN
        v_bc := regexp_replace(COALESCE(v_item_bc, ''), '[,，、]', '', 'g');
      END IF;
    END IF;

    INSERT INTO bet_records (
      user_id, games_id, games_name, issue, play_item_id,
      category_name, bet_content, amount, odds,
      status, status_text, is_win, is_win_text, createtime
    ) VALUES (
      v_user_id,
      p_games_id,
      v_game_name,
      p_issue,
      NULLIF(v_bet->>'play_item_id', '')::BIGINT,
      COALESCE(v_bet->>'category_name', v_bet->>'group_name', ''),
      v_bc,
      v_amount,
      COALESCE(v_item_odds, NULLIF(v_bet->>'odds', '')::NUMERIC),
      '0', 'รอดำเนินการ', '0', 'รอผล',
      EXTRACT(EPOCH FROM NOW())::BIGINT
    )
    RETURNING id INTO v_bet_id;

    INSERT INTO user_money_logs (user_id, category_id, money, type, ref_type, ref_id, createtime)
    VALUES (
      v_user_id, 20, -v_amount, 'เดิมพัน', 'bet', v_bet_id,
      EXTRACT(EPOCH FROM NOW())::BIGINT
    );
  END LOOP;

  UPDATE users
  SET unsettled = unsettled + v_total,
      updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = v_user_id;
END;
$$;

-- Patch advance_game_round to use th6688 issue numbers (keep casino draw logic from fix_random_win_rate)
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

  v_rate := LEAST(0.50, GREATEST(0.05, COALESCE(v_game.random_win_rate, 0.30)));

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

GRANT EXECUTE ON FUNCTION public.fn_game_cutoff_seconds(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_next_issue_number(BIGINT) TO authenticated;

COMMIT;
