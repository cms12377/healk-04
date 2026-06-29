-- Run in Supabase SQL Editor BEFORE: node scripts/test-rpc-supabase.mjs
-- Fixes settle bug + refreshes countdown for all games

BEGIN;

-- 1) Patch FOR UPDATE bug in fn_settle_issue_bets
CREATE OR REPLACE FUNCTION public.fn_settle_issue_bets(
  p_games_id BIGINT,
  p_issue TEXT,
  p_result TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bet RECORD;
  v_win BOOLEAN;
  v_win_amount NUMERIC(18, 2);
  v_settled INT := 0;
  v_group_code TEXT;
  v_game_code TEXT;
  v_bc TEXT;
BEGIN
  SELECT code INTO v_game_code FROM games WHERE id = p_games_id;

  FOR v_bet IN
    SELECT br.*, pg.code AS group_code, pi.bet_content AS item_bc
    FROM bet_records br
    LEFT JOIN play_items pi ON pi.id = br.play_item_id
    LEFT JOIN play_groups pg ON pg.id = pi.group_id
    WHERE br.games_id = p_games_id
      AND br.issue = p_issue
      AND br.status = '0'
    FOR UPDATE OF br
  LOOP
    v_group_code := COALESCE(v_bet.group_code, '');
    v_bc := COALESCE(v_bet.item_bc, regexp_replace(v_bet.bet_content, '[,，、]', '', 'g'));
    v_win := fn_evaluate_bet_win(v_game_code, v_group_code, v_bc, p_result);

    IF v_win THEN
      v_win_amount := ROUND(v_bet.amount * COALESCE(v_bet.odds, 1), 2);
      UPDATE bet_records SET
        status = '1', status_text = 'ชำระแล้ว',
        is_win = '1', is_win_text = 'ชนะ',
        win_amount = v_win_amount,
        settletime = EXTRACT(EPOCH FROM NOW())::BIGINT
      WHERE id = v_bet.id;
      INSERT INTO user_money_logs (user_id, category_id, money, type, ref_type, ref_id, createtime)
      VALUES (v_bet.user_id, 19, v_win_amount, 'ชนะเดิมพัน', 'bet', v_bet.id,
        EXTRACT(EPOCH FROM NOW())::BIGINT);
      UPDATE users SET unsettled = GREATEST(0, unsettled - v_bet.amount),
        updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT WHERE id = v_bet.user_id;
    ELSE
      UPDATE bet_records SET
        status = '1', status_text = 'ชำระแล้ว',
        is_win = '0', is_win_text = 'แพ้',
        win_amount = 0,
        settletime = EXTRACT(EPOCH FROM NOW())::BIGINT
      WHERE id = v_bet.id;
      UPDATE users SET unsettled = GREATEST(0, unsettled - v_bet.amount),
        updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT WHERE id = v_bet.user_id;
    END IF;
    v_settled := v_settled + 1;
  END LOOP;
  RETURN v_settled;
END;
$$;

-- 2) Refresh countdown
UPDATE game_issues gi
SET draw_time = EXTRACT(EPOCH FROM NOW())::BIGINT + v.secs
FROM games g
JOIN (VALUES
  ('df_pk10', 600), ('df_pk10_3', 180), ('df_pk10_5', 300),
  ('df_k3', 60), ('xam_6', 300), ('xy_28', 300), ('df_ssc', 60)
) AS v(code, secs) ON g.code = v.code
WHERE gi.games_id = g.id AND gi.status = 0;

COMMIT;

-- 3) Dev test helper — top up current user balance (for RPC tests only)
CREATE OR REPLACE FUNCTION public.test_wallet_topup(p_amount NUMERIC DEFAULT 50000)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id BIGINT;
  v_log_id BIGINT;
BEGIN
  IF p_amount <= 0 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'invalid test amount';
  END IF;
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  INSERT INTO user_money_logs (user_id, category_id, money, type, ref_type, createtime)
  VALUES (v_user_id, 14, p_amount, 'ทดสอบ RPC', 'test', EXTRACT(EPOCH FROM NOW())::BIGINT)
  RETURNING id INTO v_log_id;
  RETURN (SELECT money FROM users WHERE id = v_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_wallet_topup(NUMERIC) TO authenticated;

-- 4) Fix advance_game_round issue numbering (duplicate key bug)
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
BEGIN
  v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;
  SELECT id, code, name INTO v_game FROM games WHERE id = p_games_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;
  SELECT * INTO v_issue FROM game_issues
  WHERE games_id = p_games_id AND status = 0
  ORDER BY draw_time DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no open issue'; END IF;
  IF v_issue.draw_time > v_now THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'not_due', 'seconds_left', v_issue.draw_time - v_now);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM draw_results WHERE games_id = p_games_id AND issue = v_issue.issue) THEN
    v_result := fn_random_draw(v_game.code);
    INSERT INTO draw_results (games_id, issue, result, createtime) VALUES (p_games_id, v_issue.issue, v_result, v_now);
  ELSE
    SELECT result INTO v_result FROM draw_results WHERE games_id = p_games_id AND issue = v_issue.issue LIMIT 1;
  END IF;
  v_settled := fn_settle_issue_bets(p_games_id, v_issue.issue, v_result);
  UPDATE game_issues SET status = 1 WHERE id = v_issue.id;
  v_cycle := fn_game_cycle_seconds(v_game.code);
  v_day_prefix := to_char(NOW(), 'YYYYMMDD');
  SELECT COALESCE(MAX(SUBSTRING(issue FROM 9 FOR 3)::INT), 0) + 1 INTO v_next_seq
  FROM game_issues WHERE games_id = p_games_id AND issue LIKE v_day_prefix || '%';
  LOOP
    v_new_issue := v_day_prefix || lpad(v_next_seq::TEXT, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM game_issues gi2 WHERE gi2.games_id = p_games_id AND gi2.issue = v_new_issue);
    v_next_seq := v_next_seq + 1;
  END LOOP;
  INSERT INTO game_issues (games_id, issue, draw_time, status, bet_quick_amount)
  VALUES (p_games_id, v_new_issue, v_now + v_cycle, 0,
    COALESCE(v_issue.bet_quick_amount, '["1000","5000","10000","50000"]'::JSONB));
  RETURN jsonb_build_object('skipped', false, 'drawn_issue', v_issue.issue, 'result', v_result,
    'settled', v_settled, 'new_issue', v_new_issue, 'draw_time', v_now + v_cycle);
END;
$$;

SELECT g.code, gi.issue,
  gi.draw_time - EXTRACT(EPOCH FROM NOW())::BIGINT AS seconds_left
FROM game_issues gi
JOIN games g ON g.id = gi.games_id
WHERE gi.status = 0
ORDER BY g.sort;
