-- th6688 agent panel parity: identity review + member payment info + pending stats
-- Run after admin_setup.sql + fix_deposit_submit.sql

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS real_name VARCHAR(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_status VARCHAR(16) DEFAULT 'none';

CREATE OR REPLACE FUNCTION public.admin_pending_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_staff_id BIGINT;
  v_deposits BIGINT;
  v_withdraws BIGINT;
  v_identity BIGINT;
BEGIN
  PERFORM fn_assert_staff();
  v_role := fn_current_user_role();
  v_staff_id := fn_current_db_user_id();

  SELECT COUNT(*) INTO v_deposits
  FROM deposit_orders d
  JOIN users u ON u.id = d.user_id
  WHERE d.status = 'pending'
    AND (v_role = 'admin' OR u.invited_by = v_staff_id);

  SELECT COUNT(*) INTO v_withdraws
  FROM withdraw_orders w
  JOIN users u ON u.id = w.user_id
  WHERE w.status = 'pending'
    AND (v_role = 'admin' OR u.invited_by = v_staff_id);

  SELECT COUNT(*) INTO v_identity
  FROM users u
  WHERE u.identity_status = 'pending'
    AND u.role = 'member'
    AND (v_role = 'admin' OR u.invited_by = v_staff_id);

  RETURN jsonb_build_object(
    'pending_deposits', v_deposits,
    'pending_withdraws', v_withdraws,
    'pending_identity', v_identity
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_identity(
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_staff_id BIGINT;
  v_offset INT;
  v_rows JSONB;
  v_total BIGINT;
BEGIN
  PERFORM fn_assert_staff();
  v_role := fn_current_user_role();
  v_staff_id := fn_current_db_user_id();
  v_offset := GREATEST(p_page - 1, 0) * p_limit;

  SELECT COUNT(*) INTO v_total
  FROM users u
  WHERE u.identity_status = 'pending'
    AND u.role = 'member'
    AND (v_role = 'admin' OR u.invited_by = v_staff_id);

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) INTO v_rows
  FROM (
    SELECT
      u.id AS user_id,
      u.username,
      u.nickname,
      u.real_name,
      u.id_number,
      u.identity_status,
      u.createtime,
      to_char(to_timestamp(u.createtime), 'YYYY-MM-DD HH24:MI') AS jointime_text
    FROM users u
    WHERE u.identity_status = 'pending'
      AND u.role = 'member'
      AND (v_role = 'admin' OR u.invited_by = v_staff_id)
    ORDER BY u.updatetime DESC NULLS LAST, u.createtime DESC
    LIMIT p_limit OFFSET v_offset
  ) t;

  RETURN jsonb_build_object('data', v_rows, 'total', v_total, 'page', p_page, 'limit', p_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_identity(
  p_user_id BIGINT,
  p_action TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_staff_id BIGINT;
BEGIN
  PERFORM fn_assert_staff();
  v_role := fn_current_user_role();
  v_staff_id := fn_current_db_user_id();

  IF NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = p_user_id
      AND u.identity_status = 'pending'
      AND u.role = 'member'
      AND (v_role = 'admin' OR u.invited_by = v_staff_id)
  ) THEN
    RAISE EXCEPTION 'identity request not found';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE users
    SET identity_status = 'approved',
        updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
    WHERE id = p_user_id;
  ELSIF p_action = 'reject' THEN
    UPDATE users
    SET identity_status = 'rejected',
        updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
    WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'invalid action';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_member_payment(p_user_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_staff_id BIGINT;
  v_user JSONB;
  v_banks JSONB;
  v_wallets JSONB;
BEGIN
  PERFORM fn_assert_staff();
  v_role := fn_current_user_role();
  v_staff_id := fn_current_db_user_id();

  SELECT jsonb_build_object(
    'id', u.id,
    'username', u.username,
    'nickname', u.nickname,
    'real_name', u.real_name,
    'id_number', u.id_number,
    'identity_status', COALESCE(u.identity_status, 'none'),
    'money', u.money
  ) INTO v_user
  FROM users u
  WHERE u.id = p_user_id
    AND u.role = 'member'
    AND (v_role = 'admin' OR u.invited_by = v_staff_id);

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(b) ORDER BY b.is_default DESC, b.id), '[]'::JSONB)
  INTO v_banks
  FROM (
    SELECT id, bank_name, bank_username, bank_card, is_default, createtime
    FROM user_bank_cards
    WHERE user_id = p_user_id
    ORDER BY is_default DESC, id
  ) b;

  SELECT COALESCE(jsonb_agg(row_to_json(w) ORDER BY w.is_default DESC, w.id), '[]'::JSONB)
  INTO v_wallets
  FROM (
    SELECT id, address, remark, is_default, createtime
    FROM user_crypto_wallets
    WHERE user_id = p_user_id
    ORDER BY is_default DESC, id
  ) w;

  RETURN jsonb_build_object(
    'user', v_user,
    'bank_cards', v_banks,
    'crypto_wallets', v_wallets
  );
END;
$$;

-- Extend member list with identity_status (th6688 huiYuan)
CREATE OR REPLACE FUNCTION public.admin_list_members(
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_staff_id BIGINT;
  v_offset INT;
  v_rows JSONB;
  v_total BIGINT;
BEGIN
  PERFORM fn_assert_staff();
  v_role := fn_current_user_role();
  v_staff_id := fn_current_db_user_id();
  v_offset := GREATEST(p_page - 1, 0) * p_limit;

  SELECT COUNT(*) INTO v_total
  FROM users u
  WHERE u.role = 'member'
    AND (v_role = 'admin' OR u.invited_by = v_staff_id);

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) INTO v_rows
  FROM (
    SELECT
      u.id,
      u.username,
      u.nickname,
      u.money,
      u.real_name,
      u.identity_status,
      u.createtime,
      to_char(to_timestamp(u.createtime), 'YYYY-MM-DD HH24:MI') AS jointime_text
    FROM users u
    WHERE u.role = 'member'
      AND (v_role = 'admin' OR u.invited_by = v_staff_id)
    ORDER BY u.createtime DESC
    LIMIT p_limit OFFSET v_offset
  ) t;

  RETURN jsonb_build_object('data', v_rows, 'total', v_total, 'page', p_page, 'limit', p_limit);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_pending_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_identity(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_identity(BIGINT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_member_payment(BIGINT) TO authenticated;

COMMIT;
