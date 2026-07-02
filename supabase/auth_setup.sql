-- =============================================================================
-- สำหรับผู้ที่รัน database.sql เวอร์ชันเก่า (ก่อนรวม auth) — รันไฟล์นี้เพิ่ม
-- ผู้รัน database.sql ล่าสุด: ไม่ต้องรันไฟล์นี้ (รวมอยู่ใน database.sql แล้ว)
-- =============================================================================

BEGIN;

ALTER TABLE users ALTER COLUMN password_hash SET DEFAULT '';

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_invite_code TEXT;
  v_invited_by BIGINT;
BEGIN
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );

  v_invite_code := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'invite_code', '')), '');

  IF v_invite_code IS NOT NULL THEN
    SELECT id INTO v_invited_by
    FROM users
    WHERE role IN ('admin', 'agent')
      AND (
        invite_code = v_invite_code
        OR lower(username) = lower(v_invite_code)
      )
    ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, id
    LIMIT 1;
  END IF;

  IF v_invited_by IS NULL
     AND COALESCE(NEW.raw_user_meta_data->>'invited_by', '') ~ '^\d+$' THEN
    v_invited_by := (NEW.raw_user_meta_data->>'invited_by')::BIGINT;
  END IF;

  INSERT INTO public.users (
    auth_user_id, username, password_hash, nickname, avatar, invited_by, createtime
  ) VALUES (
    NEW.id, v_username, '',
    COALESCE(NEW.raw_user_meta_data->>'nickname', v_username),
    '/assets/logo.jpg',
    v_invited_by,
    EXTRACT(EPOCH FROM NOW())::BIGINT
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.set_pay_password(p_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id BIGINT;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  IF length(p_password) < 6 THEN RAISE EXCEPTION 'password too short'; END IF;
  UPDATE users
  SET pay_password_hash = crypt(p_password, gen_salt('bf')),
      updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_pay_password(p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT pay_password_hash INTO v_hash FROM users WHERE auth_user_id = auth.uid();
  IF v_hash IS NULL OR v_hash = '' THEN RETURN FALSE; END IF;
  RETURN v_hash = crypt(p_password, v_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_deposit(
  p_amount NUMERIC,
  p_channel_type TEXT DEFAULT 'bank'
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id BIGINT;
  v_order_id BIGINT;
  v_label TEXT;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  v_label := CASE WHEN p_channel_type = 'crypto' THEN 'ฝากคริปโต' ELSE 'ฝากเงิน' END;
  INSERT INTO deposit_orders (user_id, channel_type, amount, status, createtime, audittime)
  VALUES (
    v_user_id, p_channel_type::recharge_channel_type, p_amount, 'approved',
    EXTRACT(EPOCH FROM NOW())::BIGINT, EXTRACT(EPOCH FROM NOW())::BIGINT
  )
  RETURNING id INTO v_order_id;
  INSERT INTO user_money_logs (user_id, category_id, money, type, ref_type, ref_id, createtime)
  VALUES (v_user_id, 14, p_amount, v_label, 'deposit', v_order_id, EXTRACT(EPOCH FROM NOW())::BIGINT);
  RETURN v_order_id;
END;
$$;

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
  v_cfg RECORD;
  v_order_id BIGINT;
  v_fee NUMERIC(18, 2);
  v_wtype withdraw_type;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  IF NOT verify_pay_password(p_pay_password) THEN RAISE EXCEPTION 'invalid pay password'; END IF;
  SELECT * INTO v_cfg FROM withdraw_settings WHERE id = 1;
  IF p_amount < v_cfg.withdraw_min OR p_amount > v_cfg.withdraw_max THEN
    RAISE EXCEPTION 'amount out of range';
  END IF;
  v_fee := v_cfg.withdraw_fee;
  v_wtype := CASE WHEN p_type = 'crypto' THEN 'crypto'::withdraw_type ELSE 'bank'::withdraw_type END;
  INSERT INTO withdraw_orders (
    user_id, type, bank_name, bank_card, bank_username,
    amount, fee, status, createtime, audittime
  ) VALUES (
    v_user_id, v_wtype, p_bank_name, p_bank_card, p_bank_username,
    p_amount, v_fee, 'approved',
    EXTRACT(EPOCH FROM NOW())::BIGINT, EXTRACT(EPOCH FROM NOW())::BIGINT
  )
  RETURNING id INTO v_order_id;
  INSERT INTO user_money_logs (user_id, category_id, money, type, ref_type, ref_id, createtime)
  VALUES (
    v_user_id, 15, -(p_amount + v_fee), 'ถอนเงิน', 'withdraw', v_order_id,
    EXTRACT(EPOCH FROM NOW())::BIGINT
  );
  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notice_read(p_notice_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id BIGINT;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;
  INSERT INTO user_notice_reads (user_id, notice_id)
  VALUES (v_user_id, p_notice_id)
  ON CONFLICT (user_id, notice_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_pay_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pay_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_deposit(NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_withdraw(NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notice_read(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_user_profits(BIGINT, BIGINT, BIGINT) TO authenticated;

COMMIT;
