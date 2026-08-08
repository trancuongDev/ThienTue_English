-- ================================================================
-- FIX EXAM_PROGRESS — Giám sát học sinh đang làm bài (Live Monitor)
-- Chạy TOÀN BỘ file này trong Supabase → SQL Editor → Run
-- An toàn chạy nhiều lần (IF NOT EXISTS / DO blocks)
-- ================================================================

-- ── 0. Sửa FK sai (bảng cũ trỏ homeworks thay vì homework) ─────
--    Đây là nguyên nhân chính khiến học sinh làm bài nhưng admin không thấy!
ALTER TABLE exam_progress DROP CONSTRAINT IF EXISTS exam_progress_homework_id_fkey;

-- ── 1. Tạo bảng nếu chưa có (schema đầy đủ, KHÔNG FK cứng) ───
CREATE TABLE IF NOT EXISTS exam_progress (
  id                bigserial PRIMARY KEY,
  homework_id       bigint NOT NULL,
  username          text NOT NULL,
  student_name      text,
  class_name        text,
  current_question  int DEFAULT 0,
  answered_count    int DEFAULT 0,
  total_questions   int DEFAULT 0,
  elapsed_secs      int DEFAULT 0,
  status            text DEFAULT 'active',
  tab_violations    int DEFAULT 0,
  flagged_questions text,
  force_submit      boolean DEFAULT false,
  force_stopped     boolean DEFAULT false,
  screenshot_violations int DEFAULT 0,
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(homework_id, username)
);
-- ── 2. Bổ sung cột nếu bảng cũ thiếu (schema cũ chỉ có vài cột) ─
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS student_name          text;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS class_name            text;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS current_question      int DEFAULT 0;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS answered_count        int DEFAULT 0;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS total_questions       int DEFAULT 0;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS elapsed_secs          int DEFAULT 0;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS tab_violations        int DEFAULT 0;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS flagged_questions     text;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS force_submit          boolean DEFAULT false;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS force_stopped         boolean DEFAULT false;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS screenshot_violations int DEFAULT 0;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS updated_at            timestamptz DEFAULT now();

-- Chuẩn hóa status cũ → active (để admin thấy trên tab Live)
UPDATE exam_progress SET status = 'active' WHERE status = 'in_progress';

-- ── 3. Cột screenshot trên bảng bài nộp ─────────────────────────
ALTER TABLE homework_submissions
  ADD COLUMN IF NOT EXISTS screenshot_violations int DEFAULT 0;

-- ── 4. Index tăng tốc ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_exam_progress_hw_user ON exam_progress(homework_id, username);
CREATE INDEX IF NOT EXISTS idx_exam_progress_status  ON exam_progress(status, updated_at DESC);

-- ── 5. Row Level Security ───────────────────────────────────────
ALTER TABLE exam_progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'exam_progress' AND policyname = 'allow_all_exam_progress'
  ) THEN
    CREATE POLICY "allow_all_exam_progress"
      ON exam_progress FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 6. Bật Realtime (bỏ qua nếu đã bật) ─────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE exam_progress;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN
    RAISE NOTICE 'Realtime exam_progress: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE homework_submissions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN
    RAISE NOTICE 'Realtime homework_submissions: %', SQLERRM;
END $$;

-- ── 8. Bảng ALERTS (nếu chưa có) + RLS ─────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id           bigserial PRIMARY KEY,
  username     text,
  student_name text,
  class_name   text,
  reason       text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'alerts' AND policyname = 'allow_all_alerts'
  ) THEN
    CREATE POLICY "allow_all_alerts"
      ON alerts FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN
    RAISE NOTICE 'Realtime alerts: %', SQLERRM;
END $$;

SELECT
  column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'exam_progress'
ORDER BY ordinal_position;

-- ================================================================
-- XONG! Reload homework.html (Ctrl+F5) rồi thử:
--   1. Học sinh vào làm bài → bấm "Tôi hiểu — Bắt đầu làm bài"
--   2. Admin → tab "Đang làm bài" → thấy học sinh sau vài giây
-- ================================================================
