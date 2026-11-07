-- Supabase Storage for admin-uploaded deposit QR codes
-- Run once in Supabase SQL Editor (after admin_setup.sql)

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

DROP POLICY IF EXISTS "site_assets_public_read" ON storage.objects;
CREATE POLICY "site_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "site_assets_admin_insert" ON storage.objects;
CREATE POLICY "site_assets_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'recharge-qrcodes'
    AND fn_current_user_role() = 'admin'::user_role
  );

DROP POLICY IF EXISTS "site_assets_admin_update" ON storage.objects;
CREATE POLICY "site_assets_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND fn_current_user_role() = 'admin'::user_role
  );

DROP POLICY IF EXISTS "site_assets_admin_delete" ON storage.objects;
CREATE POLICY "site_assets_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND fn_current_user_role() = 'admin'::user_role
  );

COMMIT;
