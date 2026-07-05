-- Block member transactions: blocked users (status=0) can login but cannot bet/deposit/withdraw
-- Run after fix_admin_member_crud.sql

BEGIN;

-- Helper: check if user is blocked
CREATE OR REPLACE FUNCTION public.fn_assert_user_active()
RETURNS users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM users WHERE auth_user_id = auth.uid();
  
  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;
  
  IF v_user.status = 0 THEN
    RAISE EXCEPTION 'account blocked';
  END IF;
  
  IF v_user.status = -1 THEN
    RAISE EXCEPTION 'account deleted';
  END IF;
  
  RETURN v_user;
END;
$$;

-- Update submit_bets: check user active
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
  v_user RECORD;
  v_user_id BIGINT;
  v_game_name VARCHAR(128);
  v_bet JSONB;
  v_amount NUMERIC(18, 2);
  v_total NUMERIC(18, 2) := 0;
  v_balance NUMERIC(18, 2);
  v_bet_id BIGINT;
  v_draw_time BIGINT;
  v_item_odds NUMERIC;
  v_item_bc TEXT;
  v_bc TEXT;
BEGIN
  IF p_bets IS NULL OR jsonb_array_length(p_bets) = 0 THEN
    RAISE EXCEPTION 'no bets';
  END IF;

  -- Check user is active (not blocked)
  v_user := fn_assert_user_active();
  v_user_id := v_user.id;

  SELECT name INTO v_game_name FROM games WHERE id = p_games_id;
  IF v_game_name IS NULL THEN RAISE EXCEPTION 'game not found'; END IF;

  SELECT draw_time INTO v_draw_time FROM game_issues
  WHERE games_id = p_games_id AND issue = p_issue AND status = 0
  LIMIT 1;

  IF v_draw_time IS NULL THEN
    RAISE EXCEPTION 'issue closed or not found';
  END IF;

  IF v_draw_time <= EXTRACT(EPOCH FROM NOW())::BIGINT THEN
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
      COALESCE(v_item_odds, (v_bet->>'odds')::NUMERIC, 0),
      '0',
      'รอผล',
      '0',
      'รอผล',
      EXTRACT(EPOCH FROM NOW())::BIGINT
    )
    RETURNING id INTO v_bet_id;
  END LOOP;

  UPDATE users SET money = money - v_total, unsettled = unsettled + v_total WHERE id = v_user_id;

  INSERT INTO user_money_logs (user_id, category_id, money, type, createtime)
  VALUES (v_user_id, 20, -v_total, 'เดิมพัน', EXTRACT(EPOCH FROM NOW())::BIGINT);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_bets(BIGINT, TEXT, JSONB) TO authenticated;

-- Update submit_withdraw: check user active
CREATE OR REPLACE FUNCTION public.submit_withdraw(
  p_amount NUMERIC,
  p_pay_password TEXT,
  p_type TEXT DEFAULT 'bank',
  p_bank_name TEXT DEFAULT NULL,
  p_bank_card TEXT DEFAULT NULL,
  p_bank_username TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_user_id BIGINT;
  v_cfg RECORD;
  v_order_id BIGINT;
  v_fee NUMERIC(18, 2);
  v_wtype withdraw_type;
BEGIN
  -- Check user is active (not blocked)
  v_user := fn_assert_user_active();
  v_user_id := v_user.id;

  IF NOT verify_pay_password(p_pay_password) THEN 
    RAISE EXCEPTION 'invalid pay password'; 
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than 0';
  END IF;

  SELECT * INTO v_cfg FROM withdraw_settings WHERE id = 1;
  v_fee := COALESCE(v_cfg.withdraw_fee, 0);

  IF v_user.money < (p_amount + v_fee) THEN
    RAISE EXCEPTION 'insufficient balance';
  END IF;

  v_wtype := CASE WHEN p_type = 'crypto' THEN 'crypto'::withdraw_type ELSE 'bank'::withdraw_type END;

  INSERT INTO withdraw_orders (
    user_id, type, bank_name, bank_card, bank_username,
    amount, fee, status, createtime
  ) VALUES (
    v_user_id, v_wtype, p_bank_name, p_bank_card, p_bank_username,
    p_amount, v_fee, 'pending',
    EXTRACT(EPOCH FROM NOW())::BIGINT
  )
  RETURNING id INTO v_order_id;

  INSERT INTO user_money_logs (user_id, category_id, money, type, ref_type, ref_id, createtime)
  VALUES (
    v_user_id, 15, -(p_amount + v_fee), 'ถอนเงิน (รออนุมัติ)', 'withdraw', v_order_id,
    EXTRACT(EPOCH FROM NOW())::BIGINT
  );

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_withdraw(NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Update submit_deposit: check user active
CREATE OR REPLACE FUNCTION public.submit_deposit(
  p_amount NUMERIC,
  p_channel_type TEXT DEFAULT 'bank',
  p_payer_name TEXT DEFAULT NULL,
  p_proof_image TEXT DEFAULT NULL,
  p_channel_id BIGINT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_user_id BIGINT;
  v_order_id BIGINT;
BEGIN
  IF p_amount <= 0 THEN 
    RAISE EXCEPTION 'invalid amount'; 
  END IF;

  -- Check user is active (not blocked)
  v_user := fn_assert_user_active();
  v_user_id := v_user.id;

  INSERT INTO deposit_orders (
    user_id, channel_id, channel_type, amount, payer_name, proof_image, status, createtime
  )
  VALUES (
    v_user_id,
    p_channel_id,
    p_channel_type::recharge_channel_type,
    p_amount,
    NULLIF(trim(p_payer_name), ''),
    NULLIF(trim(p_proof_image), ''),
    'pending',
    EXTRACT(EPOCH FROM NOW())::BIGINT
  )
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_deposit(NUMERIC, TEXT, TEXT, TEXT, BIGINT) TO authenticated;

COMMIT;
