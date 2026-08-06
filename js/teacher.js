// teacher.js - Teacher Dashboard Logic
let currentTeacher = null;
let currentSection = 'dashboard';
let teacherLessons = [];
let teacherQuizQuestions = [];

function initTeacher() {
  currentTeacher = requireAuth('teacher');
  if (!currentTeacher) return;

  document.getElementById('sidebarNav').innerHTML =
    '<div class="text-indigo-300 text-xs px-6 py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Đang tải dữ liệu...</div>';

  loadAllData().then(() => {
    teacherLessons = [...mockData.lessons];
    renderSidebar();
    renderTopbar();
    navigateTo('dashboard');
  }).catch(() => {
    teacherLessons = [];
    renderSidebar();
    renderTopbar();
    navigateTo('dashboard');
  });
}

function renderSidebar() {
  const nav = document.getElementById('sidebarNav');
  const items = [
    { id: 'dashboard',         icon: 'fas fa-tachometer-alt',   key: 'dashboard' },
    { id: 'manageLesson',      icon: 'fas fa-book',             key: 'manageLesson' },
    { id: 'grammarManager',    icon: 'fas fa-spell-check',      key: 'grammarManager' },
    { id: 'vocabManager',      icon: 'fas fa-language',         key: 'vocabManager' },
    { id: 'uploadDoc',         icon: 'fas fa-cloud-upload-alt', key: 'uploadDoc' },
    { id: 'createQuiz',        icon: 'fas fa-question-circle',  key: 'createQuiz' },
    { id: 'attendanceManager', icon: 'fas fa-clipboard-check',  key: 'attendanceManager' },
    { id: 'manageClass',       icon: 'fas fa-users',            key: 'manageClass' },
    { id: 'teachSchedule',     icon: 'fas fa-calendar-alt',     key: 'teachSchedule' },
    { id: 'sendNotif',         icon: 'fas fa-paper-plane',      key: 'sendNotif' },
  ];
  nav.innerHTML = items.map(item => `
    <a id="nav-${item.id}" onclick="navigateTo('${item.id}')" class="${currentSection === item.id ? 'active' : ''}">
      <i class="${item.icon}"></i>
      <span data-i18n="${item.key}">${t(item.key)}</span>
    </a>
  `).join('');
}

function renderTopbar() {
  document.getElementById('topbarUserName').textContent = currentTeacher.name;
  const initials = currentTeacher.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('topbarAvatar').textContent = initials;
}

function navigateTo(section) {
  currentSection = section;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  const navEl = document.getElementById('nav-' + section);
  if (navEl) navEl.classList.add('active');
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  const sectionEl = document.getElementById('section-' + section);
  if (sectionEl) { sectionEl.classList.add('active'); sectionEl.classList.add('fade-in'); }
  switch (section) {
    case 'dashboard': renderDashboard(); break;
    case 'manageLesson': renderManageLesson(); break;
    case 'grammarManager': renderGrammarManager(); break;
    case 'vocabManager': renderVocabManager(); break;
    case 'uploadDoc':         renderUploadDoc(); break;
    case 'createQuiz':        renderCreateQuiz(); break;
    case 'attendanceManager': renderAttendanceManager(); break;
    case 'manageClass':       renderManageClass(); break;
    case 'teachSchedule': renderTeachSchedule(); break;
    case 'sendNotif': renderSendNotif(); break;
  }
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// ===== DASHBOARD =====
function renderDashboard() {
  // Lọc lớp của giáo viên hiện tại (theo tên, vì teacherId là UUID)
  const myClasses = mockData.classes.filter(c =>
    c.teacher === currentTeacher.name || !c.teacher
  );
  const totalStudents = mockData.students.filter(s =>
    myClasses.some(c => c.name === s.class)
  ).length;
  document.getElementById('dashTotalStudents').textContent = totalStudents || mockData.students.length;
  document.getElementById('dashTotalLessons').textContent = teacherLessons.length;
  const today = new Date().getDay();
  const todayClasses = mockData.schedule.filter(s => s.day === today && s.teacher === currentTeacher.name);
  document.getElementById('dashTodayClasses').textContent = todayClasses.length;

  const recentLessons = document.getElementById('dashRecentLessons');
  recentLessons.innerHTML = teacherLessons.slice(-3).reverse().map(l => `
    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-indigo-50 transition-colors">
      <div class="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
        <i class="fas fa-${l.topic === 'grammar' ? 'spell-check' : l.topic === 'vocabulary' ? 'language' : l.topic === 'listening' ? 'headphones' : 'microphone'} text-sm"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-gray-900 text-sm truncate">${l.title}</p>
        <p class="text-xs text-gray-500">${formatDate(l.date)} &bull; ${l.duration} ${t('minutes')}</p>
      </div>
      <span class="badge ${getTopicColor(l.topic)} text-xs">${t(l.topic + 'Topic') || l.topic}</span>
    </div>
  `).join('');

  const dashSchedule = document.getElementById('dashSchedule');
  const upcomingSchedule = mockData.schedule.filter(s => s.teacher === currentTeacher.name || true).slice(0, 4);
  dashSchedule.innerHTML = upcomingSchedule.map(s => `
    <div class="flex items-center gap-3 p-3 border-l-4 ${s.type === 'online' ? 'border-cyan-400 bg-cyan-50' : 'border-indigo-400 bg-indigo-50'} rounded-r-xl">
      <div class="flex-1">
        <p class="font-semibold text-sm text-gray-800">${s.topic}</p>
        <p class="text-xs text-gray-500">${['CN','T2','T3','T4','T5','T6','T7'][s.day]} &bull; ${s.time} &bull; ${s.class}</p>
      </div>
      <span class="badge ${s.type === 'online' ? 'bg-cyan-100 text-cyan-700' : 'bg-indigo-100 text-indigo-700'}">${s.type === 'online' ? t('online') : t('room') + ' ' + s.room}</span>
    </div>
  `).join('');
}

// ===== MANAGE LESSONS =====
function renderManageLesson() {
  const tbody = document.getElementById('lessonTableBody');
  tbody.innerHTML = teacherLessons.map(l => `
    <tr>
      <td><span class="font-medium text-gray-900">${l.title}</span></td>
      <td><span class="badge ${getTopicColor(l.topic)}">${t(l.topic + 'Topic') || l.topic}</span></td>
      <td><span class="badge ${getLevelColor(l.level)}">${t(l.level)}</span></td>
      <td class="text-gray-600">${l.duration} ${t('minutes')}</td>
      <td class="text-gray-600">${formatDate(l.date)}</td>
      <td>
        <div class="flex gap-2">
          <button onclick="editLesson(${l.id})" class="btn-outline text-xs px-2 py-1"><i class="fas fa-edit mr-1"></i>${t('edit')}</button>
          <button onclick="deleteLesson(${l.id})" class="btn-danger text-xs px-2 py-1"><i class="fas fa-trash mr-1"></i>${t('delete')}</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="6" class="text-center text-gray-400 py-6">${t('noData')}</td></tr>`;
}

function openAddLessonModal() {
  document.getElementById('lessonModalTitle').textContent = t('addLesson');
  document.getElementById('lessonForm').reset();
  document.getElementById('lessonIdField').value = '';
  document.getElementById('lessonModal').classList.add('active');
}

function editLesson(id) {
  const lesson = teacherLessons.find(l => l.id === id);
  if (!lesson) return;
  document.getElementById('lessonModalTitle').textContent = t('edit') + ' ' + t('lessons');
  document.getElementById('lessonIdField').value = id;
  document.getElementById('lessonTitleInput').value = lesson.title;
  document.getElementById('lessonTopicInput').value = lesson.topic;
  document.getElementById('lessonLevelInput').value = lesson.level;
  document.getElementById('lessonDurationInput').value = lesson.duration;
  document.getElementById('lessonDescInput').value = lesson.description;
  document.getElementById('lessonVideoInput').value = lesson.videoUrl;
  document.getElementById('lessonModal').classList.add('active');
}

async function saveLesson() {
  const id = document.getElementById('lessonIdField').value;
  const data = {
    title:       document.getElementById('lessonTitleInput').value,
    topic:       document.getElementById('lessonTopicInput').value,
    level:       document.getElementById('lessonLevelInput').value,
    duration:    parseInt(document.getElementById('lessonDurationInput').value) || 45,
    description: document.getElementById('lessonDescInput').value,
    videoUrl:    document.getElementById('lessonVideoInput').value || '',
    document:    'document.pdf',
    teacher:     currentTeacher.name,
    date:        new Date().toISOString().split('T')[0],
  };
  try {
    if (id) {
      await Lessons.update(id, data);
      const idx = teacherLessons.findIndex(l => l.id === id);
      if (idx !== -1) teacherLessons[idx] = { ...teacherLessons[idx], ...data, id };
    } else {
      const row = await Lessons.create(data);
      const mapped = mapLesson(row);
      teacherLessons.push(mapped);
      mockData.lessons.push(mapped);
    }
    closeLessonModal();
    renderManageLesson();
    showToast(t('successMsg'), 'success');
  } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function deleteLesson(id) {
  openConfirmModal(t('deleteWarning'), async () => {
    try {
      await Lessons.delete(id);
      teacherLessons = teacherLessons.filter(l => l.id !== id);
      mockData.lessons = mockData.lessons.filter(l => l.id !== id);
      renderManageLesson();
      showToast(t('successMsg'), 'success');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
  });
}

function closeLessonModal() { document.getElementById('lessonModal').classList.remove('active'); }

// ===== UPLOAD VIDEO & DOC =====
let uploadedItems = [];

async function renderUploadDoc() {
  switchUploadTab('video');
  populateDocLessonSelect();
  // Load từ Supabase lần đầu
  if (uploadedItems.length === 0) {
    document.getElementById('uploadedList').innerHTML =
      '<div class="bg-white rounded-2xl p-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin text-3xl mb-3 block"></i>Đang tải...</div>';
    try {
      const rows = await Materials.getAll();
      uploadedItems = rows.map(mapMaterial);
    } catch(e) {
      uploadedItems = [];
    }
  }
  renderUploadedList();
}

function switchUploadTab(tab) {
  const isVideo = tab === 'video';
  document.getElementById('uploadVideoForm').classList.toggle('hidden', !isVideo);
  document.getElementById('uploadDocForm').classList.toggle('hidden', isVideo);
  document.getElementById('uploadTabVideo').className = `px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors ${isVideo ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-indigo-50'}`;
  document.getElementById('uploadTabDoc').className = `px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors ${!isVideo ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-indigo-50'}`;
}

function populateDocLessonSelect() {
  const sel = document.getElementById('docLessonInput');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Chọn bài học (tuỳ chọn) --</option>' +
    teacherLessons.map(l => `<option value="${l.id}">${l.title}</option>`).join('');
}

async function handleVideoUpload() {
  const title = document.getElementById('videoTitleInput').value.trim();
  const url   = document.getElementById('videoUrlInput').value.trim();
  const cls   = document.getElementById('videoClassInput').value;
  const topic = document.getElementById('videoTopicInput').value;
  const desc  = document.getElementById('videoDescInput').value.trim();
  if (!title || !url) { showToast('Vui lòng nhập tiêu đề và link video!', 'error'); return; }
  try {
    const row = await Materials.create({
      type: 'video', title, url,
      classes: cls === 'all' ? ['all'] : [cls],
      topic, desc, teacher: currentTeacher.name,
    });
    uploadedItems.unshift(mapMaterial(row));
    document.getElementById('videoUploadForm').reset();
    renderUploadedList();
    showToast('Đã thêm video thành công!', 'success');
  } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function handleDocUpload() {
  const title    = document.getElementById('docTitleInput').value.trim();
  const cls      = document.getElementById('docClassInput').value;
  const fileType = document.getElementById('docTypeInput').value;
  const desc     = document.getElementById('docDescInput').value.trim();
  const fileName = document.getElementById('fileNameDisplay').textContent;
  if (!title) { showToast('Vui lòng nhập tên tài liệu!', 'error'); return; }
  try {
    const row = await Materials.create({
      type: 'doc', title, fileType,
      fileName: fileName || title + '.pdf',
      classes: cls === 'all' ? ['all'] : [cls],
      desc, teacher: currentTeacher.name,
    });
    uploadedItems.unshift(mapMaterial(row));
    document.getElementById('docUploadForm').reset();
    document.getElementById('fileNameDisplay').textContent = '';
    renderUploadedList();
    showToast('Upload tài liệu thành công!', 'success');
  } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function renderUploadedList() {
  const classFil = document.getElementById('uploadListClassFilter')?.value || 'all';
  const typeFil  = document.getElementById('uploadListTypeFilter')?.value  || 'all';
  const search   = (document.getElementById('uploadListSearch')?.value || '').toLowerCase();

  const topicLabel = { grammar:'Ngữ pháp', vocabulary:'Từ vựng', listening:'Nghe', speaking:'Nói', other:'Khác' };
  const topicColor = { grammar:'bg-indigo-100 text-indigo-700', vocabulary:'bg-emerald-100 text-emerald-700', listening:'bg-amber-100 text-amber-700', speaking:'bg-rose-100 text-rose-700', other:'bg-gray-100 text-gray-600' };
  const fileIcon   = { pdf:'fa-file-pdf text-red-500', word:'fa-file-word text-blue-500', ppt:'fa-file-powerpoint text-orange-500', other:'fa-file text-gray-500' };
  const fileColor  = { pdf:'bg-red-100', word:'bg-blue-100', ppt:'bg-orange-100', other:'bg-gray-100' };

  let list = uploadedItems.filter(item => {
    const matchClass = classFil === 'all' || item.classes.includes('all') || item.classes.includes(classFil);
    const matchType  = typeFil === 'all' || item.type === typeFil;
    const matchSearch = !search || item.title.toLowerCase().includes(search) || (item.desc || '').toLowerCase().includes(search);
    return matchClass && matchType && matchSearch;
  });

  const container = document.getElementById('uploadedList');
  if (list.length === 0) {
    container.innerHTML = `<div class="bg-white rounded-2xl p-10 shadow-sm text-center text-gray-400">
      <i class="fas fa-inbox text-4xl mb-3 block"></i><p>Không có kết quả nào</p></div>`;
    return;
  }

  container.innerHTML = list.map(item => {
    const classbadges = item.classes.map(c =>
      `<span class="badge bg-indigo-100 text-indigo-700 text-xs">${c === 'all' ? 'Tất cả lớp' : c}</span>`
    ).join(' ');

    if (item.type === 'video') {
      // Convert youtube watch URL → embed
      const embedUrl = (item.url || '')
        .replace('watch?v=', 'embed/')
        .replace('youtu.be/', 'www.youtube.com/embed/');
      return `
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div class="flex flex-col sm:flex-row">
            <!-- Thumbnail -->
            <div class="w-full sm:w-48 h-32 bg-gray-900 flex-shrink-0 relative overflow-hidden rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none">
              <iframe src="${embedUrl}" class="w-full h-full" frameborder="0" allowfullscreen></iframe>
              <div class="absolute top-2 left-2">
                <span class="badge bg-indigo-600 text-white text-xs"><i class="fas fa-video mr-1"></i>Video</span>
              </div>
            </div>
            <!-- Info -->
            <div class="flex-1 p-4 flex flex-col justify-between">
              <div>
                <div class="flex flex-wrap items-start justify-between gap-2 mb-1">
                  <h4 class="font-bold text-gray-900">${item.title}</h4>
                  <div class="flex gap-1 flex-wrap">${classbadges}</div>
                </div>
                ${item.topic ? `<span class="badge ${topicColor[item.topic] || 'bg-gray-100 text-gray-600'} text-xs mb-1">${topicLabel[item.topic] || item.topic}</span>` : ''}
                <p class="text-xs text-gray-500 mt-1 line-clamp-2">${item.desc || ''}</p>
              </div>
              <div class="flex items-center justify-between mt-3">
                <span class="text-xs text-gray-400"><i class="fas fa-calendar mr-1"></i>${formatDate(item.date)} &bull; ${item.teacher}</span>
                <div class="flex gap-2">
                  <a href="${item.url}" target="_blank" class="btn-outline text-xs px-3 py-1.5 flex items-center gap-1">
                    <i class="fas fa-external-link-alt"></i> Xem
                  </a>
                  <button onclick="deleteUploadItem(${item.id})" class="btn-danger text-xs px-3 py-1.5">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>`;
    } else {
      const ft = item.fileType || 'other';
      return `
        <div class="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
          <div class="w-12 h-12 ${fileColor[ft] || 'bg-gray-100'} rounded-xl flex items-center justify-center flex-shrink-0">
            <i class="fas ${fileIcon[ft] || fileIcon.other} text-xl"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <h4 class="font-bold text-gray-900 text-sm">${item.title}</h4>
              <span class="badge bg-gray-100 text-gray-600 text-xs uppercase">${ft}</span>
              <div class="flex gap-1 flex-wrap">${classbadges}</div>
            </div>
            <p class="text-xs text-gray-500 truncate">${item.desc || ''}</p>
            <p class="text-xs text-gray-400 mt-1"><i class="fas fa-calendar mr-1"></i>${formatDate(item.date)} &bull; ${item.teacher}</p>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button onclick="showToast('Tải xuống: ' + '${item.title}', 'success')" class="btn-outline text-xs px-3 py-1.5 flex items-center gap-1">
              <i class="fas fa-download"></i>
            </button>
            <button onclick="deleteUploadItem(${item.id})" class="btn-danger text-xs px-3 py-1.5">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>`;
    }
  }).join('');
}

function deleteUploadItem(id) {
  openConfirmModal('Xóa mục này? Hành động không thể hoàn tác.', async () => {
    try {
      await Materials.delete(id);
      uploadedItems = uploadedItems.filter(i => i.id !== id);
      renderUploadedList();
      showToast('Đã xóa!', 'success');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
  });
}

function updateFileName(input) {
  const display = document.getElementById('fileNameDisplay');
  if (input.files.length > 0) display.textContent = input.files[0].name;
}

// ===== CREATE QUIZ =====
function renderCreateQuiz() {
  teacherQuizQuestions = [];
  document.getElementById('quizBuilderQuestions').innerHTML = '';
  document.getElementById('quizQuestionCount').textContent = '0';
}

function addQuizQuestion() {
  const qText = document.getElementById('newQuestionText').value.trim();
  const opts = [
    document.getElementById('newOpt0').value.trim(),
    document.getElementById('newOpt1').value.trim(),
    document.getElementById('newOpt2').value.trim(),
    document.getElementById('newOpt3').value.trim(),
  ];
  const correct = parseInt(document.getElementById('newCorrect').value);
  if (!qText || opts.some(o => !o)) {
    showToast(t('errorMsg'), 'error');
    return;
  }
  const q = { id: Date.now(), question: qText, options: opts, correct, explanation: '' };
  teacherQuizQuestions.push(q);
  renderQuizBuilder();
  document.getElementById('newQuestionText').value = '';
  document.getElementById('newOpt0').value = '';
  document.getElementById('newOpt1').value = '';
  document.getElementById('newOpt2').value = '';
  document.getElementById('newOpt3').value = '';
}

function renderQuizBuilder() {
  document.getElementById('quizQuestionCount').textContent = teacherQuizQuestions.length;
  document.getElementById('quizBuilderQuestions').innerHTML = teacherQuizQuestions.map((q, i) => `
    <div class="p-3 bg-gray-50 rounded-xl border border-gray-200">
      <div class="flex items-start justify-between gap-2">
        <p class="font-semibold text-sm text-gray-800 flex-1">${i + 1}. ${q.question}</p>
        <button onclick="removeQuizQuestion(${q.id})" class="text-red-400 hover:text-red-600 ml-2 flex-shrink-0">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="mt-2 grid grid-cols-2 gap-1.5">
        ${q.options.map((opt, j) => `
          <div class="text-xs px-2 py-1 rounded-lg ${j === q.correct ? 'bg-emerald-100 text-emerald-700 font-semibold' : 'bg-white text-gray-600 border'}">
            ${String.fromCharCode(65 + j)}. ${opt}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('') || `<div class="text-center text-gray-400 py-4 text-sm">${t('noData')}</div>`;
}

function removeQuizQuestion(id) {
  teacherQuizQuestions = teacherQuizQuestions.filter(q => q.id !== id);
  renderQuizBuilder();
}

function saveQuiz() {
  const title = document.getElementById('quizTitleInput').value.trim();
  if (!title) { showToast(t('errorMsg'), 'error'); return; }
  if (teacherQuizQuestions.length === 0) { showToast(t('errorMsg'), 'error'); return; }
  showToast(t('successMsg'), 'success');
  document.getElementById('quizTitleInput').value = '';
  renderCreateQuiz();
}

// ===== MANAGE CLASS =====
function renderManageClass() {
  const myClasses = mockData.classes.filter(c => c.teacherId === 1 || c.teacherId === 2);
  document.getElementById('myClassTabs').innerHTML = myClasses.map((c, i) => `
    <button onclick="showClassStudents(${c.id})" class="px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-indigo-50'}">
      ${c.name} <span class="badge bg-white/20 text-white ml-1 ${i === 0 ? '' : 'hidden'}">${c.students}</span>
    </button>
  `).join('');
  if (myClasses.length > 0) showClassStudents(myClasses[0].id);
}

function showClassStudents(classId) {
  const cls = mockData.classes.find(c => c.id === classId);
  document.querySelectorAll('#myClassTabs button').forEach((btn, i) => {
    btn.className = `px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${mockData.classes.filter(c => c.teacherId === 1 || c.teacherId === 2)[i]?.id === classId ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-indigo-50'}`;
  });
  const students = mockData.students.filter(s => s.class === cls.name);
  document.getElementById('classStudentList').innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h4 class="font-bold text-gray-900">${t('class')}: ${cls.name} (${cls.level})</h4>
      <span class="text-sm text-gray-500">${students.length}/${cls.maxStudents} ${t('student')}</span>
    </div>
    <div class="overflow-x-auto">
      <table class="data-table">
        <thead><tr>
          <th>${t('name')}</th><th>${t('email')}</th><th>${t('phone')}</th>
          <th>${t('progress')}</th><th>${t('status')}</th>
        </tr></thead>
        <tbody>
          ${students.map(s => `
            <tr>
              <td><span class="font-medium text-gray-900">${s.name}</span></td>
              <td class="text-gray-600">${s.email}</td>
              <td class="text-gray-600">${s.phone}</td>
              <td>
                <div class="flex items-center gap-2">
                  <div class="progress-bar flex-1" style="min-width:80px"><div class="progress-fill" style="width:${s.progress}%"></div></div>
                  <span class="text-sm font-semibold text-gray-700">${s.progress}%</span>
                </div>
              </td>
              <td><span class="badge ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}">${s.status === 'active' ? 'Đang học' : 'Nghỉ học'}</span></td>
            </tr>
          `).join('') || `<tr><td colspan="5" class="text-center text-gray-400 py-4">${t('noData')}</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

// ===== TEACH SCHEDULE =====
function renderTeachSchedule() {
  const days = ['CN','T2','T3','T4','T5','T6','T7'];
  const today = new Date().getDay();
  const scheduleItems = mockData.schedule;
  const grid = document.getElementById('teachScheduleGrid');
  grid.innerHTML = '';
  for (let d = 1; d <= 7; d++) {
    const dayIdx = d === 7 ? 0 : d;
    const dayItems = scheduleItems.filter(s => s.day === dayIdx);
    const isToday = dayIdx === today;
    const col = document.createElement('div');
    col.className = `rounded-xl p-3 ${isToday ? 'bg-indigo-50 ring-2 ring-indigo-300' : 'bg-white'} shadow-sm`;
    col.innerHTML = `
      <div class="text-center mb-2">
        <div class="text-xs font-bold ${isToday ? 'text-indigo-600' : 'text-gray-500'} uppercase">${days[dayIdx]}</div>
        ${isToday ? `<div class="text-xs text-indigo-400">${t('today')}</div>` : ''}
      </div>
      ${dayItems.length > 0 ? dayItems.map(s => `
        <div class="schedule-cell ${s.type === 'online' ? 'bg-cyan-100 text-cyan-800' : 'bg-indigo-100 text-indigo-800'} mb-1">
          <div class="font-semibold text-xs">${s.class}: ${s.topic.substring(0, 14)}${s.topic.length > 14 ? '...' : ''}</div>
          <div class="text-xs mt-0.5">${s.time}</div>
          <div class="text-xs">${s.type === 'online' ? t('online') : t('room') + ' ' + s.room}</div>
        </div>
      `).join('') : `<div class="text-center text-gray-300 text-xs py-4"><i class="fas fa-minus-circle text-xl block mb-1"></i>Trống</div>`}
    `;
    grid.appendChild(col);
  }
}

function openAddScheduleModal() {
  document.getElementById('scheduleModal').classList.add('active');
}

function closeScheduleModal() {
  document.getElementById('scheduleModal').classList.remove('active');
}

async function saveSchedule() {
  const data = {
    day:     parseInt(document.getElementById('schedDayInput').value),
    class:   document.getElementById('schedClassInput').value,
    teacher: currentTeacher.name,
    time:    document.getElementById('schedTimeInput').value,
    room:    document.getElementById('schedRoomInput').value,
    type:    document.getElementById('schedTypeInput').value,
    topic:   document.getElementById('schedTopicInput').value,
  };
  if (!data.time || !data.topic) { showToast(t('errorMsg'), 'error'); return; }
  try {
    const row = await Schedule.create(data);
    const mapped = mapSchedule(row);
    mockData.schedule.push(mapped);
    closeScheduleModal();
    renderTeachSchedule();
    showToast(t('successMsg'), 'success');
  } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// ===== SEND NOTIFICATION =====
function renderSendNotif() {
  // static form
}

async function sendNotification(e) {
  e.preventDefault();
  const form = e.target;
  const targetClass = form.querySelector('select').value;
  const title   = form.querySelectorAll('input[type="text"]')[0]?.value.trim();
  const content = form.querySelector('textarea')?.value.trim();
  if (!title || !content) { showToast(t('errorMsg'), 'error'); return; }
  try {
    const row = await Notifications.create({
      title, content,
      from: currentTeacher.name,
      type: 'teacher',
      targetClass,
    });
    mockData.notifications.unshift(mapNotification(row));
    form.reset();
    showToast(t('sendSuccess'), 'success');
  } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// Confirm modal
function openConfirmModal(msg, callback) {
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmModal').classList.add('active');
  document.getElementById('confirmOkBtn').onclick = () => {
    closeConfirmModal();
    callback();
  };
}

function closeConfirmModal() {
  document.getElementById('confirmModal').classList.remove('active');
}

// ===== ATTENDANCE MANAGER =====
let tempAttendance = {};

function renderAttendanceManager() {
  const now = new Date();
  const attMonthSel = document.getElementById('attMonthFilter');
  if (attMonthSel && !attMonthSel._init) {
    attMonthSel.value = now.getMonth() + 1;
    attMonthSel._init = true;
  }
  const month = parseInt(document.getElementById('attMonthFilter')?.value || now.getMonth() + 1);
  const classFil = document.getElementById('attClassFilter')?.value || 'all';
  const year = 2026;

  // Get students in selected class(es)
  const students = classFil === 'all' ? mockData.students : mockData.students.filter(s => s.class === classFil);

  // Stats
  const allRecs = mockData.attendance.filter(a => {
    const d = new Date(a.date);
    const inClass = classFil === 'all' || a.class === classFil;
    return d.getMonth() + 1 === month && d.getFullYear() === year && inClass;
  });
  const totalSessions = [...new Set(allRecs.map(r => r.date))].length;
  const totalPresent  = allRecs.filter(r => r.status === 'present').length;
  const totalLate     = allRecs.filter(r => r.status === 'late').length;
  const totalAbsent   = allRecs.filter(r => r.status === 'absent').length;

  document.getElementById('attManagerStats').innerHTML = `
    <div class="stat-card flex items-center gap-3 py-3">
      <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><i class="fas fa-calendar-check text-indigo-600"></i></div>
      <div><div class="text-2xl font-black text-gray-900">${totalSessions}</div><div class="text-xs text-gray-500">Buổi đã điểm danh</div></div>
    </div>
    <div class="stat-card flex items-center gap-3 py-3">
      <div class="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center"><i class="fas fa-check text-emerald-600"></i></div>
      <div><div class="text-2xl font-black text-emerald-600">${totalPresent}</div><div class="text-xs text-gray-500">Lượt có mặt</div></div>
    </div>
    <div class="stat-card flex items-center gap-3 py-3">
      <div class="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><i class="fas fa-clock text-amber-500"></i></div>
      <div><div class="text-2xl font-black text-amber-500">${totalLate}</div><div class="text-xs text-gray-500">Lượt đi muộn</div></div>
    </div>
    <div class="stat-card flex items-center gap-3 py-3">
      <div class="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><i class="fas fa-times text-red-500"></i></div>
      <div><div class="text-2xl font-black text-red-500">${totalAbsent}</div><div class="text-xs text-gray-500">Lượt vắng mặt</div></div>
    </div>
  `;

  // Table
  document.getElementById('attManagerBody').innerHTML = students.map(s => {
    const recs = mockData.attendance.filter(a => {
      const d = new Date(a.date);
      return a.studentId === s.id && d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    const p = recs.filter(r => r.status === 'present').length;
    const l = recs.filter(r => r.status === 'late').length;
    const ab = recs.filter(r => r.status === 'absent').length;
    const total = recs.length;
    const rate = total > 0 ? Math.round((p + l) / total * 100) : 0;
    const lastNote = [...recs].reverse().find(r => r.note)?.note || '—';
    return `<tr>
      <td>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">${s.name.split(' ').pop()[0]}</div>
          <span class="font-semibold text-gray-900 text-sm">${s.name}</span>
        </div>
      </td>
      <td><span class="badge bg-indigo-100 text-indigo-700">${s.class}</span></td>
      <td class="text-emerald-600 font-bold">${p}</td>
      <td class="text-amber-500 font-bold">${l}</td>
      <td class="text-red-500 font-bold">${ab}</td>
      <td>
        <div class="flex items-center gap-2">
          <div class="progress-bar w-16"><div class="progress-fill" style="width:${rate}%;background:${rate>=80?'#10B981':rate>=60?'#F59E0B':'#EF4444'}"></div></div>
          <span class="text-xs font-bold ${rate>=80?'text-emerald-600':rate>=60?'text-amber-600':'text-red-500'}">${rate}%</span>
        </div>
      </td>
      <td class="text-gray-500 text-xs italic">${lastNote}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="7" class="text-center text-gray-400 py-6">${t('noData')}</td></tr>`;
}

function openAttendanceModal() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('attModalDate').value = today;
  document.getElementById('attModalClass').value = 'A1';
  loadAttendanceStudents();
  document.getElementById('attendanceModal').classList.add('active');
}

function loadAttendanceStudents() {
  const cls = document.getElementById('attModalClass').value;
  const date = document.getElementById('attModalDate').value;
  const students = mockData.students.filter(s => s.class === cls);
  tempAttendance = {};

  // Pre-fill from existing records
  students.forEach(s => {
    const rec = mockData.attendance.find(a => a.studentId === s.id && a.date === date);
    tempAttendance[s.id] = rec ? rec.status : 'present';
  });

  document.getElementById('attStudentList').innerHTML = students.map(s => `
    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      <div class="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        ${s.name.split(' ').pop()[0]}
      </div>
      <span class="font-semibold text-gray-900 text-sm flex-1">${s.name}</span>
      <div class="flex gap-1">
        <button onclick="setAttStatus(${s.id}, 'present', this)"
          class="att-btn px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all
          ${tempAttendance[s.id]==='present'?'bg-emerald-500 text-white border-emerald-500':'bg-white text-gray-500 border-gray-200 hover:border-emerald-300'}">
          ✓ Có mặt
        </button>
        <button onclick="setAttStatus(${s.id}, 'late', this)"
          class="att-btn px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all
          ${tempAttendance[s.id]==='late'?'bg-amber-400 text-white border-amber-400':'bg-white text-gray-500 border-gray-200 hover:border-amber-300'}">
          ⏰ Muộn
        </button>
        <button onclick="setAttStatus(${s.id}, 'absent', this)"
          class="att-btn px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all
          ${tempAttendance[s.id]==='absent'?'bg-red-500 text-white border-red-500':'bg-white text-gray-500 border-gray-200 hover:border-red-300'}">
          ✗ Vắng
        </button>
      </div>
    </div>
  `).join('') || '<p class="text-gray-400 text-center py-4">Không có học sinh trong lớp này</p>';
}

function setAttStatus(studentId, status, btn) {
  tempAttendance[studentId] = status;
  // Update button styles in the same row
  const row = btn.closest('.flex.items-center');
  row.querySelectorAll('.att-btn').forEach(b => {
    b.className = 'att-btn px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all bg-white text-gray-500 border-gray-200';
  });
  const colors = { present:'bg-emerald-500 text-white border-emerald-500', late:'bg-amber-400 text-white border-amber-400', absent:'bg-red-500 text-white border-red-500' };
  btn.className = `att-btn px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${colors[status]}`;
}

async function saveAttendance() {
  const date = document.getElementById('attModalDate').value;
  const cls  = document.getElementById('attModalClass').value;
  if (!date) { showToast('Vui lòng chọn ngày!', 'error'); return; }

  const btn = document.querySelector('#attendanceModal button.btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang lưu...'; }

  try {
    // Lấy danh sách học sinh trong lớp
    const students = mockData.students.filter(s => s.class === cls);
    const saves = Object.entries(tempAttendance).map(([sid, status]) => {
      // Tìm student theo id (có thể là UUID hoặc số)
      return Attendance.upsert(sid, cls, date, status, '');
    });
    await Promise.all(saves);

    // Cập nhật mockData.attendance local
    mockData.attendance = mockData.attendance.filter(
      a => !(a.date === date && a.class === cls)
    );
    Object.entries(tempAttendance).forEach(([sid, status]) => {
      mockData.attendance.push({ studentId: sid, class: cls, date, status, note: '' });
    });

    closeAttendanceModal();
    renderAttendanceManager();
    showToast(`Đã lưu điểm danh lớp ${cls} ngày ${formatDate(date)}!`, 'success');
  } catch(e) {
    showToast('Lỗi lưu điểm danh: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Lưu điểm danh'; }
  }
}

function closeAttendanceModal() {
  document.getElementById('attendanceModal').classList.remove('active');
}

// ===== VOCAB MANAGER =====
let teacherVocab = [];
let editingVocabId = null;

const categoryLabel = {
  noun: 'Danh từ', verb: 'Động từ', adjective: 'Tính từ',
  adverb: 'Trạng từ', abstract: 'Trừu tượng', phrase: 'Cụm từ'
};
const categoryColor = {
  noun:      'bg-indigo-100 text-indigo-700',
  verb:      'bg-emerald-100 text-emerald-700',
  adjective: 'bg-amber-100 text-amber-700',
  adverb:    'bg-cyan-100 text-cyan-700',
  abstract:  'bg-purple-100 text-purple-700',
  phrase:    'bg-rose-100 text-rose-700',
};

async function renderVocabManager() {
  // Luôn load fresh từ mockData (đã được loadAllData() điền từ Supabase)
  teacherVocab = JSON.parse(JSON.stringify(mockData.vocabulary));
  // Nếu chưa có (user vào thẳng trang này), load lại
  if (teacherVocab.length === 0) {
    try {
      const rows = await Vocabulary.getAll();
      teacherVocab = rows.map(mapVocab);
      mockData.vocabulary = [...teacherVocab];
    } catch(e) { teacherVocab = []; }
  }
  renderVocabStats();
  renderVocabTable();
}

function renderVocabStats() {
  const total = teacherVocab.length;
  const cats = {};
  teacherVocab.forEach(v => { cats[v.category] = (cats[v.category] || 0) + 1; });
  const topCats = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3);
  document.getElementById('vocabStatsBar').innerHTML = `
    <div class="stat-card flex items-center gap-3 py-3">
      <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
        <i class="fas fa-language text-indigo-600"></i>
      </div>
      <div>
        <div class="text-2xl font-black text-gray-900">${total}</div>
        <div class="text-xs text-gray-500">Tổng từ vựng</div>
      </div>
    </div>
    ${topCats.map(([cat, cnt]) => `
      <div class="stat-card flex items-center gap-3 py-3">
        <div class="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <i class="fas fa-tag text-gray-500"></i>
        </div>
        <div>
          <div class="text-2xl font-black text-gray-900">${cnt}</div>
          <div class="text-xs text-gray-500">${categoryLabel[cat] || cat}</div>
        </div>
      </div>
    `).join('')}
  `;
}

function renderVocabTable() {
  const search = (document.getElementById('vocabSearchInput')?.value || '').toLowerCase();
  const catFilter = document.getElementById('vocabCategoryFilter')?.value || 'all';

  let list = teacherVocab.filter(v => {
    const matchSearch = !search ||
      v.word.toLowerCase().includes(search) ||
      v.meaning.toLowerCase().includes(search) ||
      (v.meaning_en || '').toLowerCase().includes(search);
    const matchCat = catFilter === 'all' || v.category === catFilter;
    return matchSearch && matchCat;
  });

  document.getElementById('vocabTableBody').innerHTML = list.map(v => `
    <tr>
      <td>
        <div class="font-bold text-gray-900">${v.word}</div>
      </td>
      <td class="text-gray-500 text-sm font-mono">${v.pronunciation || '—'}</td>
      <td class="text-gray-800 text-sm">${v.meaning}</td>
      <td class="text-gray-500 text-sm max-w-[180px] truncate">${v.meaning_en || '—'}</td>
      <td>
        <span class="badge ${categoryColor[v.category] || 'bg-gray-100 text-gray-600'} text-xs">
          ${categoryLabel[v.category] || v.category}
        </span>
      </td>
      <td class="text-gray-500 text-xs max-w-[200px] truncate italic">${v.example || '—'}</td>
      <td>
        <div class="flex gap-1.5">
          <button onclick="editVocab(${v.id})" class="btn-outline text-xs px-2 py-1"><i class="fas fa-edit"></i></button>
          <button onclick="deleteVocab(${v.id})" class="btn-danger text-xs px-2 py-1"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" class="text-center text-gray-400 py-8">
    <i class="fas fa-search text-3xl mb-2 block"></i>${t('noData')}
  </td></tr>`;
}

function openAddVocabModal() {
  editingVocabId = null;
  document.getElementById('vocabModalTitle').textContent = 'Thêm từ vựng';
  document.getElementById('vocabForm').reset();
  document.getElementById('vocabIdField').value = '';
  document.getElementById('vocabModal').classList.add('active');
}

function editVocab(id) {
  const v = teacherVocab.find(x => x.id === id);
  if (!v) return;
  editingVocabId = id;
  document.getElementById('vocabModalTitle').textContent = 'Sửa từ vựng';
  document.getElementById('vocabIdField').value = id;
  document.getElementById('vocabWordInput').value = v.word;
  document.getElementById('vocabPronunInput').value = v.pronunciation || '';
  document.getElementById('vocabCategoryInput').value = v.category || 'noun';
  document.getElementById('vocabMeaningInput').value = v.meaning;
  document.getElementById('vocabMeaningEnInput').value = v.meaning_en || '';
  document.getElementById('vocabExampleInput').value = v.example || '';
  document.getElementById('vocabModal').classList.add('active');
}

async function saveVocab() {
  const word    = document.getElementById('vocabWordInput').value.trim();
  const meaning = document.getElementById('vocabMeaningInput').value.trim();
  if (!word || !meaning) { showToast('Vui lòng nhập từ vựng và nghĩa!', 'error'); return; }
  const data = {
    word, pronunciation: document.getElementById('vocabPronunInput').value.trim(),
    category:   document.getElementById('vocabCategoryInput').value,
    meaning,
    meaning_en: document.getElementById('vocabMeaningEnInput').value.trim(),
    example:    document.getElementById('vocabExampleInput').value.trim(),
  };
  try {
    if (editingVocabId) {
      await Vocabulary.update(editingVocabId, data);
      const idx = teacherVocab.findIndex(v => v.id === editingVocabId);
      if (idx !== -1) teacherVocab[idx] = { ...teacherVocab[idx], ...data };
      const mi = mockData.vocabulary.findIndex(v => v.id === editingVocabId);
      if (mi !== -1) mockData.vocabulary[mi] = { ...mockData.vocabulary[mi], ...data };
    } else {
      const row = await Vocabulary.create(data);
      const mapped = mapVocab(row);
      teacherVocab.push(mapped);
      mockData.vocabulary.push(mapped);
    }
    closeVocabModal();
    renderVocabStats();
    renderVocabTable();
    showToast(t('successMsg'), 'success');
  } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function deleteVocab(id) {
  openConfirmModal('Xóa từ vựng này? Hành động không thể hoàn tác.', async () => {
    try {
      await Vocabulary.delete(id);
      teacherVocab = teacherVocab.filter(v => v.id !== id);
      mockData.vocabulary = mockData.vocabulary.filter(v => v.id !== id);
      renderVocabStats();
      renderVocabTable();
      showToast(t('successMsg'), 'success');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
  });
}

function closeVocabModal() {
  document.getElementById('vocabModal').classList.remove('active');
}

// ===== GRAMMAR MANAGER =====
let teacherGrammarTopics = [];
let teacherGrammarExercises = [];
let editingGrammarTopicId = null;
let editingGrammarExId = null;
let gmActiveTab = 'topics';

function renderGrammarManager() {
  teacherGrammarTopics = JSON.parse(JSON.stringify(mockData.grammarTopics));
  teacherGrammarExercises = JSON.parse(JSON.stringify(mockData.grammarExercises));
  gmActiveTab = 'topics';
  renderGrammarTopicsTable();
  document.getElementById('gmTopicsTab').classList.remove('hidden');
  document.getElementById('gmExercisesTab').classList.add('hidden');
  document.getElementById('gmTabTopics').className = 'px-4 py-2 rounded-xl font-semibold text-sm bg-indigo-600 text-white';
  document.getElementById('gmTabExercises').className = 'px-4 py-2 rounded-xl font-semibold text-sm bg-gray-100 text-gray-600 hover:bg-indigo-50';
}

function switchGrammarManagerTab(tab) {
  gmActiveTab = tab;
  const isTopics = tab === 'topics';
  document.getElementById('gmTopicsTab').classList.toggle('hidden', !isTopics);
  document.getElementById('gmExercisesTab').classList.toggle('hidden', isTopics);
  document.getElementById('gmTabTopics').className = `px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${isTopics ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-indigo-50'}`;
  document.getElementById('gmTabExercises').className = `px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${!isTopics ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-indigo-50'}`;
  if (!isTopics) renderGrammarExTable();
}

function renderGrammarTopicsTable() {
  const levelLabel = { beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' };
  const levelColor = { beginner: 'bg-green-100 text-green-700', intermediate: 'bg-yellow-100 text-yellow-700', advanced: 'bg-red-100 text-red-700' };
  document.getElementById('grammarTopicsTableBody').innerHTML = teacherGrammarTopics.map(tp => {
    const exCount = teacherGrammarExercises.filter(e => e.topicId === tp.id).length;
    return `<tr>
      <td>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-${tp.color}-600 rounded-lg flex items-center justify-center text-white text-xs">
            <i class="fas fa-spell-check"></i>
          </div>
          <span class="font-semibold text-gray-900">${tp.name}</span>
        </div>
      </td>
      <td><span class="badge ${levelColor[tp.level] || 'bg-gray-100 text-gray-600'}">${levelLabel[tp.level] || tp.level}</span></td>
      <td class="text-gray-600">${tp.rules.length} quy tắc</td>
      <td><span class="badge bg-indigo-100 text-indigo-700">${exCount} bài tập</span></td>
      <td>
        <div class="flex gap-1.5">
          <button onclick="editGrammarTopic(${tp.id})" class="btn-outline text-xs px-2 py-1"><i class="fas fa-edit mr-1"></i>Sửa</button>
          <button onclick="deleteGrammarTopic(${tp.id})" class="btn-danger text-xs px-2 py-1"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" class="text-center text-gray-400 py-6">${t('noData')}</td></tr>`;
}

function renderGrammarExTable() {
  const typeLabel = { multiple: 'Trắc nghiệm', fill: 'Điền chỗ trống', error: 'Tìm lỗi sai' };
  document.getElementById('grammarExTableBody').innerHTML = teacherGrammarExercises.map(ex => {
    const topic = teacherGrammarTopics.find(tp => tp.id === ex.topicId);
    return `<tr>
      <td class="text-gray-800 text-sm max-w-xs truncate">${ex.question}</td>
      <td><span class="badge bg-indigo-100 text-indigo-700 text-xs">${topic ? topic.name : '—'}</span></td>
      <td><span class="badge bg-gray-100 text-gray-600 text-xs">${typeLabel[ex.type] || ex.type}</span></td>
      <td class="text-emerald-700 font-semibold text-sm">${ex.options[ex.correct]}</td>
      <td>
        <div class="flex gap-1.5">
          <button onclick="editGrammarEx(${ex.id})" class="btn-outline text-xs px-2 py-1"><i class="fas fa-edit mr-1"></i>Sửa</button>
          <button onclick="deleteGrammarEx(${ex.id})" class="btn-danger text-xs px-2 py-1"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" class="text-center text-gray-400 py-6">${t('noData')}</td></tr>`;
}

// --- Topic CRUD ---
function openAddGrammarModal() {
  editingGrammarTopicId = null;
  document.getElementById('grammarTopicModalTitle').textContent = 'Thêm chủ điểm ngữ pháp';
  document.getElementById('grammarTopicIdField').value = '';
  document.getElementById('gtNameInput').value = '';
  document.getElementById('gtLevelInput').value = 'beginner';
  document.getElementById('gtColorInput').value = 'indigo';
  document.getElementById('gtDescInput').value = '';
  document.getElementById('gtRulesContainer').innerHTML = '';
  document.getElementById('gtExamplesContainer').innerHTML = '';
  addGrammarRuleField();
  addGrammarExampleField();
  document.getElementById('grammarTopicModal').classList.add('active');
}

function editGrammarTopic(id) {
  const tp = teacherGrammarTopics.find(t => t.id === id);
  if (!tp) return;
  editingGrammarTopicId = id;
  document.getElementById('grammarTopicModalTitle').textContent = 'Sửa chủ điểm ngữ pháp';
  document.getElementById('grammarTopicIdField').value = id;
  document.getElementById('gtNameInput').value = tp.name;
  document.getElementById('gtLevelInput').value = tp.level;
  document.getElementById('gtColorInput').value = tp.color;
  document.getElementById('gtDescInput').value = tp.desc;
  // Rules
  document.getElementById('gtRulesContainer').innerHTML = '';
  tp.rules.forEach(r => addGrammarRuleField(r.title, r.formula, r.example));
  // Examples
  document.getElementById('gtExamplesContainer').innerHTML = '';
  tp.uses.forEach(u => addGrammarExampleField(u));
  document.getElementById('grammarTopicModal').classList.add('active');
}

function addGrammarRuleField(title = '', formula = '', example = '') {
  const container = document.getElementById('gtRulesContainer');
  const div = document.createElement('div');
  div.className = 'p-3 bg-gray-50 rounded-xl space-y-2 relative';
  div.innerHTML = `
    <button type="button" onclick="this.parentElement.remove()" class="absolute top-2 right-2 text-gray-400 hover:text-red-500"><i class="fas fa-times text-xs"></i></button>
    <input type="text" class="form-input text-sm" placeholder="Tên quy tắc (VD: Khẳng định)" value="${title}" />
    <input type="text" class="form-input text-sm font-mono" placeholder="Công thức (VD: S + V-ed)" value="${formula}" />
    <input type="text" class="form-input text-sm" placeholder="Ví dụ (VD: She walked to school.)" value="${example}" />
  `;
  container.appendChild(div);
}

function addGrammarExampleField(text = '') {
  const container = document.getElementById('gtExamplesContainer');
  const div = document.createElement('div');
  div.className = 'flex gap-2';
  div.innerHTML = `
    <input type="text" class="form-input text-sm flex-1" placeholder="VD: Hành động thường xuyên: I study every day." value="${text}" />
    <button type="button" onclick="this.parentElement.remove()" class="text-gray-400 hover:text-red-500 px-2"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(div);
}

function saveGrammarTopic() {
  const name = document.getElementById('gtNameInput').value.trim();
  if (!name) { showToast(t('errorMsg'), 'error'); return; }
  // Collect rules
  const rules = [];
  document.querySelectorAll('#gtRulesContainer > div').forEach(div => {
    const inputs = div.querySelectorAll('input');
    if (inputs[0].value.trim()) {
      rules.push({ title: inputs[0].value.trim(), formula: inputs[1].value.trim(), example: inputs[2].value.trim() });
    }
  });
  // Collect uses
  const uses = [];
  document.querySelectorAll('#gtExamplesContainer input').forEach(inp => {
    if (inp.value.trim()) uses.push(inp.value.trim());
  });
  const data = {
    name,
    level: document.getElementById('gtLevelInput').value,
    color: document.getElementById('gtColorInput').value,
    desc: document.getElementById('gtDescInput').value.trim(),
    rules,
    uses,
    tips: 'Luyện tập thường xuyên để nắm vững cấu trúc.',
    signal: [],
  };
  if (editingGrammarTopicId) {
    const idx = teacherGrammarTopics.findIndex(tp => tp.id === editingGrammarTopicId);
    if (idx !== -1) teacherGrammarTopics[idx] = { ...teacherGrammarTopics[idx], ...data };
    // sync to mockData
    const mi = mockData.grammarTopics.findIndex(tp => tp.id === editingGrammarTopicId);
    if (mi !== -1) mockData.grammarTopics[mi] = { ...mockData.grammarTopics[mi], ...data };
  } else {
    const newId = Date.now();
    const newTopic = { id: newId, ...data };
    teacherGrammarTopics.push(newTopic);
    mockData.grammarTopics.push(newTopic);
  }
  closeGrammarTopicModal();
  renderGrammarTopicsTable();
  showToast(t('successMsg'), 'success');
}

function deleteGrammarTopic(id) {
  openConfirmModal('Xóa chủ điểm này sẽ xóa cả bài tập liên quan. Tiếp tục?', () => {
    teacherGrammarTopics = teacherGrammarTopics.filter(tp => tp.id !== id);
    teacherGrammarExercises = teacherGrammarExercises.filter(e => e.topicId !== id);
    mockData.grammarTopics = mockData.grammarTopics.filter(tp => tp.id !== id);
    mockData.grammarExercises = mockData.grammarExercises.filter(e => e.topicId !== id);
    renderGrammarTopicsTable();
    showToast(t('successMsg'), 'success');
  });
}

function closeGrammarTopicModal() { document.getElementById('grammarTopicModal').classList.remove('active'); }

// --- Exercise CRUD ---
function openAddGrammarExModal() {
  editingGrammarExId = null;
  document.getElementById('grammarExModalTitle').textContent = 'Thêm bài tập ngữ pháp';
  document.getElementById('grammarExIdField').value = '';
  document.getElementById('grammarExModal').querySelector('form').reset();
  populateGrammarTopicSelect();
  updateExerciseTypeHint('multiple');
  document.getElementById('grammarExModal').classList.add('active');
}

function editGrammarEx(id) {
  const ex = teacherGrammarExercises.find(e => e.id === id);
  if (!ex) return;
  editingGrammarExId = id;
  document.getElementById('grammarExModalTitle').textContent = 'Sửa bài tập ngữ pháp';
  document.getElementById('grammarExIdField').value = id;
  populateGrammarTopicSelect();
  document.getElementById('geTopicInput').value = ex.topicId;
  document.getElementById('geTypeInput').value = ex.type;
  document.getElementById('geQuestionInput').value = ex.question;
  document.getElementById('geOpt0').value = ex.options[0] || '';
  document.getElementById('geOpt1').value = ex.options[1] || '';
  document.getElementById('geOpt2').value = ex.options[2] || '';
  document.getElementById('geOpt3').value = ex.options[3] || '';
  document.getElementById('geCorrectInput').value = ex.correct;
  document.getElementById('geExplainInput').value = ex.explain || '';
  updateExerciseTypeHint(ex.type);
  document.getElementById('grammarExModal').classList.add('active');
}

function populateGrammarTopicSelect() {
  const sel = document.getElementById('geTopicInput');
  sel.innerHTML = teacherGrammarTopics.map(tp => `<option value="${tp.id}">${tp.name}</option>`).join('');
}

function updateExerciseTypeHint(type) {
  const hints = {
    multiple: 'Học sinh chọn 1 trong 4 đáp án.',
    fill: 'Học sinh điền từ vào chỗ trống (___). Dùng ___ trong câu hỏi.',
    error: 'Học sinh tìm ra lỗi sai trong câu và chọn cách sửa đúng.',
  };
  const el = document.getElementById('geTypeHint');
  if (el) el.textContent = hints[type] || '';
}

function saveGrammarExercise() {
  const question = document.getElementById('geQuestionInput').value.trim();
  const opts = [
    document.getElementById('geOpt0').value.trim(),
    document.getElementById('geOpt1').value.trim(),
    document.getElementById('geOpt2').value.trim(),
    document.getElementById('geOpt3').value.trim(),
  ];
  if (!question || opts.some(o => !o)) { showToast('Vui lòng nhập đầy đủ câu hỏi và 4 đáp án!', 'error'); return; }
  const data = {
    topicId: parseInt(document.getElementById('geTopicInput').value),
    type: document.getElementById('geTypeInput').value,
    question,
    options: opts,
    correct: parseInt(document.getElementById('geCorrectInput').value),
    explain: document.getElementById('geExplainInput').value.trim(),
  };
  if (editingGrammarExId) {
    const idx = teacherGrammarExercises.findIndex(e => e.id === editingGrammarExId);
    if (idx !== -1) teacherGrammarExercises[idx] = { ...teacherGrammarExercises[idx], ...data };
    const mi = mockData.grammarExercises.findIndex(e => e.id === editingGrammarExId);
    if (mi !== -1) mockData.grammarExercises[mi] = { ...mockData.grammarExercises[mi], ...data };
  } else {
    const newId = Date.now();
    teacherGrammarExercises.push({ id: newId, ...data });
    mockData.grammarExercises.push({ id: newId, ...data });
  }
  closeGrammarExModal();
  renderGrammarExTable();
  showToast(t('successMsg'), 'success');
}

function deleteGrammarEx(id) {
  openConfirmModal(t('deleteWarning'), () => {
    teacherGrammarExercises = teacherGrammarExercises.filter(e => e.id !== id);
    mockData.grammarExercises = mockData.grammarExercises.filter(e => e.id !== id);
    renderGrammarExTable();
    showToast(t('successMsg'), 'success');
  });
}

function closeGrammarExModal() { document.getElementById('grammarExModal').classList.remove('active'); }

document.addEventListener('DOMContentLoaded', initTeacher);
