// supabase.js - Thiên Tuệ English Center
// Kết nối Supabase và các hàm CRUD

const SUPABASE_URL  = 'https://uhnwlccpzierninyhsvr.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobndsY2Nwemllcm5pbnloc3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2ODU0MTQsImV4cCI6MjEwMTI2MTQxNH0.ChVrXsJkp5wbRPlo9A5caD30yK7u5MWnGNQwNWkJmbw';

// ── Supabase REST helper ─────────────────────────────────────────────────────
const sb = {
  async query(table, options = {}) {
    const { select = '*', filters = [], order, limit, single } = options;
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    filters.forEach(f => { url += `&${f}`; });
    if (order)  url += `&order=${order}`;
    if (limit)  url += `&limit=${limit}`;
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    };
    if (single) headers['Accept'] = 'application/vnd.pgrst.object+json';
    const res = await fetch(url, { headers });
    if (!res.ok) { const e = await res.text(); throw new Error(e); }
    return res.json();
  },

  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.text(); throw new Error(e); }
    return res.json();
  },

  async update(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.text(); throw new Error(e); }
    return res.json();
  },

  async delete(table, id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) { const e = await res.text(); throw new Error(e); }
    return true;
  },

  async upsert(table, data, onConflict = 'id') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation,resolution=merge-duplicates',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.text(); throw new Error(e); }
    return res.json();
  },
};

// ── Auth ─────────────────────────────────────────────────────────────────────
async function sbLogin(username, password, role) {
  try {
    const rows = await sb.query('users', {
      filters: [
        `username=eq.${encodeURIComponent(username)}`,
        `password=eq.${encodeURIComponent(password)}`,
        `role=eq.${role}`,
      ],
      limit: 1,
    });
    if (!rows || rows.length === 0) return false;
    const user = { ...rows[0] };
    delete user.password;
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    return true;
  } catch (e) {
    console.error('Login error:', e);
    return false;
  }
}

// ── Students ─────────────────────────────────────────────────────────────────
const Students = {
  async getAll() {
    return sb.query('students', { order: 'created_at.asc' });
  },
  async getById(id) {
    const rows = await sb.query('students', { filters: [`id=eq.${id}`], limit: 1 });
    return rows[0] || null;
  },
  async create(data) {
    const row = await sb.insert('students', {
      name: data.name, email: data.email, phone: data.phone,
      class_name: data.class, progress: data.progress || 0,
      join_date: data.joinDate || new Date().toISOString().split('T')[0],
      birthday: data.birthday || null, address: data.address,
      status: data.status || 'active', tuition_status: data.tuition || 'unpaid',
    });
    return Array.isArray(row) ? row[0] : row;
  },
  async update(id, data) {
    return sb.update('students', id, {
      name: data.name, email: data.email, phone: data.phone,
      class_name: data.class, progress: data.progress,
      birthday: data.birthday || null, address: data.address,
      status: data.status, tuition_status: data.tuition,
    });
  },
  async delete(id) { return sb.delete('students', id); },
};

// ── Teachers ─────────────────────────────────────────────────────────────────
const Teachers = {
  async getAll() {
    return sb.query('teachers', { order: 'created_at.asc' });
  },
  async create(data) {
    const row = await sb.insert('teachers', {
      name: data.name, email: data.email, phone: data.phone,
      subject: data.subject, experience: data.experience,
      status: 'active',
      join_date: new Date().toISOString().split('T')[0],
    });
    return Array.isArray(row) ? row[0] : row;
  },
  async update(id, data) {
    return sb.update('teachers', id, {
      name: data.name, email: data.email, phone: data.phone,
      subject: data.subject, experience: data.experience,
    });
  },
  async delete(id) { return sb.delete('teachers', id); },
};

// ── Classes ───────────────────────────────────────────────────────────────────
const Classes = {
  async getAll() {
    return sb.query('classes', { order: 'created_at.asc' });
  },
  async create(data) {
    const row = await sb.insert('classes', {
      name: data.name, level: data.level,
      teacher_id: data.teacherId || null,
      teacher_name: data.teacher || '',
      max_students: data.maxStudents || 15,
      schedule: data.schedule, room: data.room,
      status: 'active',
    });
    return Array.isArray(row) ? row[0] : row;
  },
  async update(id, data) {
    return sb.update('classes', id, {
      name: data.name, level: data.level,
      teacher_id: data.teacherId || null,
      teacher_name: data.teacher || '',
      max_students: data.maxStudents,
      schedule: data.schedule, room: data.room,
    });
  },
  async delete(id) { return sb.delete('classes', id); },
};

// ── Lessons ───────────────────────────────────────────────────────────────────
const Lessons = {
  async getAll() {
    return sb.query('lessons', { order: 'created_at.desc' });
  },
  async create(data) {
    const row = await sb.insert('lessons', {
      title: data.title, topic: data.topic, level: data.level,
      duration: data.duration || 45, description: data.description,
      video_url: data.videoUrl || '', document: data.document || '',
      teacher_name: data.teacher || '',
      lesson_date: data.date || new Date().toISOString().split('T')[0],
    });
    return Array.isArray(row) ? row[0] : row;
  },
  async update(id, data) {
    return sb.update('lessons', id, {
      title: data.title, topic: data.topic, level: data.level,
      duration: data.duration, description: data.description,
      video_url: data.videoUrl, document: data.document,
    });
  },
  async delete(id) { return sb.delete('lessons', id); },
};

// ── Vocabulary ────────────────────────────────────────────────────────────────
const Vocabulary = {
  async getAll() {
    return sb.query('vocabulary', { order: 'created_at.asc' });
  },
  async create(data) {
    const row = await sb.insert('vocabulary', {
      word: data.word, pronunciation: data.pronunciation,
      meaning: data.meaning, meaning_en: data.meaning_en,
      example: data.example, category: data.category || 'noun',
    });
    return Array.isArray(row) ? row[0] : row;
  },
  async update(id, data) {
    return sb.update('vocabulary', id, {
      word: data.word, pronunciation: data.pronunciation,
      meaning: data.meaning, meaning_en: data.meaning_en,
      example: data.example, category: data.category,
    });
  },
  async delete(id) { return sb.delete('vocabulary', id); },
};

// ── Schedule ──────────────────────────────────────────────────────────────────
const Schedule = {
  async getAll() {
    return sb.query('schedule', { order: 'day_of_week.asc' });
  },
  async getByClass(className) {
    return sb.query('schedule', {
      filters: [`class_name=eq.${encodeURIComponent(className)}`],
      order: 'day_of_week.asc',
    });
  },
  async getToday(className) {
    const today = new Date().getDay();
    return sb.query('schedule', {
      filters: [
        `day_of_week=eq.${today}`,
        `class_name=eq.${encodeURIComponent(className)}`,
      ],
    });
  },
  async create(data) {
    const row = await sb.insert('schedule', {
      day_of_week: data.day, class_name: data.class,
      teacher_name: data.teacher || '',
      time_slot: data.time, room: data.room,
      type: data.type || 'offline', topic: data.topic,
    });
    return Array.isArray(row) ? row[0] : row;
  },
  async delete(id) { return sb.delete('schedule', id); },
};

// ── Notifications ─────────────────────────────────────────────────────────────
const Notifications = {
  async getAll() {
    return sb.query('notifications', { order: 'created_at.desc' });
  },
  async getForClass(className) {
    return sb.query('notifications', {
      filters: [`or=(target_class.eq.all,target_class.eq.${encodeURIComponent(className)})`],
      order: 'created_at.desc',
    });
  },
  async create(data) {
    const row = await sb.insert('notifications', {
      title: data.title, content: data.content,
      from_name: data.from, type: data.type || 'admin',
      target_class: data.targetClass || 'all',
      is_read: false,
    });
    return Array.isArray(row) ? row[0] : row;
  },
  async markRead(id) {
    return sb.update('notifications', id, { is_read: true });
  },
  async markAllRead() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/notifications?is_read=eq.false`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_read: true }),
    });
    return res.ok;
  },
};

// ── Attendance ────────────────────────────────────────────────────────────────
const Attendance = {
  async getByStudent(studentId) {
    return sb.query('attendance', {
      filters: [`student_id=eq.${studentId}`],
      order: 'attend_date.asc',
    });
  },
  async getByClass(className, month, year) {
    const from = `${year}-${String(month).padStart(2,'0')}-01`;
    const to   = `${year}-${String(month).padStart(2,'0')}-31`;
    return sb.query('attendance', {
      filters: [
        `class_name=eq.${encodeURIComponent(className)}`,
        `attend_date=gte.${from}`,
        `attend_date=lte.${to}`,
      ],
      order: 'attend_date.asc',
    });
  },
  async getAll(month, year) {
    const from = `${year}-${String(month).padStart(2,'0')}-01`;
    const to   = `${year}-${String(month).padStart(2,'0')}-31`;
    return sb.query('attendance', {
      filters: [`attend_date=gte.${from}`, `attend_date=lte.${to}`],
      order: 'attend_date.asc',
    });
  },
  async upsert(studentId, className, date, status, note = '') {
    // Try update first, then insert
    const existing = await sb.query('attendance', {
      filters: [`student_id=eq.${studentId}`, `attend_date=eq.${date}`],
      limit: 1,
    });
    if (existing && existing.length > 0) {
      return sb.update('attendance', existing[0].id, { status, note });
    }
    const row = await sb.insert('attendance', {
      student_id: studentId, class_name: className,
      attend_date: date, status, note,
    });
    return Array.isArray(row) ? row[0] : row;
  },
};

// ── Tuitions ──────────────────────────────────────────────────────────────────
const Tuitions = {
  async getAll() {
    return sb.query('tuitions', { order: 'created_at.desc' });
  },
  async create(data) {
    const row = await sb.insert('tuitions', {
      student_id: data.studentId, student_name: data.studentName,
      class_name: data.class, amount: data.amount,
      month: data.month, due_date: data.dueDate,
      status: data.status || 'unpaid', paid_date: data.paidDate || null,
    });
    return Array.isArray(row) ? row[0] : row;
  },
  async markPaid(id) {
    return sb.update('tuitions', id, {
      status: 'paid',
      paid_date: new Date().toISOString().split('T')[0],
    });
  },
};

// ── Materials (Video & Tài liệu) ──────────────────────────────────────────────
const Materials = {
  async getAll() {
    return sb.query('materials', { order: 'created_at.desc' });
  },
  async getForClass(className) {
    const all = await sb.query('materials', { order: 'created_at.desc' });
    return all.filter(m =>
      !m.target_classes ||
      m.target_classes.includes('all') ||
      m.target_classes.includes(className)
    );
  },
  async create(data) {
    const row = await sb.insert('materials', {
      type: data.type, title: data.title,
      url: data.url || null, file_type: data.fileType || null,
      file_name: data.fileName || null,
      target_classes: data.classes || ['all'],
      topic: data.topic || null, description: data.desc || '',
      teacher_name: data.teacher || '',
    });
    return Array.isArray(row) ? row[0] : row;
  },
  async delete(id) { return sb.delete('materials', id); },
};

// ── Quiz Questions ────────────────────────────────────────────────────────────
const QuizQuestions = {
  async getAll() {
    return sb.query('quiz_questions', { order: 'created_at.asc' });
  },
  async getByLesson(lessonId) {
    return sb.query('quiz_questions', {
      filters: [`lesson_id=eq.${lessonId}`],
    });
  },
  async create(data) {
    const row = await sb.insert('quiz_questions', {
      question: data.question,
      options: JSON.stringify(data.options),
      correct_index: data.correct,
      explanation: data.explanation || '',
      lesson_id: data.lessonId || null,
    });
    return Array.isArray(row) ? row[0] : row;
  },
  async delete(id) { return sb.delete('quiz_questions', id); },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Map Supabase row → format cũ dùng trong UI
function mapStudent(row) {
  return {
    id: row.id, name: row.name, email: row.email, phone: row.phone,
    class: row.class_name, progress: row.progress || 0,
    joinDate: row.join_date, birthday: row.birthday,
    address: row.address, status: row.status,
    tuition: row.tuition_status,
  };
}

function mapTeacher(row) {
  return {
    id: row.id, name: row.name, email: row.email, phone: row.phone,
    subject: row.subject, experience: row.experience,
    status: row.status, joinDate: row.join_date,
    classes: [],
  };
}

function mapClass(row) {
  return {
    id: row.id, name: row.name, level: row.level,
    teacher: row.teacher_name, teacherId: row.teacher_id,
    students: 0, maxStudents: row.max_students,
    schedule: row.schedule, room: row.room, status: row.status,
  };
}

function mapLesson(row) {
  return {
    id: row.id, title: row.title, topic: row.topic, level: row.level,
    duration: row.duration, description: row.description,
    videoUrl: row.video_url, document: row.document,
    teacher: row.teacher_name, date: row.lesson_date,
    thumbnail: null, tags: [],
  };
}

function mapVocab(row) {
  return {
    id: row.id, word: row.word, pronunciation: row.pronunciation,
    meaning: row.meaning, meaning_en: row.meaning_en,
    example: row.example, category: row.category,
  };
}

function mapSchedule(row) {
  return {
    id: row.id, day: row.day_of_week, class: row.class_name,
    teacher: row.teacher_name, time: row.time_slot,
    room: row.room, type: row.type, topic: row.topic,
  };
}

function mapNotification(row) {
  return {
    id: row.id, title: row.title, content: row.content,
    from: row.from_name, type: row.type,
    date: row.created_at ? row.created_at.split('T')[0] : '',
    read: row.is_read,
  };
}

function mapAttendance(row) {
  return {
    id: row.id, studentId: row.student_id, class: row.class_name,
    date: row.attend_date, status: row.status, note: row.note,
  };
}

function mapTuition(row) {
  return {
    id: row.id, studentId: row.student_id, studentName: row.student_name,
    class: row.class_name, amount: row.amount, month: row.month,
    dueDate: row.due_date, status: row.status, paidDate: row.paid_date,
  };
}

function mapMaterial(row) {
  return {
    id: row.id, type: row.type, title: row.title,
    url: row.url, fileType: row.file_type, fileName: row.file_name,
    classes: row.target_classes || ['all'],
    topic: row.topic, desc: row.description,
    teacher: row.teacher_name,
    date: row.created_at ? row.created_at.split('T')[0] : '',
  };
}

// ── Load tất cả data vào mockData ─────────────────────────────────────────────
async function loadAllData() {
  try {
    const [students, teachers, classes, lessons, vocab, schedule,
           notifs, tuitions, materials, quizQ] = await Promise.all([
      Students.getAll(),
      Teachers.getAll(),
      Classes.getAll(),
      Lessons.getAll(),
      Vocabulary.getAll(),
      Schedule.getAll(),
      Notifications.getAll(),
      Tuitions.getAll(),
      Materials.getAll(),
      QuizQuestions.getAll(),
    ]);

    mockData.students      = (students  || []).map(mapStudent);
    mockData.teachers      = (teachers  || []).map(mapTeacher);
    mockData.classes       = (classes   || []).map(mapClass);
    mockData.lessons       = (lessons   || []).map(mapLesson);
    mockData.vocabulary    = (vocab     || []).map(mapVocab);
    mockData.schedule      = (schedule  || []).map(mapSchedule);
    mockData.notifications = (notifs    || []).map(mapNotification);
    mockData.tuitions      = (tuitions  || []).map(mapTuition);
    mockData.quizQuestions = (quizQ     || []).map(q => ({
      id: q.id, question: q.question,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      correct: q.correct_index, explanation: q.explanation,
    }));

    // materials vào uploadedItems (teacher page)
    if (typeof uploadedItems !== 'undefined') {
      uploadedItems = (materials || []).map(mapMaterial);
    }

    console.log('✅ Supabase data loaded');
    return true;
  } catch (e) {
    console.error('❌ Supabase load error:', e);
    return false;
  }
}
