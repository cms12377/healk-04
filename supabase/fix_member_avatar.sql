-- Member avatar upload + profile update (th6688 #/profit parity)
-- Run after fix_member_uploads_storage.sql

BEGIN;

-- Avatar URLs from Supabase Storage can exceed 512 chars on some projects
ALTER TABLE users ALTER COLUMN avatar TYPE TEXT;

-- Storage: member avatar folder
DROP POLICY IF EXISTS "site_assets_member_avatar_insert" ON storage.objects;
CREATE POLICY "site_assets_member_avatar_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'avatars'
  );

DROP POLICY IF EXISTS "site_assets_member_avatar_update" ON storage.objects;
CREATE POLICY "site_assets_member_avatar_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'avatars'
  )
  WITH CHECK (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'avatars'
  );

-- RLS: explicit WITH CHECK on self-update
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- RPC: nickname + avatar only (reliable member profile edit)
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
  v_user_id BIGINT;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

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

GRANT EXECUTE ON FUNCTION public.member_update_profile(TEXT, TEXT) TO authenticated;

COMMIT;
