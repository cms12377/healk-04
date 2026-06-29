-- รันใน Supabase SQL Editor (ครั้งเดียว) — RPC เดิมพันจริง
BEGIN;

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
  v_bet JSONB;
  v_amount NUMERIC(18, 2);
  v_total NUMERIC(18, 2) := 0;
  v_balance NUMERIC(18, 2);
  v_bet_id BIGINT;
BEGIN
  IF p_bets IS NULL OR jsonb_array_length(p_bets) = 0 THEN
    RAISE EXCEPTION 'no bets';
  END IF;

  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  SELECT name INTO v_game_name FROM games WHERE id = p_games_id;
  IF v_game_name IS NULL THEN RAISE EXCEPTION 'game not found'; END IF;

  FOR v_bet IN SELECT * FROM jsonb_array_elements(p_bets)
  LOOP
    v_amount := (v_bet->>'amount')::NUMERIC;
    IF v_amount IS NULL OR v_amount <= 0 THEN
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
      COALESCE(v_bet->>'label', v_bet->>'bet_content', ''),
      v_amount,
      NULLIF(v_bet->>'odds', '')::NUMERIC,
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

GRANT EXECUTE ON FUNCTION public.submit_bets(BIGINT, TEXT, JSONB) TO authenticated;

COMMIT;
