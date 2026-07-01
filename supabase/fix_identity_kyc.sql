-- KYC with ID photos for agent review (th6688 identityCard parity)
-- Run after fix_deposit_submit.sql + fix_member_uploads_storage.sql

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_front_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_back_url TEXT;

DROP FUNCTION IF EXISTS public.submit_identity(TEXT, TEXT);

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
DECLARE v_user_id BIGINT;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
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
      u.identity_front_url,
      u.identity_back_url,
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

GRANT EXECUTE ON FUNCTION public.submit_identity(TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMIT;
