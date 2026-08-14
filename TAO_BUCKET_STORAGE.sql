-- ============================================================
-- TẠO BUCKET STORAGE — sửa lỗi "Bucket not found"
-- Chạy trong Supabase → SQL Editor → Run
-- An toàn chạy nhiều lần
-- ============================================================

-- 1) Bucket lessons (video + tài liệu bài học)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lessons',
  'lessons',
  true,
  524288000, -- 500MB
  NULL
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2) Bucket files (Lưu trữ tài liệu)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'files',
  'files',
  true,
  524288000,
  NULL
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3) Bucket homework-images (ảnh câu hỏi bài tập)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'homework-images',
  'homework-images',
  true,
  10485760, -- 10MB
  NULL
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ── Policy: cho phép đọc/ghi công khai (anon) — khớp app hiện tại ──
-- lessons
DROP POLICY IF EXISTS "lessons_public_read" ON storage.objects;
DROP POLICY IF EXISTS "lessons_public_write" ON storage.objects;
DROP POLICY IF EXISTS "lessons_public_update" ON storage.objects;
DROP POLICY IF EXISTS "lessons_public_delete" ON storage.objects;

CREATE POLICY "lessons_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'lessons');
CREATE POLICY "lessons_public_write" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'lessons');
CREATE POLICY "lessons_public_update" ON storage.objects
  FOR UPDATE TO public USING (bucket_id = 'lessons');
CREATE POLICY "lessons_public_delete" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'lessons');

-- files
DROP POLICY IF EXISTS "files_public_read" ON storage.objects;
DROP POLICY IF EXISTS "files_public_write" ON storage.objects;
DROP POLICY IF EXISTS "files_public_update" ON storage.objects;
DROP POLICY IF EXISTS "files_public_delete" ON storage.objects;

CREATE POLICY "files_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'files');
CREATE POLICY "files_public_write" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'files');
CREATE POLICY "files_public_update" ON storage.objects
  FOR UPDATE TO public USING (bucket_id = 'files');
CREATE POLICY "files_public_delete" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'files');

-- homework-images
DROP POLICY IF EXISTS "hwimg_public_read" ON storage.objects;
DROP POLICY IF EXISTS "hwimg_public_write" ON storage.objects;
DROP POLICY IF EXISTS "hwimg_public_update" ON storage.objects;
DROP POLICY IF EXISTS "hwimg_public_delete" ON storage.objects;

CREATE POLICY "hwimg_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'homework-images');
CREATE POLICY "hwimg_public_write" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'homework-images');
CREATE POLICY "hwimg_public_update" ON storage.objects
  FOR UPDATE TO public USING (bucket_id = 'homework-images');
CREATE POLICY "hwimg_public_delete" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'homework-images');
