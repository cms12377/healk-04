-- ผูกสมาชิกกับตัวแทน/ผู้ดูแล (invited_by) ตอนสมัคร + รหัสเชิญ staff
-- รันบน Supabase SQL Editor หลัง admin_setup.sql

BEGIN;

-- รหัสเชิญสำหรับ admin/agent (ใช้ username ถ้ายังไม่มี)
UPDATE users
SET invite_code = lower(username)
WHERE role IN ('admin', 'agent')
  AND (invite_code IS NULL OR invite_code = '');

CREATE OR REPLACE FUNCTION public.fn_resolve_inviter(p_invite_code TEXT)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM users
  WHERE role IN ('admin', 'agent')
    AND (
      invite_code = NULLIF(trim(p_invite_code), '')
      OR lower(username) = lower(NULLIF(trim(p_invite_code), ''))
    )
  ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, id
  LIMIT 1;
$$;

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
    v_invited_by := fn_resolve_inviter(v_invite_code);
  END IF;

  IF v_invited_by IS NULL
     AND COALESCE(NEW.raw_user_meta_data->>'invited_by', '') ~ '^\d+$' THEN
    v_invited_by := (NEW.raw_user_meta_data->>'invited_by')::BIGINT;
  END IF;

  INSERT INTO public.users (
    auth_user_id, username, password_hash, nickname, avatar, invited_by, createtime
  ) VALUES (
    NEW.id,
    v_username,
    '',
    COALESCE(NEW.raw_user_meta_data->>'nickname', v_username),
    '/assets/logo.jpg',
    v_invited_by,
    EXTRACT(EPOCH FROM NOW())::BIGINT
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- (ทางเลือก) ผูกสมาชิกเก่าที่ invited_by ว่าง ให้ staff คนแรก — ใช้เมื่อทดสอบคนเดียว
-- UPDATE users m
-- SET invited_by = s.id
-- FROM (SELECT id FROM users WHERE role IN ('admin', 'agent') ORDER BY id LIMIT 1) s
-- WHERE m.role = 'member' AND m.invited_by IS NULL;

COMMIT;
