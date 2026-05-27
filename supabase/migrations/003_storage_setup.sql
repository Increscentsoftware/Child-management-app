-- ============================================================
-- SHISHU MANDIR - Storage Buckets Setup
-- Run this in Supabase SQL Editor
-- ============================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('child-documents', 'child-documents', true),
  ('child-photos',    'child-photos',    true),
  ('backups',         'backups',         false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "authenticated_upload_docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'child-documents');

-- Allow public read (needed for public URLs to work in browser)
CREATE POLICY "public_read_docs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'child-documents');

-- Allow authenticated users to overwrite (upsert for profile photos)
CREATE POLICY "authenticated_update_docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'child-documents');

-- Allow authenticated users to delete files
CREATE POLICY "authenticated_delete_docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'child-documents');

-- child-photos bucket policies
CREATE POLICY "authenticated_upload_photos"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'child-photos');
CREATE POLICY "public_read_photos"           ON storage.objects FOR SELECT TO public      USING (bucket_id = 'child-photos');
CREATE POLICY "authenticated_update_photos"  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'child-photos');
CREATE POLICY "authenticated_delete_photos"  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'child-photos');

-- backups bucket policies (admin only via authenticated)
CREATE POLICY "authenticated_upload_backups" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'backups');
CREATE POLICY "authenticated_read_backups"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'backups');
CREATE POLICY "authenticated_delete_backups" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'backups');
