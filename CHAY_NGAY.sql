-- ================================================================
-- CHẠY FILE NÀY TRƯỚC — Sửa bảng exam_progress (Live Monitor)
-- Supabase → SQL Editor → dán → Run
-- ================================================================

-- 1) Xóa FK sai (trỏ bảng homeworks cũ)
ALTER TABLE exam_progress DROP CONSTRAINT IF EXISTS exam_progress_homework_id_fkey;

-- 2) Tạo bảng nếu chưa có
CREATE TABLE IF NOT EXISTS exam_progress (
  id            bigserial PRIMARY KEY,
  homework_id   bigint NOT NULL,
  username      text NOT NULL,
  student_name  text,
  class_name    text,
  current_question int DEFAULT 0,
  answered_count   int DEFAULT 0,
  total_questions  int DEFAULT 0,
  elapsed_secs     int DEFAULT 0,
  status        text DEFAULT 'active',
  tab_violations int DEFAULT 0,
  flagged_questions text,
  force_submit  boolean DEFAULT false,
  force_stopped boolean DEFAULT false,
  screenshot_violations int DEFAULT 0,
  answers       jsonb DEFAULT '{}',
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (homework_id, username)
);

-- 3) Bổ sung cột thiếu (schema cũ)
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS student_name text;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS class_name text;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS current_question int DEFAULT 0;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS answered_count int DEFAULT 0;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS total_questions int DEFAULT 0;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS elapsed_secs int DEFAULT 0;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS tab_violations int DEFAULT 0;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS flagged_questions text;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS force_submit boolean DEFAULT false;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS force_stopped boolean DEFAULT false;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS screenshot_violations int DEFAULT 0;
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS answers jsonb DEFAULT '{}';
ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4) Quyền đọc/ghi cho web app (anon key) — TẮT RLS để chắc chắn web thấy được
ALTER TABLE exam_progress DISABLE ROW LEVEL SECURITY;

-- Xóa policy cũ nếu có (tránh xung đột)
DROP POLICY IF EXISTS "allow_all_exam_progress" ON exam_progress;

GRANT ALL ON exam_progress TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE exam_progress_id_seq TO anon, authenticated, service_role;

-- 5) Bật Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE exam_progress;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6) TEST — chèn 1 dòng thử (xóa ngay sau)
INSERT INTO exam_progress (homework_id, username, student_name, status, updated_at, answers)
VALUES (1, '__test__', 'Test kết nối', 'active', now(), '{}')
ON CONFLICT (homework_id, username) DO UPDATE
  SET updated_at = now(), status = 'active';

-- 7) Kiểm tra — phải thấy ít nhất 1 dòng
SELECT id, homework_id, username, student_name, status, updated_at
FROM exam_progress
ORDER BY updated_at DESC
LIMIT 5;

-- 8) KHÔNG xóa dòng test — để admin kiểm tra tab "Đang làm bài" thấy "Test kết nối"
-- Sau khi thấy trên web OK, chạy: DELETE FROM exam_progress WHERE username = '__test__';

-- ================================================================
-- XONG! Ctrl+F5 reload homework.html
-- Học sinh vào làm bài → bấm "Tôi hiểu — Bắt đầu làm bài"
-- Admin tab "Đang làm bài" sẽ thấy học sinh sau 2-4 giây
-- ================================================================

-- ================================================================
-- NGỮ PHÁP + TỪ VỰNG — quyền đọc/ghi cho học sinh (anon key)
-- Chạy thêm nếu HS không thấy câu hỏi quiz / bộ từ
-- ================================================================

CREATE TABLE IF NOT EXISTS grammar_lessons (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  class_name text,
  allowed_usernames text,
  created_by text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grammar_questions (
  id bigserial PRIMARY KEY,
  lesson_id bigint REFERENCES grammar_lessons(id) ON DELETE CASCADE,
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  answer text NOT NULL,
  explanation text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE grammar_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_grammar_lessons" ON grammar_lessons;
CREATE POLICY "allow_all_grammar_lessons" ON grammar_lessons FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_grammar_questions" ON grammar_questions;
CREATE POLICY "allow_all_grammar_questions" ON grammar_questions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT ALL ON grammar_lessons TO anon, authenticated, service_role;
GRANT ALL ON grammar_questions TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
