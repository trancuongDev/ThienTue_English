// student.js - Student Dashboard Logic
let currentStudent = null;
let currentSection = 'home';
let quizState = { current: 0, answers: [], started: false, finished: false };
let flashcardState = { current: 0, flipped: false };

function initStudent() {
  currentStudent = requireAuth('student');
  if (!currentStudent) return;

  document.getElementById('sidebarNav').innerHTML =
    '<div class="text-indigo-300 text-xs px-6 py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Đang tải dữ liệu...</div>';

  loadAllData().then(() => {
    renderSidebar();
    renderTopbar();
    navigateTo('home');
  }).catch(() => {
    renderSidebar();
    renderTopbar();
    navigateTo('home');
  });
}

function renderSidebar() {
  const nav = document.getElementById('sidebarNav');
  const items = [
    { id: 'home',         icon: 'fas fa-home',          key: 'home' },
    { id: 'lessons',      icon: 'fas fa-book-open',      key: 'lessons' },
    { id: 'materials',    icon: 'fas fa-photo-video',    key: 'materials' },
    { id: 'exercises',    icon: 'fas fa-pencil-alt',     key: 'exercises' },
    { id: 'grammar',      icon: 'fas fa-spell-check',    key: 'grammarTitle' },
    { id: 'vocabulary',   icon: 'fas fa-language',       key: 'vocabulary' },
    { id: 'attendance',   icon: 'fas fa-clipboard-check',key: 'attendance' },
    { id: 'leaderboard',  icon: 'fas fa-trophy',         key: 'leaderboard' },
    { id: 'schedule',     icon: 'fas fa-calendar-alt',   key: 'schedule' },
    { id: 'notifications',icon: 'fas fa-bell',           key: 'notifications' },
    { id: 'profile',      icon: 'fas fa-user-circle',    key: 'profile' },
  ];
  nav.innerHTML = items.map(item => `
    <a id="nav-${item.id}" onclick="navigateTo('${item.id}')" class="${currentSection === item.id ? 'active' : ''}">
      <i class="${item.icon}"></i>
      <span data-i18n="${item.key}">${t(item.key)}</span>
      ${item.id === 'notifications' ? `<span id="notifBadge" class="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center hidden"></span>` : ''}
    </a>
  `).join('');
  updateNotifBadge();
}

function updateNotifBadge() {
  const unread = mockData.notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notifBadge');
  if (badge) {
    if (unread > 0) {
      badge.textContent = unread;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function renderTopbar() {
  document.getElementById('topbarUserName').textContent = currentStudent.name;
  const initials = currentStudent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('topbarAvatar').textContent = initials;
}

function navigateTo(section) {
  currentSection = section;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  const navEl = document.getElementById('nav-' + section);
  if (navEl) navEl.classList.add('active');
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  const sectionEl = document.getElementById('section-' + section);
  if (sectionEl) {
    sectionEl.classList.add('active');
    sectionEl.classList.add('fade-in');
  }
  switch (section) {
    case 'home': renderHome(); break;
    case 'lessons':       renderLessons(); break;
    case 'materials':     renderMaterials(); break;
    case 'exercises':     renderExercises(); break;
    case 'grammar':       renderGrammar(); break;
    case 'vocabulary':    renderVocabulary(); break;
    case 'attendance':    renderAttendance(); break;
    case 'leaderboard':   renderLeaderboard(); break;
    case 'schedule':      renderSchedule(); break;
    case 'notifications': renderNotifications(); break;
    case 'profile': renderProfile(); break;
  }
  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// ===== HOME =====
function renderHome() {
  const student = mockData.students.find(s => s.name === currentStudent.name) || mockData.students[0];
  const todaySchedule = getTodaySchedule(student.class || 'A1');
  const today = new Date();
  const dayNames = [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday')];
  document.getElementById('homeGreeting').textContent = `${t('welcomeBack')}, ${currentStudent.name.split(' ').pop()}! 👋`;
  document.getElementById('homeDate').textContent = `${dayNames[today.getDay()]}, ${today.toLocaleDateString('vi-VN')}`;
  document.getElementById('progressBar').style.width = student.progress + '%';
  document.getElementById('progressPercent').textContent = student.progress + '%';
  document.getElementById('completedLessonsCount').textContent = Math.round(mockData.lessons.length * student.progress / 100) + '/' + mockData.lessons.length;
  document.getElementById('quizScoreDisplay').textContent = '7.5/10';
  document.getElementById('studyStreakDisplay').textContent = '12';

  const scheduleEl = document.getElementById('todayScheduleList');
  if (todaySchedule.length === 0) {
    scheduleEl.innerHTML = `<div class="text-center text-gray-400 py-4"><i class="fas fa-calendar-check text-3xl mb-2 block"></i><p data-i18n="noSchedule">${t('noSchedule')}</p></div>`;
  } else {
    scheduleEl.innerHTML = todaySchedule.map(s => `
      <div class="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
        <div class="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
          <i class="fas fa-${s.type === 'online' ? 'laptop' : 'school'} text-white text-sm"></i>
        </div>
        <div class="flex-1">
          <div class="font-semibold text-gray-800 text-sm">${s.topic}</div>
          <div class="text-xs text-gray-500">${s.time} &bull; ${s.type === 'online' ? t('online') : t('room') + ' ' + s.room}</div>
        </div>
        <span class="badge ${s.type === 'online' ? 'bg-cyan-100 text-cyan-700' : 'bg-indigo-100 text-indigo-700'}">${s.class}</span>
      </div>
    `).join('');
  }

  const notifEl = document.getElementById('homeNotifList');
  const recentNotifs = mockData.notifications.slice(0, 3);
  notifEl.innerHTML = recentNotifs.map(n => `
    <div class="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer" onclick="navigateTo('notifications')">
      <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${n.type === 'admin' ? 'bg-amber-100' : n.type === 'event' ? 'bg-rose-100' : 'bg-emerald-100'}">
        <i class="fas fa-${n.type === 'admin' ? 'bullhorn' : n.type === 'event' ? 'calendar-star' : 'chalkboard-teacher'} text-sm ${n.type === 'admin' ? 'text-amber-600' : n.type === 'event' ? 'text-rose-600' : 'text-emerald-600'}"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-semibold text-gray-800 flex items-center gap-2">
          ${n.title}
          ${!n.read ? '<span class="w-2 h-2 bg-red-500 rounded-full"></span>' : ''}
        </div>
        <div class="text-xs text-gray-500 truncate">${n.content.substring(0, 60)}...</div>
      </div>
    </div>
  `).join('');
}

// ===== LESSONS =====
function renderLessons(filter) {
  const filterEl = document.getElementById('lessonFilter');
  if (filterEl && filter !== undefined) filterEl.value = filter;
  const activeFilter = (filterEl ? filterEl.value : 'all') || 'all';
  let lessons = mockData.lessons;
  if (activeFilter !== 'all') lessons = lessons.filter(l => l.topic === activeFilter);

  document.getElementById('lessonGrid').innerHTML = lessons.map(lesson => `
    <div class="lesson-card">
      <div class="lesson-thumbnail">
        <i class="fas fa-${lesson.topic === 'grammar' ? 'spell-check' : lesson.topic === 'vocabulary' ? 'language' : lesson.topic === 'listening' ? 'headphones' : 'microphone'}"></i>
        <div class="absolute bottom-2 right-2">
          <span class="badge ${getLevelColor(lesson.level)} text-xs">${t(lesson.level)}</span>
        </div>
        <div class="absolute top-2 left-2">
          <span class="badge ${getTopicColor(lesson.topic)} text-xs">${t(lesson.topic + 'Topic') || t(lesson.topic)}</span>
        </div>
      </div>
      <div class="p-4">
        <h3 class="font-bold text-gray-900 mb-1">${lesson.title}</h3>
        <p class="text-xs text-gray-500 mb-3 line-clamp-2">${lesson.description}</p>
        <div class="flex items-center gap-3 text-xs text-gray-400 mb-4">
          <span><i class="fas fa-user mr-1"></i>${lesson.teacher}</span>
          <span><i class="fas fa-clock mr-1"></i>${lesson.duration} ${t('minutes')}</span>
        </div>
        <div class="flex gap-2">
          <button onclick="openVideoModal('${lesson.videoUrl}', '${lesson.title}')" class="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-1">
            <i class="fas fa-play"></i> ${t('watchVideo')}
          </button>
          <button onclick="showToast('${t('download')}: ${lesson.document}', 'success')" class="btn-outline py-2 px-3 text-sm flex items-center gap-1">
            <i class="fas fa-download"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('') || `<div class="col-span-2 text-center text-gray-400 py-8"><i class="fas fa-search text-3xl mb-2 block"></i><p>${t('noData')}</p></div>`;
}

function openVideoModal(url, title) {
  document.getElementById('videoModalTitle').textContent = title;
  document.getElementById('videoIframe').src = url;
  document.getElementById('videoModal').classList.add('active');
}

function closeVideoModal() {
  document.getElementById('videoModal').classList.remove('active');
  document.getElementById('videoIframe').src = '';
}

// ===== EXERCISES / QUIZ =====
function renderExercises() {
  quizState = { current: 0, answers: [], started: false, finished: false };
  document.getElementById('quizStart').classList.remove('hidden');
  document.getElementById('quizQuestion').classList.add('hidden');
  document.getElementById('quizResult').classList.add('hidden');
}

function startQuiz() {
  quizState = { current: 0, answers: new Array(mockData.quizQuestions.length).fill(null), started: true, finished: false };
  document.getElementById('quizStart').classList.add('hidden');
  document.getElementById('quizQuestion').classList.remove('hidden');
  document.getElementById('quizResult').classList.add('hidden');
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const q = mockData.quizQuestions[quizState.current];
  const total = mockData.quizQuestions.length;
  document.getElementById('quizQNum').textContent = `${t('question')} ${quizState.current + 1} ${t('of')} ${total}`;
  document.getElementById('quizQText').textContent = q.question;
  document.getElementById('quizProgress').style.width = ((quizState.current + 1) / total * 100) + '%';

  const optionsEl = document.getElementById('quizOptions');
  optionsEl.innerHTML = q.options.map((opt, i) => `
    <div class="quiz-option ${quizState.answers[quizState.current] === i ? 'selected' : ''}"
         onclick="selectAnswer(${i})">
      <span class="font-semibold mr-2 text-indigo-600">${String.fromCharCode(65 + i)}.</span>${opt}
    </div>
  `).join('');

  document.getElementById('quizPrevBtn').disabled = quizState.current === 0;
  document.getElementById('quizNextBtn').textContent = quizState.current === total - 1 ? t('finishQuiz') : t('next');
  document.getElementById('quizNextBtn').onclick = quizState.current === total - 1 ? finishQuiz : nextQuestion;
}

function selectAnswer(index) {
  quizState.answers[quizState.current] = index;
  document.querySelectorAll('.quiz-option').forEach((el, i) => {
    el.classList.toggle('selected', i === index);
  });
}

function nextQuestion() {
  if (quizState.current < mockData.quizQuestions.length - 1) {
    quizState.current++;
    renderQuizQuestion();
  }
}

function prevQuestion() {
  if (quizState.current > 0) {
    quizState.current--;
    renderQuizQuestion();
  }
}

function finishQuiz() {
  quizState.finished = true;
  let correct = 0;
  quizState.answers.forEach((ans, i) => {
    if (ans === mockData.quizQuestions[i].correct) correct++;
  });

  document.getElementById('quizQuestion').classList.add('hidden');
  document.getElementById('quizResult').classList.remove('hidden');

  const score = correct;
  const total = mockData.quizQuestions.length;
  const percent = Math.round(score / total * 100);
  const grade = percent >= 80 ? t('excellent') : percent >= 60 ? t('good') : t('needPractice');
  const gradeColor = percent >= 80 ? 'text-emerald-600' : percent >= 60 ? 'text-amber-600' : 'text-red-600';

  document.getElementById('quizResultContent').innerHTML = `
    <div class="text-center mb-6">
      <div class="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${percent >= 80 ? 'bg-emerald-100' : percent >= 60 ? 'bg-amber-100' : 'bg-red-100'}">
        <span class="text-3xl font-black ${gradeColor}">${score}/${total}</span>
      </div>
      <h3 class="text-xl font-bold ${gradeColor}">${grade}</h3>
      <p class="text-gray-500">${t('yourScore')}: ${percent}%</p>
    </div>
    <div class="space-y-3">
      ${mockData.quizQuestions.map((q, i) => `
        <div class="p-3 rounded-xl border ${quizState.answers[i] === q.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}">
          <div class="flex items-start gap-2">
            <i class="fas fa-${quizState.answers[i] === q.correct ? 'check-circle text-emerald-500' : 'times-circle text-red-500'} mt-0.5 flex-shrink-0"></i>
            <div class="flex-1">
              <p class="text-sm font-semibold text-gray-800">${i + 1}. ${q.question}</p>
              <p class="text-xs text-gray-600 mt-1">
                ${t('correct')}: <span class="font-medium text-emerald-700">${q.options[q.correct]}</span>
              </p>
              ${quizState.answers[i] !== q.correct ? `<p class="text-xs text-red-600">Bạn chọn: ${quizState.answers[i] !== null ? q.options[quizState.answers[i]] : 'Không trả lời'}</p>` : ''}
              <p class="text-xs text-gray-500 mt-1 italic">${q.explanation}</p>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ===== VOCABULARY =====
function renderVocabulary() {
  flashcardState = { current: 0, flipped: false };
  renderFlashcard();
  // Render vocab list
  setTimeout(() => {
    const el = document.getElementById('vocabListEl');
    if (el) {
      el.innerHTML = mockData.vocabulary.map((v, i) => `
        <div onclick="flashcardState.current=${i};renderFlashcard()" class="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-200">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">${i+1}</div>
          <div class="flex-1 min-w-0">
            <span class="font-semibold text-gray-900 text-sm">${v.word}</span>
            <span class="text-gray-400 text-xs ml-2">${v.pronunciation}</span>
          </div>
          <span class="text-gray-500 text-xs hidden sm:block">${v.meaning}</span>
        </div>
      `).join('');
    }
  }, 50);
}

function renderFlashcard() {
  const card = mockData.vocabulary[flashcardState.current];
  const total = mockData.vocabulary.length;
  flashcardState.flipped = false;

  document.getElementById('flashcardEl').classList.remove('flipped');
  document.getElementById('flashcardWord').textContent = card.word;
  document.getElementById('flashcardPronun').textContent = card.pronunciation;
  document.getElementById('flashcardHint').textContent = t('clickToFlip');
  document.getElementById('flashcardMeaning').textContent = card.meaning;
  document.getElementById('flashcardMeaningEn').textContent = card.meaning_en;
  document.getElementById('flashcardExample').textContent = card.example;
  document.getElementById('flashcardCounter').textContent = `${t('cardOf')} ${flashcardState.current + 1} / ${total}`;
  document.getElementById('flashcardProgressFill').style.width = ((flashcardState.current + 1) / total * 100) + '%';
  document.getElementById('prevCardBtn').disabled = flashcardState.current === 0;
  document.getElementById('nextCardBtn').disabled = flashcardState.current === total - 1;
}

function flipCard() {
  flashcardState.flipped = !flashcardState.flipped;
  const el = document.getElementById('flashcardEl');
  el.classList.toggle('flipped', flashcardState.flipped);
  const currentCard = mockData.vocabulary[flashcardState.current];
  const hint = document.getElementById('flashcardHint');
  if (hint) hint.textContent = flashcardState.flipped ? (currentCard.category || '') : t('clickToFlip');
}

function prevCard() {
  if (flashcardState.current > 0) {
    flashcardState.current--;
    renderFlashcard();
  }
}

function nextCard() {
  if (flashcardState.current < mockData.vocabulary.length - 1) {
    flashcardState.current++;
    renderFlashcard();
  }
}

// ===== SCHEDULE =====
function renderSchedule() {
  const student = mockData.students.find(s => s.name === currentStudent.name) || mockData.students[0];
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const today = new Date().getDay();
  const grid = document.getElementById('scheduleGrid');
  grid.innerHTML = '';

  for (let d = 1; d <= 7; d++) {
    const dayIdx = d === 7 ? 0 : d;
    const daySchedule = mockData.schedule.filter(s => s.day === dayIdx && s.class === (student.class || 'A1'));
    const isToday = dayIdx === today;
    const col = document.createElement('div');
    col.className = `rounded-xl p-3 ${isToday ? 'bg-indigo-50 ring-2 ring-indigo-300' : 'bg-white'} shadow-sm`;
    col.innerHTML = `
      <div class="text-center mb-2">
        <div class="text-xs font-bold ${isToday ? 'text-indigo-600' : 'text-gray-500'} uppercase tracking-wide">${t(days[dayIdx])}</div>
        ${isToday ? '<div class="text-xs text-indigo-400 font-medium">' + t('today') + '</div>' : ''}
      </div>
      ${daySchedule.length > 0 ? daySchedule.map(s => `
        <div class="schedule-cell ${s.type === 'online' ? 'bg-cyan-100 text-cyan-800' : 'bg-indigo-100 text-indigo-800'}">
          <div class="font-semibold">${s.topic.substring(0, 18)}${s.topic.length > 18 ? '...' : ''}</div>
          <div class="text-xs mt-0.5">${s.time}</div>
          <div class="text-xs">${s.type === 'online' ? t('online') : t('room') + ' ' + s.room}</div>
        </div>
      `).join('') : `<div class="text-center text-gray-300 text-xs py-4"><i class="fas fa-minus-circle text-xl block mb-1"></i>Trống</div>`}
    `;
    grid.appendChild(col);
  }
}

// ===== NOTIFICATIONS =====
function renderNotifications() {
  const list = document.getElementById('notifList');
  list.innerHTML = mockData.notifications.map(n => `
    <div class="notif-item ${!n.read ? 'unread' : ''} ${n.type}" id="notif-${n.id}">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3 flex-1">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${n.type === 'admin' ? 'bg-amber-100' : n.type === 'event' ? 'bg-rose-100' : 'bg-emerald-100'}">
            <i class="fas fa-${n.type === 'admin' ? 'bullhorn' : n.type === 'event' ? 'calendar-star' : 'chalkboard-teacher'} ${n.type === 'admin' ? 'text-amber-600' : n.type === 'event' ? 'text-rose-600' : 'text-emerald-600'}"></i>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <h4 class="font-bold text-gray-900 text-sm">${n.title}</h4>
              ${!n.read ? '<span class="badge bg-red-100 text-red-600">' + t('unread') + '</span>' : ''}
            </div>
            <p class="text-sm text-gray-600">${n.content}</p>
            <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span><i class="fas fa-user mr-1"></i>${t('from')}: ${n.from}</span>
              <span><i class="fas fa-clock mr-1"></i>${formatDate(n.date)}</span>
            </div>
          </div>
        </div>
        ${!n.read ? `<button onclick="markNotifRead(${n.id})" class="btn-outline text-xs px-2 py-1 whitespace-nowrap">${t('markRead')}</button>` : ''}
      </div>
    </div>
  `).join('') || `<div class="text-center text-gray-400 py-8"><i class="fas fa-bell-slash text-3xl mb-2 block"></i>${t('noNotif')}</div>`;
}

function markNotifRead(id) {
  const notif = mockData.notifications.find(n => n.id === id);
  if (notif) {
    notif.read = true;
    // Ghi lên Supabase (fire & forget)
    Notifications.markRead(id).catch(() => {});
    renderNotifications();
    updateNotifBadge();
  }
}

// ===== PROFILE =====
function renderProfile() {
  const student = mockData.students.find(s => s.name === currentStudent.name) || mockData.students[0];
  const initials = currentStudent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('profileAvatar').textContent = initials;
  document.getElementById('profileName').textContent = student.name;
  document.getElementById('profileClass').textContent = student.class;
  // Edit mode inputs
  document.getElementById('profileEmail').value = student.email;
  document.getElementById('profilePhone').value = student.phone;
  document.getElementById('profileBirthday').value = student.birthday;
  document.getElementById('profileAddress').value = student.address;
  // View mode displays
  const emailView = document.getElementById('profileEmailView');
  const phoneView = document.getElementById('profilePhoneView');
  const birthdayView = document.getElementById('profileBirthdayView');
  const addressView = document.getElementById('profileAddressView');
  if (emailView) emailView.textContent = student.email;
  if (phoneView) phoneView.textContent = student.phone;
  if (birthdayView) birthdayView.textContent = formatDate(student.birthday);
  if (addressView) addressView.textContent = student.address;
  document.getElementById('profileJoinDate').textContent = formatDate(student.joinDate);
  document.getElementById('profileProgress').style.width = student.progress + '%';
  document.getElementById('profileProgressText').textContent = student.progress + '%';
  // Ensure view mode is shown by default
  document.getElementById('profileViewMode').classList.remove('hidden');
  document.getElementById('profileEditMode').classList.add('hidden');
}

function saveProfile() {
  showToast(t('successMsg'), 'success');
  document.getElementById('profileEditMode').classList.add('hidden');
  document.getElementById('profileViewMode').classList.remove('hidden');
}

function toggleProfileEdit() {
  document.getElementById('profileEditMode').classList.toggle('hidden');
  document.getElementById('profileViewMode').classList.toggle('hidden');
}

// ===== MATERIALS (Video & Tài liệu) =====
let materialsFilter = 'all';
let _loadedMaterials = null;

async function renderMaterials() {
  materialsFilter = 'all';
  updateMaterialsFilterBtns();
  const student = mockData.students.find(s => s.name === currentStudent.name) || { class: '' };
  const myClass = student.class || '';
  const label = document.getElementById('materialsClassLabel');
  if (label) label.textContent = myClass
    ? `Lớp ${myClass} — hiển thị tài nguyên dành cho lớp bạn và tài nguyên chung`
    : 'Hiển thị tất cả tài nguyên';

  // Load từ Supabase lần đầu
  if (!_loadedMaterials) {
    document.getElementById('materialsGrid').innerHTML =
      '<div class="col-span-3 text-center text-gray-400 py-12"><i class="fas fa-spinner fa-spin text-3xl mb-3 block"></i>Đang tải...</div>';
    try {
      const rows = await Materials.getAll();
      _loadedMaterials = rows.map(mapMaterial);
    } catch(e) {
      _loadedMaterials = getDefaultMaterials();
    }
  }
  renderMaterialsGrid(myClass, _loadedMaterials);
}

function filterMaterials(type) {
  materialsFilter = type;
  updateMaterialsFilterBtns();
  const student = mockData.students.find(s => s.name === currentStudent.name) || { class: '' };
  renderMaterialsGrid(student.class || '', _loadedMaterials || getDefaultMaterials());
}

function updateMaterialsFilterBtns() {
  ['all','video','doc'].forEach(f => {
    const btn = document.getElementById('matFilter' + f.charAt(0).toUpperCase() + f.slice(1));
    if (!btn) return;
    btn.className = `px-4 py-2 rounded-xl font-semibold text-sm transition-colors flex items-center gap-1 ${materialsFilter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-indigo-50'}`;
  });
}

function renderMaterialsGrid(myClass, items) {
  if (!items) items = getDefaultMaterials();

  const topicLabel = { grammar:'Ngữ pháp', vocabulary:'Từ vựng', listening:'Nghe', speaking:'Nói', other:'Khác' };
  const topicColor = { grammar:'bg-indigo-100 text-indigo-700', vocabulary:'bg-emerald-100 text-emerald-700', listening:'bg-amber-100 text-amber-700', speaking:'bg-rose-100 text-rose-700', other:'bg-gray-100 text-gray-600' };
  const fileIcon = { pdf:'fa-file-pdf text-red-500', word:'fa-file-word text-blue-500', ppt:'fa-file-powerpoint text-orange-500', other:'fa-file text-gray-500' };
  const fileBg   = { pdf:'bg-red-100', word:'bg-blue-100', ppt:'bg-orange-100', other:'bg-gray-100' };

  const list = items.filter(item => {
    const forMyClass = item.classes && (item.classes.includes('all') || item.classes.includes(myClass));
    const typeOk = materialsFilter === 'all' || item.type === materialsFilter;
    return forMyClass && typeOk;
  });

  const grid = document.getElementById('materialsGrid');
  if (list.length === 0) {
    grid.innerHTML = `<div class="col-span-3 text-center text-gray-400 py-12 bg-white rounded-2xl shadow-sm">
      <i class="fas fa-inbox text-4xl mb-3 block"></i>
      <p>Chưa có tài nguyên nào cho lớp ${myClass}</p></div>`;
    return;
  }

  grid.innerHTML = list.map(item => {
    if (item.type === 'video') {
      const embedUrl = (item.url || '').replace('watch?v=','embed/').replace('youtu.be/','www.youtube.com/embed/');
      return `
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all duration-200">
          <div class="relative aspect-video bg-gray-900">
            <iframe src="${embedUrl}" class="w-full h-full" frameborder="0" allowfullscreen></iframe>
            <div class="absolute top-2 left-2 flex gap-1">
              <span class="badge bg-indigo-600 text-white text-xs"><i class="fas fa-video mr-1"></i>Video</span>
              ${item.topic ? `<span class="badge ${topicColor[item.topic]||'bg-gray-100 text-gray-600'} text-xs">${topicLabel[item.topic]||item.topic}</span>` : ''}
            </div>
            ${item.classes && !item.classes.includes('all') ? `<div class="absolute top-2 right-2"><span class="badge bg-white/90 text-indigo-700 text-xs font-bold">${item.classes.join(', ')}</span></div>` : ''}
          </div>
          <div class="p-4">
            <h4 class="font-bold text-gray-900 mb-1">${item.title}</h4>
            <p class="text-xs text-gray-500 mb-3 line-clamp-2">${item.desc || ''}</p>
            <div class="flex items-center justify-between text-xs text-gray-400">
              <span><i class="fas fa-user mr-1"></i>${item.teacher || ''}</span>
              <span><i class="fas fa-calendar mr-1"></i>${formatDate(item.date)}</span>
            </div>
            <a href="${item.url}" target="_blank" class="btn-primary w-full mt-3 py-2 text-sm flex items-center justify-center gap-2">
              <i class="fas fa-play"></i> Xem video
            </a>
          </div>
        </div>`;
    } else {
      const ft = item.fileType || 'other';
      return `
        <div class="bg-white rounded-2xl shadow-sm p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-200 flex flex-col">
          <div class="flex items-start gap-3 mb-3">
            <div class="w-12 h-12 ${fileBg[ft]||'bg-gray-100'} rounded-xl flex items-center justify-center flex-shrink-0">
              <i class="fas ${fileIcon[ft]||fileIcon.other} text-xl"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <span class="badge bg-gray-100 text-gray-600 text-xs uppercase">${ft}</span>
                ${item.classes && !item.classes.includes('all') ? `<span class="badge bg-indigo-100 text-indigo-700 text-xs">${item.classes.join(', ')}</span>` : ''}
              </div>
              <h4 class="font-bold text-gray-900 text-sm">${item.title}</h4>
            </div>
          </div>
          <p class="text-xs text-gray-500 flex-1 mb-3">${item.desc || ''}</p>
          <div class="flex items-center justify-between text-xs text-gray-400 mb-3">
            <span><i class="fas fa-user mr-1"></i>${item.teacher || ''}</span>
            <span><i class="fas fa-calendar mr-1"></i>${formatDate(item.date)}</span>
          </div>
          <button onclick="showToast('Đang tải: ${item.title}', 'success')" class="btn-outline w-full py-2 text-sm flex items-center justify-center gap-2">
            <i class="fas fa-download"></i> Tải xuống
          </button>
        </div>`;
    }
  }).join('');
}

function getDefaultMaterials() {
  return [];
}

// ===== ATTENDANCE =====
async function renderAttendance() {
  const monthSel = document.getElementById('attendanceMonthFilter');
  const now = new Date();
  if (monthSel && !monthSel._initialized) {
    monthSel.value = now.getMonth() + 1;
    monthSel._initialized = true;
  }
  const month  = parseInt(monthSel ? monthSel.value : now.getMonth() + 1);
  const year   = now.getFullYear();
  const student = mockData.students.find(s => s.name === currentStudent.name);

  // Hiển thị loading
  document.getElementById('attendanceSummary').innerHTML =
    '<div class="col-span-4 text-center text-gray-400 py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Đang tải...</div>';

  // Load điểm danh từ Supabase nếu có student ID
  if (student) {
    try {
      const rows = await Attendance.getByStudent(student.id);
      // Cập nhật mockData.attendance với dữ liệu mới nhất
      mockData.attendance = mockData.attendance.filter(a => a.studentId !== student.id);
      rows.forEach(r => mockData.attendance.push(mapAttendance(r)));
    } catch(e) { /* dùng dữ liệu local nếu lỗi */ }
  }

  _renderAttendanceUI(month, year, student);
}

function _renderAttendanceUI(month, year, student) {
  if (!student) {
    document.getElementById('attendanceSummary').innerHTML =
      '<div class="col-span-4 text-center text-gray-400 py-4">Không tìm thấy học sinh</div>';
    return;
  }
  const records = mockData.attendance.filter(a => {
    if (String(a.studentId) !== String(student.id)) return false;
    const d = new Date(a.date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const total   = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const late    = records.filter(r => r.status === 'late').length;
  const absent  = records.filter(r => r.status === 'absent').length;
  const rate    = total > 0 ? Math.round((present + late) / total * 100) : 0;

  document.getElementById('attendanceSummary').innerHTML = `
    <div class="stat-card text-center py-4">
      <div class="text-3xl font-black text-indigo-600">${total}</div>
      <div class="text-xs text-gray-500 mt-1">Tổng buổi học</div>
    </div>
    <div class="stat-card text-center py-4">
      <div class="text-3xl font-black text-emerald-600">${present}</div>
      <div class="text-xs text-gray-500 mt-1">Có mặt</div>
    </div>
    <div class="stat-card text-center py-4">
      <div class="text-3xl font-black text-amber-500">${late}</div>
      <div class="text-xs text-gray-500 mt-1">Đi muộn</div>
    </div>
    <div class="stat-card text-center py-4">
      <div class="text-3xl font-black ${absent > 0 ? 'text-red-500' : 'text-gray-400'}">${absent}</div>
      <div class="text-xs text-gray-500 mt-1">Vắng mặt</div>
      <div class="progress-bar mt-2 mx-auto w-16">
        <div class="progress-fill" style="width:${rate}%;background:${rate>=80?'#10B981':rate>=60?'#F59E0B':'#EF4444'}"></div>
      </div>
      <div class="text-xs font-bold mt-1 ${rate>=80?'text-emerald-600':rate>=60?'text-amber-600':'text-red-500'}">${rate}% đi học</div>
    </div>
  `;

  // Calendar
  const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                      'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  document.getElementById('attendanceCalendarTitle').textContent = `${monthNames[month-1]} ${year}`;
  document.getElementById('attendanceCalendarHeader').innerHTML =
    ['CN','T2','T3','T4','T5','T6','T7'].map(d =>
      `<div class="text-center text-xs font-bold text-gray-400 py-1">${d}</div>`
    ).join('');

  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const statusMap   = {};
  records.forEach(r => { statusMap[r.date] = r.status; });
  const today = new Date().toISOString().split('T')[0];

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += `<div></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds  = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const s   = statusMap[ds];
    const isT = ds === today;
    const base = 'w-full aspect-square flex items-center justify-center rounded-lg text-xs font-semibold';
    const cls  = s === 'present' ? `${base} bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300`
               : s === 'late'    ? `${base} bg-amber-100 text-amber-700 ring-1 ring-amber-300`
               : s === 'absent'  ? `${base} bg-red-100 text-red-600 ring-1 ring-red-300`
               : `${base} ${isT ? 'ring-2 ring-indigo-400 text-indigo-600' : 'text-gray-400'}`;
    cells += `<div class="${cls}">${d}</div>`;
  }
  document.getElementById('attendanceCalendarBody').innerHTML = cells;

  // Session list
  document.getElementById('attendanceSessionList').innerHTML = `
    <div class="flex flex-wrap gap-3 mb-4">
      <span class="flex items-center gap-1.5 text-xs"><span class="w-4 h-4 bg-emerald-100 rounded border border-emerald-300 inline-block"></span>Có mặt</span>
      <span class="flex items-center gap-1.5 text-xs"><span class="w-4 h-4 bg-amber-100 rounded border border-amber-300 inline-block"></span>Đi muộn</span>
      <span class="flex items-center gap-1.5 text-xs"><span class="w-4 h-4 bg-red-100 rounded border border-red-300 inline-block"></span>Vắng mặt</span>
    </div>
    ${records.length === 0
      ? `<p class="text-gray-400 text-center py-4">Chưa có dữ liệu tháng này</p>`
      : [...records].sort((a,b) => a.date > b.date ? 1 : -1).map(r => `
          <div class="flex items-center gap-3 p-3 rounded-xl ${r.status==='present'?'bg-emerald-50':r.status==='late'?'bg-amber-50':'bg-red-50'}">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
              ${r.status==='present'?'bg-emerald-100':r.status==='late'?'bg-amber-100':'bg-red-100'}">
              <i class="fas fa-${r.status==='present'?'check text-emerald-600':r.status==='late'?'clock text-amber-600':'times text-red-500'}"></i>
            </div>
            <div class="flex-1">
              <p class="font-semibold text-sm text-gray-900">${formatDate(r.date)} — Lớp ${r.class}</p>
              ${r.note ? `<p class="text-xs text-gray-500">${r.note}</p>` : ''}
            </div>
            <span class="badge ${r.status==='present'?'bg-emerald-100 text-emerald-700':r.status==='late'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}">
              ${r.status==='present'?'Có mặt':r.status==='late'?'Đi muộn':'Vắng mặt'}
            </span>
          </div>`).join('')}
  `;
}

// ===== LEADERBOARD =====
function renderLeaderboard() {
  const filter = document.getElementById('leaderboardFilter')?.value || 'progress';
  const colLabels = { progress:'Tiến trình', attendance:'Tỷ lệ đi học', quiz:'Điểm TB' };
  const el = document.getElementById('leaderboardColLabel');
  if (el) el.textContent = colLabels[filter];

  const student = mockData.students.find(s => s.name === currentStudent.name) || mockData.students[0];

  // Build sorted list
  let list = mockData.students.map(s => {
    // Attendance rate
    const att = mockData.attendance.filter(a => a.studentId === s.id);
    const attRate = att.length > 0 ? Math.round((att.filter(a=>a.status!=='absent').length / att.length)*100) : Math.floor(70 + Math.random()*30);
    // Quiz score mock
    const quizScore = parseFloat((6 + Math.random()*4).toFixed(1));
    return { ...s, attRate, quizScore };
  });

  if (filter === 'progress')   list.sort((a,b) => b.progress - a.progress);
  if (filter === 'attendance') list.sort((a,b) => b.attRate - a.attRate);
  if (filter === 'quiz')       list.sort((a,b) => b.quizScore - a.quizScore);

  const getValue = s => filter === 'progress' ? s.progress + '%'
                      : filter === 'attendance' ? s.attRate + '%'
                      : s.quizScore + '/10';

  const getBar = s => {
    const v = filter === 'progress' ? s.progress : filter === 'attendance' ? s.attRate : s.quizScore * 10;
    return `<div class="progress-bar w-24 inline-block align-middle mr-2"><div class="progress-fill" style="width:${v}%"></div></div>`;
  };

  // Podium (top 3)
  const podium = list.slice(0, 3);
  const podiumOrder = podium.length >= 3 ? [podium[1], podium[0], podium[2]] : podium;
  const podiumH = ['h-24','h-32','h-20'];
  const podiumRank = podium.length >= 3 ? [2,1,3] : [1,2,3];
  const podiumColor = ['bg-gray-300','bg-amber-400','bg-orange-300'];
  const medalIcon = ['🥈','🥇','🥉'];

  document.getElementById('leaderboardPodium').innerHTML = podiumOrder.map((s, i) => {
    const isMe = s.id === student.id;
    const initials = s.name.split(' ').pop()[0];
    return `
      <div class="flex flex-col items-center">
        <div class="text-2xl mb-1">${medalIcon[i]}</div>
        <div class="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-lg mb-1 ring-4
          ${isMe ? 'ring-indigo-400 bg-indigo-600' : `ring-white ${['bg-gray-400','bg-amber-500','bg-orange-400'][i]}`}">
          ${initials}
        </div>
        <p class="text-xs font-bold text-gray-800 text-center max-w-16 truncate">${s.name.split(' ').slice(-2).join(' ')}</p>
        <p class="text-xs font-black text-indigo-600">${getValue(s)}</p>
        <div class="${podiumColor[i]} w-20 ${podiumH[i]} mt-2 rounded-t-xl flex items-center justify-center">
          <span class="text-white font-black text-xl">${podiumRank[i]}</span>
        </div>
      </div>`;
  }).join('');

  // Full table
  document.getElementById('leaderboardBody').innerHTML = list.map((s, i) => {
    const isMe = s.id === student.id;
    const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<span class="font-bold text-gray-500">${i+1}</span>`;
    const levelLabel = { beginner:'Cơ bản', intermediate:'Trung cấp', advanced:'Nâng cao' };
    return `
      <tr class="${isMe ? 'bg-indigo-50 font-semibold' : ''}">
        <td class="text-center text-lg">${rankIcon}</td>
        <td>
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0
              ${isMe ? 'bg-indigo-600' : 'bg-gray-400'}">
              ${s.name.split(' ').pop()[0]}
            </div>
            <div>
              <p class="font-semibold text-gray-900 text-sm">${s.name} ${isMe ? '<span class="badge bg-indigo-100 text-indigo-700 text-xs ml-1">Bạn</span>' : ''}</p>
              <p class="text-xs text-gray-400">${s.status === 'active' ? 'Đang học' : 'Nghỉ học'}</p>
            </div>
          </div>
        </td>
        <td><span class="badge bg-indigo-100 text-indigo-700">${s.class}</span></td>
        <td>
          <div class="flex items-center gap-2">
            ${getBar(s)}
            <span class="font-bold text-sm ${i<3?'text-amber-600':'text-gray-700'}">${getValue(s)}</span>
          </div>
        </td>
        <td class="text-gray-500 text-sm">${formatDate(s.joinDate)}</td>
      </tr>`;
  }).join('');
}

// ===== GRAMMAR =====
let grammarState = {
  activeTab: 'theory',
  activeTopic: 0,
  practiceTopicId: null,
  practiceQuestions: [],
  practiceAnswers: [],
  practiceCurrent: 0,
  practiceAnswered: false,
};

const colorMap = {
  indigo:  { bg: 'bg-indigo-600',  light: 'bg-indigo-50',  border: 'border-indigo-300',  text: 'text-indigo-700',  badge: 'bg-indigo-100 text-indigo-700' },
  emerald: { bg: 'bg-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  amber:   { bg: 'bg-amber-500',   light: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700' },
  rose:    { bg: 'bg-rose-500',    light: 'bg-rose-50',    border: 'border-rose-300',    text: 'text-rose-700',    badge: 'bg-rose-100 text-rose-700' },
  cyan:    { bg: 'bg-cyan-600',    light: 'bg-cyan-50',    border: 'border-cyan-300',    text: 'text-cyan-700',    badge: 'bg-cyan-100 text-cyan-700' },
  purple:  { bg: 'bg-purple-600',  light: 'bg-purple-50',  border: 'border-purple-300',  text: 'text-purple-700',  badge: 'bg-purple-100 text-purple-700' },
};

function renderGrammar() {
  grammarState.activeTab = 'theory';
  document.getElementById('grammarTheoryTab').classList.remove('hidden');
  document.getElementById('grammarPracticeTab').classList.add('hidden');
  document.getElementById('grammarTabTheory').className = 'px-4 py-2 rounded-xl font-semibold text-sm bg-indigo-600 text-white transition-colors';
  document.getElementById('grammarTabPractice').className = 'px-4 py-2 rounded-xl font-semibold text-sm bg-gray-100 text-gray-600 hover:bg-indigo-50 transition-colors';
  renderGrammarTopicButtons();
  renderGrammarTheory(0);
}

function switchGrammarTab(tab) {
  grammarState.activeTab = tab;
  const isTheory = tab === 'theory';
  document.getElementById('grammarTheoryTab').classList.toggle('hidden', !isTheory);
  document.getElementById('grammarPracticeTab').classList.toggle('hidden', isTheory);
  document.getElementById('grammarTabTheory').className = `px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${isTheory ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-indigo-50'}`;
  document.getElementById('grammarTabPractice').className = `px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${!isTheory ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-indigo-50'}`;
  if (!isTheory) renderGrammarExerciseCards();
}

function renderGrammarTopicButtons() {
  const topics = mockData.grammarTopics;
  const container = document.getElementById('grammarTopicBtns');
  container.innerHTML = topics.map((tp, i) => {
    const c = colorMap[tp.color] || colorMap.indigo;
    const isActive = i === grammarState.activeTopic;
    return `<button onclick="renderGrammarTheory(${i})"
      class="px-4 py-2 rounded-xl font-semibold text-sm border-2 transition-all ${isActive ? c.bg + ' text-white border-transparent' : 'bg-white ' + c.text + ' ' + c.border + ' hover:' + c.light}">
      ${tp.name}
    </button>`;
  }).join('');
}

function renderGrammarTheory(index) {
  grammarState.activeTopic = index;
  renderGrammarTopicButtons();
  const tp = mockData.grammarTopics[index];
  if (!tp) return;
  const c = colorMap[tp.color] || colorMap.indigo;
  const levelLabel = { beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' }[tp.level] || tp.level;
  const levelColor = { beginner: 'bg-green-100 text-green-700', intermediate: 'bg-yellow-100 text-yellow-700', advanced: 'bg-red-100 text-red-700' }[tp.level];

  document.getElementById('grammarTheoryContent').innerHTML = `
    <div class="fade-in">
      <!-- Header -->
      <div class="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="w-16 h-16 ${c.bg} rounded-2xl flex items-center justify-center flex-shrink-0">
            <i class="fas fa-spell-check text-white text-2xl"></i>
          </div>
          <div class="flex-1">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <h2 class="text-2xl font-black text-gray-900">${tp.name}</h2>
              <span class="badge ${levelColor}">${levelLabel}</span>
            </div>
            <p class="text-gray-600">${tp.desc}</p>
          </div>
          <button onclick="switchGrammarTab('practice');setTimeout(()=>startGrammarPractice(${tp.id}),100)"
            class="btn-primary flex items-center gap-2 px-5 py-2.5 whitespace-nowrap flex-shrink-0">
            <i class="fas fa-pencil-alt"></i> Luyện tập ngay
          </button>
        </div>
      </div>

      <!-- Rules / Formulas -->
      <div class="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <h3 class="font-black text-gray-900 mb-4 flex items-center gap-2">
          <i class="fas fa-function ${c.text}"></i>
          <span data-i18n="grammarFormula">Công thức & Cấu trúc</span>
        </h3>
        <div class="space-y-3">
          ${tp.rules.map(r => `
            <div class="rounded-xl overflow-hidden border border-gray-100">
              <div class="${c.light} px-4 py-2 border-b border-gray-100">
                <span class="font-bold text-sm ${c.text}">${r.title}</span>
              </div>
              <div class="px-4 py-3 bg-white">
                <code class="block text-base font-mono font-bold text-gray-800 mb-2">${r.formula}</code>
                <p class="text-sm text-gray-500 italic">→ ${r.example}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Usage -->
      <div class="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <h3 class="font-black text-gray-900 mb-4 flex items-center gap-2">
          <i class="fas fa-lightbulb text-amber-500"></i>
          <span data-i18n="grammarUsage">Cách dùng</span>
        </h3>
        <ul class="space-y-2">
          ${tp.uses.map(u => `
            <li class="flex items-start gap-2 text-sm text-gray-700">
              <i class="fas fa-check-circle ${c.text} mt-0.5 flex-shrink-0"></i>
              <span>${u}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <!-- Signal words -->
        <div class="bg-white rounded-2xl p-5 shadow-sm">
          <h3 class="font-black text-gray-900 mb-3 flex items-center gap-2">
            <i class="fas fa-tags text-rose-500"></i>
            <span data-i18n="grammarSignal">Dấu hiệu nhận biết</span>
          </h3>
          <div class="flex flex-wrap gap-2">
            ${tp.signal.map(s => `<span class="badge ${c.badge} text-xs px-3 py-1">${s}</span>`).join('')}
          </div>
        </div>
        <!-- Tip -->
        <div class="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 class="font-black text-amber-800 mb-2 flex items-center gap-2">
            <i class="fas fa-exclamation-circle text-amber-500"></i>
            <span data-i18n="grammarTip">Lưu ý quan trọng</span>
          </h3>
          <p class="text-sm text-amber-700">${tp.tips}</p>
        </div>
      </div>

      <!-- Quick exercises preview -->
      <div class="bg-white rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-black text-gray-900 flex items-center gap-2">
            <i class="fas fa-pencil-alt ${c.text}"></i> Bài tập cho chủ điểm này
          </h3>
          <span class="badge ${c.badge}">${mockData.grammarExercises.filter(e => e.topicId === tp.id).length} câu hỏi</span>
        </div>
        <p class="text-sm text-gray-500 mb-4">Luyện tập ngay với các bài tập trắc nghiệm, điền vào chỗ trống và tìm lỗi sai.</p>
        <button onclick="switchGrammarTab('practice');setTimeout(()=>startGrammarPractice(${tp.id}),100)"
          class="btn-primary flex items-center gap-2 px-6 py-2.5">
          <i class="fas fa-play"></i> Bắt đầu luyện tập (${tp.name})
        </button>
      </div>
    </div>
  `;
}

function renderGrammarExerciseCards() {
  document.getElementById('grammarPracticeStart').classList.remove('hidden');
  document.getElementById('grammarPracticeQuiz').classList.add('hidden');
  document.getElementById('grammarPracticeResult').classList.add('hidden');
  const container = document.getElementById('grammarExerciseCards');
  container.innerHTML = mockData.grammarTopics.map(tp => {
    const c = colorMap[tp.color] || colorMap.indigo;
    const count = mockData.grammarExercises.filter(e => e.topicId === tp.id).length;
    const levelLabel = { beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' }[tp.level] || tp.level;
    const levelColor = { beginner: 'bg-green-100 text-green-700', intermediate: 'bg-yellow-100 text-yellow-700', advanced: 'bg-red-100 text-red-700' }[tp.level];
    return `
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all duration-200">
        <div class="h-3 ${c.bg}"></div>
        <div class="p-5">
          <div class="flex items-start justify-between mb-3">
            <div class="w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center">
              <i class="fas fa-spell-check text-white text-lg"></i>
            </div>
            <span class="badge ${levelColor} text-xs">${levelLabel}</span>
          </div>
          <h3 class="font-black text-gray-900 mb-1">${tp.name}</h3>
          <p class="text-xs text-gray-500 mb-4 line-clamp-2">${tp.desc}</p>
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400"><i class="fas fa-question-circle mr-1"></i>${count} câu hỏi</span>
            <button onclick="startGrammarPractice(${tp.id})" class="btn-primary text-sm px-4 py-2 flex items-center gap-1">
              <i class="fas fa-play text-xs"></i> Luyện tập
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function startGrammarPractice(topicId) {
  const questions = mockData.grammarExercises.filter(e => e.topicId === topicId);
  if (questions.length === 0) { showToast('Chưa có bài tập cho chủ điểm này!', 'error'); return; }
  grammarState.practiceTopicId = topicId;
  grammarState.practiceQuestions = questions;
  grammarState.practiceAnswers = new Array(questions.length).fill(null);
  grammarState.practiceCurrent = 0;
  grammarState.practiceAnswered = false;
  document.getElementById('grammarPracticeStart').classList.add('hidden');
  document.getElementById('grammarPracticeQuiz').classList.remove('hidden');
  document.getElementById('grammarPracticeResult').classList.add('hidden');
  renderGrammarQuestion();
}

function renderGrammarQuestion() {
  const q = grammarState.practiceQuestions[grammarState.practiceCurrent];
  const total = grammarState.practiceQuestions.length;
  const current = grammarState.practiceCurrent;
  const topic = mockData.grammarTopics.find(t => t.id === grammarState.practiceTopicId);
  const typeLabel = { multiple: '🔵 Trắc nghiệm', fill: '✏️ Điền vào chỗ trống', error: '🔍 Tìm lỗi sai' }[q.type] || q.type;

  document.getElementById('grammarPracticeTitle').textContent = topic ? topic.name : '';
  document.getElementById('grammarQNum').textContent = `Câu ${current + 1} / ${total}`;
  document.getElementById('grammarQProgress').style.width = ((current + 1) / total * 100) + '%';
  document.getElementById('grammarQType').textContent = typeLabel;
  document.getElementById('grammarQText').textContent = q.question;
  document.getElementById('grammarQFeedback').classList.add('hidden');

  const answered = grammarState.practiceAnswers[current];
  document.getElementById('grammarQOptions').innerHTML = q.options.map((opt, i) => {
    let cls = 'quiz-option';
    if (answered !== null) {
      if (i === q.correct) cls += ' correct';
      else if (i === answered && answered !== q.correct) cls += ' wrong';
    } else if (answered === i) {
      cls += ' selected';
    }
    return `<div class="${cls}" onclick="selectGrammarAnswer(${i})">
      <span class="font-semibold mr-2 text-indigo-600">${String.fromCharCode(65 + i)}.</span>${opt}
    </div>`;
  }).join('');

  // Show feedback if already answered
  if (answered !== null) showGrammarFeedback(answered, q);

  document.getElementById('grammarPrevBtn').disabled = current === 0;
  const isLast = current === total - 1;
  document.getElementById('grammarNextBtn').textContent = isLast ? 'Nộp bài ✓' : 'Tiếp theo →';
  document.getElementById('grammarNextBtn').onclick = isLast ? finishGrammarPractice : nextGrammarQ;
}

function selectGrammarAnswer(index) {
  if (grammarState.practiceAnswers[grammarState.practiceCurrent] !== null) return; // already answered
  grammarState.practiceAnswers[grammarState.practiceCurrent] = index;
  const q = grammarState.practiceQuestions[grammarState.practiceCurrent];
  // Update option styles
  document.querySelectorAll('#grammarQOptions .quiz-option').forEach((el, i) => {
    if (i === q.correct) el.classList.add('correct');
    else if (i === index && index !== q.correct) el.classList.add('wrong');
    else el.classList.remove('selected');
  });
  showGrammarFeedback(index, q);
}

function showGrammarFeedback(answer, q) {
  const fb = document.getElementById('grammarQFeedback');
  const isCorrect = answer === q.correct;
  fb.className = `mb-4 p-3 rounded-xl text-sm font-medium flex items-start gap-2 ${isCorrect ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`;
  fb.innerHTML = `<i class="fas fa-${isCorrect ? 'check-circle text-emerald-500' : 'times-circle text-red-500'} mt-0.5 flex-shrink-0"></i>
    <div><strong>${isCorrect ? 'Chính xác!' : 'Chưa đúng!'}</strong>${q.explain ? ' ' + q.explain : ''}</div>`;
  fb.classList.remove('hidden');
}

function nextGrammarQ() {
  if (grammarState.practiceCurrent < grammarState.practiceQuestions.length - 1) {
    grammarState.practiceCurrent++;
    renderGrammarQuestion();
  }
}

function prevGrammarQ() {
  if (grammarState.practiceCurrent > 0) {
    grammarState.practiceCurrent--;
    renderGrammarQuestion();
  }
}

function finishGrammarPractice() {
  const answers = grammarState.practiceAnswers;
  const questions = grammarState.practiceQuestions;
  let correct = 0;
  answers.forEach((a, i) => { if (a === questions[i].correct) correct++; });
  const total = questions.length;
  const pct = Math.round(correct / total * 100);
  const grade = pct >= 80 ? '🏆 Xuất sắc!' : pct >= 60 ? '👍 Tốt!' : '📚 Cần luyện thêm!';
  const gradeColor = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500';

  document.getElementById('grammarPracticeQuiz').classList.add('hidden');
  document.getElementById('grammarPracticeResult').classList.remove('hidden');
  document.getElementById('grammarResultScore').textContent = `${correct}/${total}`;
  document.getElementById('grammarResultGrade').className = `text-xl font-bold mb-1 ${gradeColor}`;
  document.getElementById('grammarResultGrade').textContent = grade;
  document.getElementById('grammarResultMsg').textContent = `Bạn trả lời đúng ${correct}/${total} câu (${pct}%)`;

  document.getElementById('grammarResultReview').innerHTML = questions.map((q, i) => {
    const isOk = answers[i] === q.correct;
    return `<div class="p-3 rounded-xl border ${isOk ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}">
      <div class="flex items-start gap-2">
        <i class="fas fa-${isOk ? 'check-circle text-emerald-500' : 'times-circle text-red-500'} mt-0.5 flex-shrink-0"></i>
        <div class="flex-1 text-sm">
          <p class="font-semibold text-gray-800">${i + 1}. ${q.question}</p>
          <p class="text-xs mt-1">Đáp án đúng: <span class="font-bold text-emerald-700">${q.options[q.correct]}</span></p>
          ${answers[i] !== null && answers[i] !== q.correct ? `<p class="text-xs text-red-600">Bạn chọn: ${q.options[answers[i]]}</p>` : ''}
          ${q.explain ? `<p class="text-xs text-gray-500 italic mt-1">${q.explain}</p>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function retryGrammarPractice() {
  startGrammarPractice(grammarState.practiceTopicId);
}

function exitGrammarPractice() {
  document.getElementById('grammarPracticeStart').classList.remove('hidden');
  document.getElementById('grammarPracticeQuiz').classList.add('hidden');
  document.getElementById('grammarPracticeResult').classList.add('hidden');
  renderGrammarExerciseCards();
}

document.addEventListener('DOMContentLoaded', initStudent);
