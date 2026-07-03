-- Helper for admin/agent member CRUD — required by admin_get_member, admin_set_member_pay_password, etc.
-- Run if verify:prod fails: "function fn_assert_member_manage(bigint) does not exist"
-- Safe to re-run. Does not overwrite admin_get_member (keeps is_paypwd from fix_pay_password_member_lock).
--
-- ⚠️ บล็อก/ลบสมาชิก ต้องรัน fix_admin_member_crud.sql เพิ่ม (admin_set_member_status, admin_delete_member)

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

GRANT EXECUTE ON FUNCTION public.fn_assert_member_manage(BIGINT) TO authenticated;

COMMIT;
