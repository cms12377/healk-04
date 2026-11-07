-- จัดการสมาชิก: แก้ไข · บล็อก/ปลดบล็อก · ลบ (soft)
-- status: 1=ปกติ, 0=บล็อก, -1=ลบแล้ว (ซ่อนจากรายการ)

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_assert_member_manage(p_user_id BIGINT)
RETURNS users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_staff_id BIGINT;
  v_row users%ROWTYPE;
BEGIN
  PERFORM fn_assert_staff();
  v_role := fn_current_user_role();
  v_staff_id := fn_current_db_user_id();

  SELECT * INTO v_row FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'member not found';
  END IF;
  IF v_row.role <> 'member'::user_role THEN
    RAISE EXCEPTION 'not a member account';
  END IF;
  IF v_row.status = -1 THEN
    RAISE EXCEPTION 'member already deleted';
  END IF;
  IF v_role = 'agent'::user_role AND v_row.invited_by IS DISTINCT FROM v_staff_id THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  RETURN v_row;
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

CREATE OR REPLACE FUNCTION public.admin_update_member(
  p_user_id BIGINT,
  p_nickname TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_real_name TEXT DEFAULT NULL,
  p_money NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row users%ROWTYPE;
  v_role user_role;
  v_old_money NUMERIC(18, 2);
  v_delta NUMERIC(18, 2);
BEGIN
  v_row := fn_assert_member_manage(p_user_id);
  v_role := fn_current_user_role();

  IF p_nickname IS NOT NULL AND trim(p_nickname) <> '' THEN
    UPDATE users SET nickname = trim(p_nickname), updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
    WHERE id = p_user_id;
  END IF;

  IF p_phone IS NOT NULL THEN
    UPDATE users SET phone = NULLIF(trim(p_phone), ''), updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
    WHERE id = p_user_id;
  END IF;

  IF p_real_name IS NOT NULL THEN
    UPDATE users SET real_name = NULLIF(trim(p_real_name), ''), updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
    WHERE id = p_user_id;
  END IF;

  IF p_money IS NOT NULL THEN
    IF v_role <> 'admin'::user_role THEN
      RAISE EXCEPTION 'only admin can adjust balance';
    END IF;
    IF p_money < 0 THEN
      RAISE EXCEPTION 'invalid balance';
    END IF;
    SELECT money INTO v_old_money FROM users WHERE id = p_user_id;
    v_delta := p_money - v_old_money;
    UPDATE users SET money = p_money, updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
    WHERE id = p_user_id;
    IF v_delta <> 0 THEN
      INSERT INTO user_money_logs (user_id, category_id, money, type, ref_type, ref_id, createtime)
      VALUES (
        p_user_id,
        14,
        v_delta,
        'ปรับยอดโดยผู้ดูแล',
        'admin_adjust',
        p_user_id,
        EXTRACT(EPOCH FROM NOW())::BIGINT
      );
    END IF;
  END IF;

  RETURN admin_get_member(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_member_status(
  p_user_id BIGINT,
  p_status SMALLINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_assert_member_manage(p_user_id);

  IF p_status NOT IN (0, 1) THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  UPDATE users
  SET status = p_status, updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = p_user_id;

  RETURN admin_get_member(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_member(p_user_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row users%ROWTYPE;
BEGIN
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'only admin can delete members';
  END IF;

  v_row := fn_assert_member_manage(p_user_id);

  IF v_row.id = fn_current_db_user_id() THEN
    RAISE EXCEPTION 'cannot delete yourself';
  END IF;

  UPDATE users
  SET
    status = -1,
    username = v_row.username || '_removed_' || v_row.id,
    updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_assert_member_manage(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_member(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_member(BIGINT, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_member_status(BIGINT, SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_member(BIGINT) TO authenticated;

COMMIT;
