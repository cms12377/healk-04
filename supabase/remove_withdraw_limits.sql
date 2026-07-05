-- Remove withdraw min/max limits: allow any amount > 0 and <= user balance
-- Run in Supabase SQL Editor

BEGIN;

-- Update withdraw_settings: effectively no limits
UPDATE withdraw_settings
SET
  withdraw_min = 1,              -- ขั้นต่ำ 1 บาท (ป้องกันถอน 0)
  withdraw_max = 999999999,      -- สูงสุด 999,999,999 บาท (ไม่จำกัดจริง)
  withdraw_fee = 0
WHERE id = 1;

-- Recreate submit_withdraw with relaxed validation: only check > 0 and <= balance
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
  v_user_id BIGINT;
  v_user RECORD;
  v_cfg RECORD;
  v_order_id BIGINT;
  v_fee NUMERIC(18, 2);
  v_wtype withdraw_type;
BEGIN
  SELECT id, balance INTO v_user FROM users WHERE auth_user_id = auth.uid();
  IF v_user.id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  IF NOT verify_pay_password(p_pay_password) THEN RAISE EXCEPTION 'invalid pay password'; END IF;

  v_user_id := v_user.id;

  -- Relaxed validation: amount > 0 only (no min/max from settings)
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than 0';
  END IF;

  SELECT * INTO v_cfg FROM withdraw_settings WHERE id = 1;
  v_fee := COALESCE(v_cfg.withdraw_fee, 0);

  -- Check user has enough balance (including fee)
  IF v_user.balance < (p_amount + v_fee) THEN
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

COMMIT;
