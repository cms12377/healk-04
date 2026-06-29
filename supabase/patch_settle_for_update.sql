-- Patch: fix advance_game_round FOR UPDATE error on settle
-- Run in Supabase SQL Editor if advance_game_round fails with:
--   "FOR UPDATE cannot be applied to the nullable side of an outer join"
-- Or re-run full supabase/game_betting.sql

BEGIN;

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

      UPDATE users SET
        unsettled = GREATEST(0, unsettled - v_bet.amount),
        updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
      WHERE id = v_bet.user_id;
    ELSE
      UPDATE bet_records SET
        status = '1', status_text = 'ชำระแล้ว',
        is_win = '0', is_win_text = 'แพ้',
        win_amount = 0,
        settletime = EXTRACT(EPOCH FROM NOW())::BIGINT
      WHERE id = v_bet.id;

      UPDATE users SET
        unsettled = GREATEST(0, unsettled - v_bet.amount),
        updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
      WHERE id = v_bet.user_id;
    END IF;

    v_settled := v_settled + 1;
  END LOOP;

  RETURN v_settled;
END;
$$;

COMMIT;
