-- Member uploads: deposit slip + KYC photos (th6688 agent review parity)
-- Run after fix_recharge_qrcode_storage.sql + fix_deposit_submit.sql

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-assets',
  'site-assets',
  true,
  524288,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']::TEXT[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "site_assets_member_deposit_insert" ON storage.objects;
CREATE POLICY "site_assets_member_deposit_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'deposit-proofs'
  );

DROP POLICY IF EXISTS "site_assets_member_identity_insert" ON storage.objects;
CREATE POLICY "site_assets_member_identity_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'identity-docs'
  );

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

COMMIT;
