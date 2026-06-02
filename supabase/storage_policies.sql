-- Step 2 (optional) — use when uploading KYC files to Supabase Storage
-- without Supabase Auth sessions.
-- Allows anonymous upload into a controlled path prefix:
--   uploads/<local-user-id>/<timestamp>_<file>

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users upload own KYC" ON storage.objects;
DROP POLICY IF EXISTS "Users read own KYC" ON storage.objects;
DROP POLICY IF EXISTS "Users update own KYC" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous upload KYC documents" ON storage.objects;

CREATE POLICY "Anonymous upload KYC documents"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = 'uploads'
    AND (storage.foldername(name))[2] IS NOT NULL
  );
