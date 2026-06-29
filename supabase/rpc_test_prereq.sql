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

SELECT g.code, gi.issue,
  gi.draw_time - EXTRACT(EPOCH FROM NOW())::BIGINT AS seconds_left
FROM game_issues gi
JOIN games g ON g.id = gi.games_id
WHERE gi.status = 0
ORDER BY g.sort;
