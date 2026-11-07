-- Member: set pay password once only (no self-service change)
-- Admin/Agent: reset member pay password via admin_set_member_pay_password
-- Run after fix_pgcrypto_pay_password.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.set_pay_password(p_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id BIGINT;
  v_existing TEXT;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
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

CREATE OR REPLACE FUNCTION public.admin_set_member_pay_password(
  p_user_id BIGINT,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM fn_assert_member_manage(p_user_id);

  IF length(p_password) < 6 THEN RAISE EXCEPTION 'password too short'; END IF;
  IF p_password !~ '^\d{6}$' THEN RAISE EXCEPTION 'invalid pay password format'; END IF;

  UPDATE users
  SET pay_password_hash = crypt(p_password, gen_salt('bf')),
      updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = p_user_id;

  RETURN admin_get_member(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_member(p_user_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row users%ROWTYPE;
BEGIN
  v_row := fn_assert_member_manage(p_user_id);

  RETURN jsonb_build_object(
    'id', v_row.id,
    'username', v_row.username,
    'nickname', v_row.nickname,
    'phone', v_row.phone,
    'money', v_row.money,
    'real_name', v_row.real_name,
    'identity_status', v_row.identity_status,
    'is_paypwd', COALESCE(v_row.is_paypwd, FALSE),
    'status', v_row.status,
    'invited_by', v_row.invited_by,
    'createtime', v_row.createtime,
    'jointime_text', to_char(to_timestamp(v_row.createtime), 'YYYY-MM-DD HH24:MI')
  );
END;
$$;

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
    AND u.status <> -1
    AND (v_role = 'admin' OR u.invited_by = v_staff_id);

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) INTO v_rows
  FROM (
    SELECT
      u.id,
      u.username,
      u.nickname,
      u.phone,
      u.money,
      u.real_name,
      u.identity_status,
      u.is_paypwd,
      u.status,
      u.invited_by,
      u.createtime,
      to_char(to_timestamp(u.createtime), 'YYYY-MM-DD HH24:MI') AS jointime_text
    FROM users u
    WHERE u.role = 'member'
      AND u.status <> -1
      AND (v_role = 'admin' OR u.invited_by = v_staff_id)
    ORDER BY u.createtime DESC
    LIMIT p_limit OFFSET v_offset
  ) t;

  RETURN jsonb_build_object('data', v_rows, 'total', v_total, 'page', p_page, 'limit', p_limit);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_pay_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_member_pay_password(BIGINT, TEXT) TO authenticated;

COMMIT;
