-- ============================================================
-- Thiên Tuệ English Center - Supabase Schema
-- Chạy toàn bộ file này trong Supabase SQL Editor
-- ============================================================

-- 1. Users (tài khoản đăng nhập)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password text not null,
  role text not null check (role in ('admin','teacher','student')),
  name text not null,
  email text,
  phone text,
  avatar text,
  created_at timestamptz default now()
);

-- 2. Students
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  class_name text,
  progress integer default 0,
  join_date date default current_date,
  birthday date,
  address text,
  status text default 'active' check (status in ('active','inactive')),
  tuition_status text default 'unpaid' check (tuition_status in ('paid','unpaid')),
  created_at timestamptz default now()
);

-- 3. Teachers
create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  subject text,
  experience text,
  status text default 'active',
  join_date date default current_date,
  created_at timestamptz default now()
);

-- 4. Classes
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level text,
  teacher_id uuid references teachers(id) on delete set null,
  teacher_name text,
  max_students integer default 15,
  schedule text,
  room text,
  status text default 'active',
  created_at timestamptz default now()
);

-- 5. Lessons
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  topic text,
  level text,
  duration integer default 45,
  description text,
  video_url text,
  document text,
  teacher_id uuid references teachers(id) on delete set null,
  teacher_name text,
  lesson_date date default current_date,
  created_at timestamptz default now()
);

-- 6. Vocabulary
create table if not exists vocabulary (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  pronunciation text,
  meaning text,
  meaning_en text,
  example text,
  category text default 'noun',
  created_by uuid references teachers(id) on delete set null,
  created_at timestamptz default now()
);

-- 7. Schedule
create table if not exists schedule (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null check (day_of_week between 0 and 6),
  class_name text,
  teacher_name text,
  time_slot text,
  room text,
  type text default 'offline' check (type in ('offline','online')),
  topic text,
  created_at timestamptz default now()
);

-- 8. Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  from_name text,
  type text default 'admin' check (type in ('admin','teacher','event')),
  target_class text default 'all',
  is_read boolean default false,
  created_at timestamptz default now()
);

-- 9. Attendance
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  class_name text,
  attend_date date not null,
  status text not null check (status in ('present','absent','late')),
  note text,
  created_at timestamptz default now(),
  unique (student_id, attend_date)
);

-- 10. Tuitions
create table if not exists tuitions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  student_name text,
  class_name text,
  amount integer default 0,
  month text,
  due_date date,
  status text default 'unpaid' check (status in ('paid','unpaid')),
  paid_date date,
  created_at timestamptz default now()
);

-- 11. Upload materials (video & docs)
create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('video','doc')),
  title text not null,
  url text,
  file_type text,
  file_name text,
  target_classes text[] default array['all'],
  topic text,
  description text,
  teacher_id uuid references teachers(id) on delete set null,
  teacher_name text,
  created_at timestamptz default now()
);

-- 12. Quiz questions
create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null,
  correct_index integer not null,
  explanation text,
  lesson_id uuid references lessons(id) on delete cascade,
  created_at timestamptz default now()
);

-- 13. Vocab flashcard progress (lưu từ đã thuộc theo từng bộ từ)
create table if not exists vocab_progress (
  id uuid primary key default gen_random_uuid(),
  student_id bigint references students(id) on delete cascade not null,
  vocab_set_id text not null,  -- text để tương thích, ko cần FK
  known_word_ids text[] default array[]::text[],  -- mảng id từ đã đánh dấu "Biết rồi"
  unknown_word_ids text[] default array[]::text[], -- mảng id từ đã đánh dấu "Chưa biết"
  last_card_index integer default 0,              -- thẻ cuối cùng đang học
  completed_at timestamptz,
  updated_at timestamptz default now(),
  unique(student_id, vocab_set_id)
);

-- RLS policies cho vocab_progress (tạm disable — check student trong code JS)
alter table vocab_progress enable row level security;

-- Cho phép anon key đọc/ghi (student_id check trong JS code)
create policy "allow_all_progress" on vocab_progress for all using (true) with check (true);

-- ============================================================
-- Row Level Security (RLS) — cho phép anon key đọc/ghi
-- (Dùng cho prototype, production nên dùng Auth policies)
-- ============================================================
alter table users           enable row level security;
alter table students        enable row level security;
alter table teachers        enable row level security;
alter table classes         enable row level security;
alter table lessons         enable row level security;
alter table vocabulary      enable row level security;
alter table schedule        enable row level security;
alter table notifications   enable row level security;
alter table attendance      enable row level security;
alter table tuitions        enable row level security;
alter table materials       enable row level security;
alter table quiz_questions  enable row level security;

-- Policy: cho phép tất cả thao tác (anon) — prototype
create policy "allow_all_users"          on users           for all using (true) with check (true);
create policy "allow_all_students"       on students        for all using (true) with check (true);
create policy "allow_all_teachers"       on teachers        for all using (true) with check (true);
create policy "allow_all_classes"        on classes         for all using (true) with check (true);
create policy "allow_all_lessons"        on lessons         for all using (true) with check (true);
create policy "allow_all_vocabulary"     on vocabulary      for all using (true) with check (true);
create policy "allow_all_schedule"       on schedule        for all using (true) with check (true);
create policy "allow_all_notifications"  on notifications   for all using (true) with check (true);
create policy "allow_all_attendance"     on attendance      for all using (true) with check (true);
create policy "allow_all_tuitions"       on tuitions        for all using (true) with check (true);
create policy "allow_all_materials"      on materials       for all using (true) with check (true);
create policy "allow_all_quiz"           on quiz_questions  for all using (true) with check (true);

-- ============================================================
-- Tài khoản: tạo thủ công trong Supabase Dashboard hoặc
-- chạy INSERT bên dưới với thông tin thực của trung tâm
-- ============================================================
-- Ví dụ (đổi thông tin trước khi chạy):
-- insert into users (username, password, role, name, email) values
--   ('admin_tên', 'mật_khẩu_mạnh', 'admin', 'Họ tên admin', 'email@thientueenglish.vn');
