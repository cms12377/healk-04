-- Blocked member (status=0): login + read-only OK, no mutations (bet/deposit/withdraw/edit/bind)
-- Run after fix_admin_member_crud.sql

BEGIN;

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

GRANT EXECUTE ON FUNCTION public.fn_assert_user_active() TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_block_self_update_when_blocked()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 0
    AND OLD.auth_user_id IS NOT NULL
    AND OLD.auth_user_id = auth.uid() THEN
    RAISE EXCEPTION 'account blocked';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_self_update_when_blocked ON users;
CREATE TRIGGER trg_block_self_update_when_blocked
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION fn_block_self_update_when_blocked();

CREATE OR REPLACE FUNCTION public.fn_block_payment_instrument_mutations()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id AND status = 0) THEN
    RAISE EXCEPTION 'account blocked';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_bank_card_mutations ON user_bank_cards;
CREATE TRIGGER trg_block_bank_card_mutations
  BEFORE INSERT OR UPDATE ON user_bank_cards
  FOR EACH ROW
  EXECUTE FUNCTION fn_block_payment_instrument_mutations();

DROP TRIGGER IF EXISTS trg_block_crypto_wallet_mutations ON user_crypto_wallets;
CREATE TRIGGER trg_block_crypto_wallet_mutations
  BEFORE INSERT OR UPDATE ON user_crypto_wallets
  FOR EACH ROW
  EXECUTE FUNCTION fn_block_payment_instrument_mutations();

CREATE OR REPLACE FUNCTION public.member_add_bank_card(
  p_bank_name TEXT,
  p_bank_username TEXT,
  p_bank_card TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user users%ROWTYPE;
  v_user_id BIGINT;
  v_card TEXT;
  v_id BIGINT;
BEGIN
  v_user := fn_assert_user_active();
  v_user_id := v_user.id;

  IF length(trim(p_bank_name)) < 2 THEN RAISE EXCEPTION 'invalid bank name'; END IF;
  IF length(trim(p_bank_username)) < 2 THEN RAISE EXCEPTION 'invalid bank username'; END IF;
  v_card := regexp_replace(trim(COALESCE(p_bank_card, '')), '[^0-9]', '', 'g');
  IF length(v_card) < 8 THEN RAISE EXCEPTION 'invalid bank card'; END IF;

  INSERT INTO user_bank_cards (user_id, bank_name, bank_username, bank_card, createtime)
  VALUES (v_user_id, trim(p_bank_name), trim(p_bank_username), v_card, EXTRACT(EPOCH FROM NOW())::BIGINT)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.member_update_profile(
  p_nickname TEXT DEFAULT NULL,
  p_avatar TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user users%ROWTYPE;
  v_user_id BIGINT;
BEGIN
  v_user := fn_assert_user_active();
  v_user_id := v_user.id;

  IF p_nickname IS NOT NULL AND length(trim(p_nickname)) < 1 THEN
    RAISE EXCEPTION 'invalid nickname';
  END IF;
  IF p_avatar IS NOT NULL AND length(trim(p_avatar)) > 2048 THEN
    RAISE EXCEPTION 'invalid avatar url';
  END IF;

  UPDATE users
  SET
    nickname = CASE
      WHEN p_nickname IS NOT NULL THEN left(trim(p_nickname), 64)
      ELSE nickname
    END,
    avatar = CASE
      WHEN p_avatar IS NOT NULL THEN NULLIF(trim(p_avatar), '')
      ELSE avatar
    END,
    updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_pay_password(p_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user users%ROWTYPE;
  v_user_id BIGINT;
  v_existing TEXT;
BEGIN
  v_user := fn_assert_user_active();
  v_user_id := v_user.id;

  IF length(p_password) < 6 THEN RAISE EXCEPTION 'password too short'; END IF;
  IF p_password !~ '^\d{6}$' THEN RAISE EXCEPTION 'invalid pay password format'; END IF;

  SELECT pay_password_hash INTO v_existing FROM users WHERE id = v_user_id;
  IF v_existing IS NOT NULL AND v_existing <> '' THEN
    RAISE EXCEPTION 'pay password already set';
  END IF;

  UPDATE users
  SET pay_password_hash = crypt(p_password, gen_salt('bf')),
      updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_identity(
  p_real_name TEXT,
  p_id_number TEXT,
  p_front_url TEXT DEFAULT NULL,
  p_back_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user users%ROWTYPE;
  v_user_id BIGINT;
BEGIN
  v_user := fn_assert_user_active();
  v_user_id := v_user.id;

  IF length(trim(p_real_name)) < 2 THEN RAISE EXCEPTION 'invalid name'; END IF;
  IF length(trim(p_id_number)) < 6 THEN RAISE EXCEPTION 'invalid id number'; END IF;

  UPDATE users
  SET real_name = trim(p_real_name),
      id_number = trim(p_id_number),
      identity_front_url = NULLIF(trim(p_front_url), ''),
      identity_back_url = NULLIF(trim(p_back_url), ''),
      identity_status = 'pending',
      updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = v_user_id;
END;
$$;

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
  v_user users%ROWTYPE;
  v_user_id BIGINT;
  v_order_id BIGINT;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;

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

GRANT EXECUTE ON FUNCTION public.member_add_bank_card(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_update_profile(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_pay_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_identity(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_deposit(NUMERIC, TEXT, TEXT, TEXT, BIGINT) TO authenticated;

COMMIT;
