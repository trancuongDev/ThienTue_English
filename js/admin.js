// admin.js - Admin Dashboard Logic
let currentAdmin = null;
let currentSection = 'dashboard';
let adminStudents = [];
let adminTeachers = [];
let adminClasses = [];
let editingId = null;
let editingType = null;
let deleteCallback = null;

function initAdmin() {
  currentAdmin = requireAuth('admin');
  if (!currentAdmin) return;

  // Hiển thị loading
  document.getElementById('sidebarNav').innerHTML =
    '<div class="text-indigo-300 text-xs px-6 py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Đang tải dữ liệu...</div>';

  loadAllData().then(() => {
    adminStudents = JSON.parse(JSON.stringify(mockData.students));
    adminTeachers = JSON.parse(JSON.stringify(mockData.teachers));
    adminClasses  = JSON.parse(JSON.stringify(mockData.classes));
    renderSidebar();
    renderTopbar();
    navigateTo('dashboard');
  }).catch(() => {
    // Nếu lỗi vẫn chạy với data rỗng
    adminStudents = [];
    adminTeachers = [];
    adminClasses  = [];
    renderSidebar();
    renderTopbar();
    navigateTo('dashboard');
  });
}

function renderSidebar() {
  const nav = document.getElementById('sidebarNav');
  const items = [
    { id: 'dashboard', icon: 'fas fa-tachometer-alt', key: 'dashboard' },
    { id: 'manageStudents', icon: 'fas fa-user-graduate', key: 'manageStudents' },
    { id: 'manageTeachers', icon: 'fas fa-chalkboard-teacher', key: 'manageTeachers' },
    { id: 'manageClasses', icon: 'fas fa-school', key: 'manageClasses' },
    { id: 'trackProgress', icon: 'fas fa-chart-bar', key: 'trackProgress' },
    { id: 'tuition', icon: 'fas fa-money-bill-wave', key: 'tuition' },
    { id: 'settings', icon: 'fas fa-cog', key: 'settings' },
  ];
  nav.innerHTML = items.map(item => `
    <a id="nav-${item.id}" onclick="navigateTo('${item.id}')" class="${currentSection === item.id ? 'active' : ''}">
      <i class="${item.icon}"></i>
      <span data-i18n="${item.key}">${t(item.key)}</span>
    </a>
  `).join('');
}

function renderTopbar() {
  document.getElementById('topbarUserName').textContent = currentAdmin.name;
  const initials = currentAdmin.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
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
    case 'manageStudents': renderManageStudents(); break;
    case 'manageTeachers': renderManageTeachers(); break;
    case 'manageClasses': renderManageClasses(); break;
    case 'trackProgress': renderTrackProgress(); break;
    case 'tuition': renderTuition(); break;
    case 'settings': renderSettings(); break;
  }
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// ===== DASHBOARD =====
async function renderDashboard() {
  document.getElementById('dashStudentCount').textContent = adminStudents.length;
  document.getElementById('dashTeacherCount').textContent = adminTeachers.length;
  document.getElementById('dashClassCount').textContent   = adminClasses.length;

  const paidRevenue = mockData.tuitions
    .filter(rec => rec.status === 'paid')
    .reduce((sum, rec) => sum + rec.amount, 0);
  document.getElementById('dashRevenue').textContent = formatCurrency(paidRevenue);

  const now = new Date();
  const newThisMonth = adminStudents.filter(s => {
    const d = new Date(s.joinDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  document.getElementById('dashNewStudents').textContent = '+' + newThisMonth;

  // ── Hoạt động gần đây: lấy từ notifications + học sinh mới
  const recentActs = document.getElementById('dashRecentActivities');

  // Xây từ data thực
  const activities = [];

  // Học sinh mới nhất (tối đa 2)
  const newStudents = [...adminStudents]
    .filter(s => s.joinDate)
    .sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate))
    .slice(0, 2);
  newStudents.forEach(s => {
    activities.push({
      icon: 'user-plus', color: 'bg-emerald-100 text-emerald-600',
      text: `Học sinh mới: ${s.name} đã đăng ký lớp ${s.class || ''}`,
      time: formatDate(s.joinDate),
    });
  });

  // Thông báo gần nhất (tối đa 2)
  const recentNotifs = [...mockData.notifications]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 2);
  recentNotifs.forEach(n => {
    activities.push({
      icon: 'bell', color: 'bg-indigo-100 text-indigo-600',
      text: `Thông báo: ${n.title}`,
      time: formatDate(n.date),
    });
  });

  // Học phí đã đóng gần nhất (tối đa 1)
  const recentPaid = [...mockData.tuitions]
    .filter(t => t.status === 'paid' && t.paidDate)
    .sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate))
    .slice(0, 1);
  recentPaid.forEach(t => {
    activities.push({
      icon: 'money-bill', color: 'bg-amber-100 text-amber-600',
      text: `${t.studentName} đã thanh toán học phí ${t.month}`,
      time: formatDate(t.paidDate),
    });
  });

  if (activities.length === 0) {
    recentActs.innerHTML = `
      <div class="text-center text-gray-400 py-6">
        <i class="fas fa-history text-3xl mb-2 block"></i>
        <p class="text-sm">Chưa có hoạt động nào</p>
      </div>`;
  } else {
    // Sắp xếp mới nhất lên đầu, giới hạn 5
    recentActs.innerHTML = activities.slice(0, 5).map(a => `
      <div class="flex items-start gap-3">
        <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${a.color}">
          <i class="fas fa-${a.icon} text-sm"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-800">${a.text}</p>
          <p class="text-xs text-gray-400 mt-0.5">${a.time}</p>
        </div>
      </div>
    `).join('');
  }

  // ── Tổng quan lớp học
  const classSummary = document.getElementById('dashClassSummary');
  if (adminClasses.length === 0) {
    classSummary.innerHTML = `
      <div class="text-center text-gray-400 py-6">
        <i class="fas fa-school text-3xl mb-2 block"></i>
        <p class="text-sm">Chưa có lớp học nào</p>
      </div>`;
  } else {
    // Đếm học sinh thực tế từ adminStudents
    classSummary.innerHTML = adminClasses.map(c => {
      const studentCount = adminStudents.filter(s => s.class === c.name).length;
      const pct = c.maxStudents > 0 ? Math.round(studentCount / c.maxStudents * 100) : 0;
      return `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-indigo-50 transition-colors">
          <div>
            <p class="font-semibold text-gray-900 text-sm">${c.name} <span class="text-indigo-600">(${c.level || ''})</span></p>
            <p class="text-xs text-gray-500">${c.teacher || 'Chưa phân công'} ${c.schedule ? '• ' + c.schedule : ''}</p>
          </div>
          <div class="text-right">
            <p class="font-bold text-gray-900">${studentCount}/${c.maxStudents}</p>
            <div class="progress-bar w-20 mt-1"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>
        </div>`;
    }).join('');
  }
}

// ===== MANAGE STUDENTS =====
function renderManageStudents(search) {
  let list = adminStudents;
  if (search) list = list.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()));
  const tbody = document.getElementById('studentTableBody');
  tbody.innerHTML = list.map(s => `
    <tr>
      <td>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">${s.name.split(' ').pop()[0]}</div>
          <div>
            <p class="font-semibold text-gray-900 text-sm">${s.name}</p>
            <p class="text-xs text-gray-400">#${String(s.id).padStart(4,'0')}</p>
          </div>
        </div>
      </td>
      <td class="text-gray-600 text-sm">${s.email}</td>
      <td class="text-gray-600 text-sm">${s.phone}</td>
      <td><span class="badge bg-indigo-100 text-indigo-700">${s.class}</span></td>
      <td>
        <div class="flex items-center gap-2">
          <div class="progress-bar w-16"><div class="progress-fill" style="width:${s.progress}%"></div></div>
          <span class="text-xs font-semibold text-gray-700">${s.progress}%</span>
        </div>
      </td>
      <td><span class="badge ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}">${s.status === 'active' ? 'Đang học' : 'Nghỉ học'}</span></td>
      <td>
        <div class="flex gap-1.5">
          <button onclick="editStudent(${s.id})" class="btn-outline text-xs px-2 py-1"><i class="fas fa-edit"></i></button>
          <button onclick="openResetPwdModal('${s.id}','${s.name}','${s.email}')" class="btn-outline text-xs px-2 py-1" title="Đổi mật khẩu"><i class="fas fa-key"></i></button>
          <button onclick="deleteStudent('${s.id}')" class="btn-danger text-xs px-2 py-1"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" class="text-center text-gray-400 py-6">${t('noData')}</td></tr>`;
}

// helper: toggle password visibility
function togglePwd(inputId, btn) {
  const inp = document.getElementById(inputId);
  const ico = btn.querySelector('i');
  if (inp.type === 'password') { inp.type = 'text'; ico.className = 'fas fa-eye-slash text-sm'; }
  else { inp.type = 'password'; ico.className = 'fas fa-eye text-sm'; }
}

// Tạo mã HS ngẫu nhiên 5 ký tự (chữ hoa/thường + số)
function generateStudentCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function regenStudentPassword() {
  const code = generateStudentCode();
  document.getElementById('studentPasswordInput').value = code;
  const preview = document.getElementById('studentPasswordPreview');
  if (preview) preview.textContent = code;
}

function openAddStudentModal() {
  editingId = null;
  editingType = 'student';
  document.getElementById('studentModalTitle').textContent = t('addStudent');
  document.getElementById('studentForm').reset();
  document.getElementById('studentIdField') && (document.getElementById('studentIdField').value = '');
  // Hiện ô tài khoản khi tạo mới
  document.getElementById('studentAccountFields').classList.remove('hidden');
  // Reset preview username
  const preview = document.getElementById('studentUsernamePreview');
  if (preview) preview.textContent = '← nhập email ở trên';
  // Tự động tạo mã HS
  regenStudentPassword();
  // Populate lớp từ adminClasses
  const sel = document.getElementById('studentClassInput');
  sel.innerHTML = '<option value="">-- Chọn lớp --</option>' +
    adminClasses.map(c => `<option value="${c.name}">${c.name} (${c.level || ''})</option>`).join('');
  document.getElementById('studentModal').classList.add('active');
}

function editStudent(id) {
  const s = adminStudents.find(st => st.id === id);
  if (!s) return;
  editingId = id;
  editingType = 'student';
  document.getElementById('studentModalTitle').textContent = t('edit');
  document.getElementById('studentNameInput').value     = s.name;
  document.getElementById('studentEmailInput').value    = s.email;
  document.getElementById('studentPhoneInput').value    = s.phone;
  // Populate lớp
  const sel = document.getElementById('studentClassInput');
  sel.innerHTML = '<option value="">-- Chọn lớp --</option>' +
    adminClasses.map(c => `<option value="${c.name}" ${c.name===s.class?'selected':''}>${c.name} (${c.level||''})</option>`).join('');
  document.getElementById('studentBirthdayInput').value = s.birthday || '';
  document.getElementById('studentAddressInput').value  = s.address || '';
  // Ẩn ô tài khoản khi sửa (không đổi mật khẩu ở đây)
  document.getElementById('studentAccountFields').classList.add('hidden');
  document.getElementById('studentModal').classList.add('active');
}

async function saveStudent() {
  const data = {
    name:     document.getElementById('studentNameInput').value.trim(),
    email:    document.getElementById('studentEmailInput').value.trim(),
    phone:    document.getElementById('studentPhoneInput').value.trim(),
    class:    document.getElementById('studentClassInput').value.trim(),
    birthday: document.getElementById('studentBirthdayInput').value || null,
    address:  document.getElementById('studentAddressInput').value.trim(),
    status:   'active', tuition: 'unpaid', progress: 0,
    joinDate:  new Date().toISOString().split('T')[0],
  };
  if (!data.name || !data.email) { showToast(t('errorMsg'), 'error'); return; }

  try {
    if (editingId) {
      // Chỉ cập nhật thông tin, không đổi mật khẩu
      await Students.update(editingId, data);
      const idx = adminStudents.findIndex(s => s.id === editingId);
      if (idx !== -1) adminStudents[idx] = { ...adminStudents[idx], ...data, id: editingId };
      closeStudentModal();
      renderManageStudents();
      showToast(t('successMsg'), 'success');
    } else {
      // Tạo mới: username = email, password = mã HS tự tạo
      const username = data.email;
      const password = document.getElementById('studentPasswordInput').value;
      if (!username || !password) {
        showToast('Vui lòng nhập email và tạo mã HS!', 'error'); return;
      }
      // Kiểm tra email đã tồn tại chưa
      const existing = await sb.query('users', {
        filters: [`username=eq.${encodeURIComponent(username)}`], limit: 1
      });
      if (existing && existing.length > 0) {
        showToast('Email này đã được đăng ký!', 'error'); return;
      }
      // Tạo user
      const userRow = await sb.insert('users', {
        username, password, role: 'student',
        name: data.name, email: data.email, phone: data.phone,
      });
      const userId = Array.isArray(userRow) ? userRow[0]?.id : userRow?.id;
      // Tạo student profile
      const row = await sb.insert('students', {
        user_id: userId || null,
        name: data.name, email: data.email, phone: data.phone,
        class_name: data.class, progress: 0,
        join_date: data.joinDate, birthday: data.birthday,
        address: data.address, status: 'active', tuition_status: 'unpaid',
      });
      const mapped = mapStudent(Array.isArray(row) ? row[0] : row);
      adminStudents.push(mapped);
      mockData.students.push(mapped);
      closeStudentModal();
      renderManageStudents();
      // Thông báo mã HS
      showCreatedAccountModal(data.name, data.email, password, 'student');
    }
  } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function deleteStudent(id) {
  openConfirmModal(t('deleteWarning'), async () => {
    try {
      await Students.delete(id);
      adminStudents = adminStudents.filter(s => s.id !== id);
      mockData.students = mockData.students.filter(s => s.id !== id);
      renderManageStudents();
      showToast(t('successMsg'), 'success');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
  });
}

function closeStudentModal() { document.getElementById('studentModal').classList.remove('active'); }

// ===== MANAGE TEACHERS =====
function renderManageTeachers(search) {
  let list = adminTeachers;
  if (search) list = list.filter(tc => tc.name.toLowerCase().includes(search.toLowerCase()) || tc.email.toLowerCase().includes(search.toLowerCase()));
  const tbody = document.getElementById('teacherTableBody');
  tbody.innerHTML = list.map(tc => `
    <tr>
      <td>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">${tc.name.split(' ').pop()[0]}</div>
          <div>
            <p class="font-semibold text-gray-900 text-sm">${tc.name}</p>
            <p class="text-xs text-gray-400">#T${String(tc.id).padStart(3,'0')}</p>
          </div>
        </div>
      </td>
      <td class="text-gray-600 text-sm">${tc.email}</td>
      <td class="text-gray-600 text-sm">${tc.phone}</td>
      <td class="text-gray-600 text-sm">${tc.subject}</td>
      <td class="text-gray-600 text-sm">${tc.experience}</td>
      <td><span class="badge ${tc.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}">${tc.status === 'active' ? 'Đang dạy' : 'Nghỉ'}</span></td>
      <td>
        <div class="flex gap-1.5">
          <button onclick="editTeacher(${tc.id})" class="btn-outline text-xs px-2 py-1"><i class="fas fa-edit"></i></button>
          <button onclick="openResetPwdModal('${tc.id}','${tc.name}','${tc.email}','teacher')" class="btn-outline text-xs px-2 py-1" title="Đổi mật khẩu"><i class="fas fa-key"></i></button>
          <button onclick="deleteTeacher('${tc.id}')" class="btn-danger text-xs px-2 py-1"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" class="text-center text-gray-400 py-6">${t('noData')}</td></tr>`;
}

function openAddTeacherModal() {
  editingId = null;
  editingType = 'teacher';
  document.getElementById('teacherModalTitle').textContent = t('addTeacher');
  document.getElementById('teacherForm').reset();
  // Hiện ô tài khoản khi tạo mới
  document.getElementById('teacherAccountFields').classList.remove('hidden');
  document.getElementById('teacherModal').classList.add('active');
}

function editTeacher(id) {
  const teacher = adminTeachers.find(t => t.id === id);
  if (!teacher) return;
  editingId = id;
  document.getElementById('teacherModalTitle').textContent = t('edit');
  document.getElementById('teacherNameInput').value    = teacher.name;
  document.getElementById('teacherEmailInput').value   = teacher.email;
  document.getElementById('teacherPhoneInput').value   = teacher.phone;
  document.getElementById('teacherSubjectInput').value = teacher.subject;
  document.getElementById('teacherExpInput').value     = teacher.experience;
  // Ẩn ô tài khoản khi sửa
  document.getElementById('teacherAccountFields').classList.add('hidden');
  document.getElementById('teacherModal').classList.add('active');
}

async function saveTeacher() {
  const data = {
    name:       document.getElementById('teacherNameInput').value.trim(),
    email:      document.getElementById('teacherEmailInput').value.trim(),
    phone:      document.getElementById('teacherPhoneInput').value.trim(),
    subject:    document.getElementById('teacherSubjectInput').value.trim(),
    experience: document.getElementById('teacherExpInput').value.trim(),
    status: 'active',
    joinDate: new Date().toISOString().split('T')[0],
    classes: [],
  };
  if (!data.name || !data.email) { showToast(t('errorMsg'), 'error'); return; }
  try {
    if (editingId) {
      await Teachers.update(editingId, data);
      const idx = adminTeachers.findIndex(t => t.id === editingId);
      if (idx !== -1) adminTeachers[idx] = { ...adminTeachers[idx], ...data, id: editingId };
    } else {
      // Tạo mới: cần username + password
      const username = document.getElementById('teacherUsernameInput').value.trim();
      const password = document.getElementById('teacherPasswordInput').value;
      if (!username || password.length < 6) {
        showToast('Tên đăng nhập và mật khẩu (≥6 ký tự) là bắt buộc!', 'error');
        return;
      }
      // Kiểm tra username đã tồn tại chưa
      const existing = await sb.query('users', {
        filters: [`username=eq.${encodeURIComponent(username)}`], limit: 1
      });
      if (existing && existing.length > 0) {
        showToast('Tên đăng nhập đã tồn tại!', 'error'); return;
      }
      // Tạo user trước
      const userRow = await sb.insert('users', {
        username, password, role: 'teacher',
        name: data.name, email: data.email, phone: data.phone,
      });
      const userId = Array.isArray(userRow) ? userRow[0]?.id : userRow?.id;
      // Tạo teacher profile
      const row = await sb.insert('teachers', {
        user_id: userId || null,
        name: data.name, email: data.email, phone: data.phone,
        subject: data.subject, experience: data.experience,
        status: 'active',
        join_date: data.joinDate,
      });
      const mapped = mapTeacher(Array.isArray(row) ? row[0] : row);
      adminTeachers.push(mapped);
      mockData.teachers.push(mapped);
      closeTeacherModal();
      renderManageTeachers();
      // Hiện thông tin tài khoản GV
      showCreatedAccountModal(data.name, username, password, 'teacher');
      return;
    }
    closeTeacherModal();
    renderManageTeachers();
    showToast(t('successMsg'), 'success');
  } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function deleteTeacher(id) {
  openConfirmModal(t('deleteWarning'), async () => {
    try {
      await Teachers.delete(id);
      adminTeachers = adminTeachers.filter(tc => tc.id !== id);
      mockData.teachers = mockData.teachers.filter(tc => tc.id !== id);
      renderManageTeachers();
      showToast(t('successMsg'), 'success');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
  });
}

function closeTeacherModal() { document.getElementById('teacherModal').classList.remove('active'); }

// ===== MANAGE CLASSES =====
function renderManageClasses() {
  const tbody = document.getElementById('classTableBody');
  tbody.innerHTML = adminClasses.map(c => `
    <tr>
      <td><span class="font-bold text-gray-900">${c.name}</span></td>
      <td><span class="badge ${c.level === 'Cơ bản' || c.level === 'Beginner' ? 'bg-green-100 text-green-700' : c.level === 'Trung cấp' || c.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}">${c.level}</span></td>
      <td class="text-gray-600 text-sm">${c.teacher}</td>
      <td>
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-gray-800">${c.students}/${c.maxStudents}</span>
          <div class="progress-bar w-16"><div class="progress-fill" style="width:${Math.round(c.students/c.maxStudents*100)}%"></div></div>
        </div>
      </td>
      <td class="text-gray-600 text-sm">${c.schedule}</td>
      <td><span class="badge ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}">${c.status === 'active' ? 'Đang hoạt động' : 'Dừng'}</span></td>
      <td>
        <div class="flex gap-1.5">
          <button onclick="editClass(${c.id})" class="btn-outline text-xs px-2 py-1"><i class="fas fa-edit"></i></button>
          <button onclick="deleteClass(${c.id})" class="btn-danger text-xs px-2 py-1"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" class="text-center text-gray-400 py-6">${t('noData')}</td></tr>`;
}

function openAddClassModal() {
  editingId = null;
  document.getElementById('classModalTitle').textContent = t('addClass');
  document.getElementById('classForm').reset();
  populateTeacherSelect();
  document.getElementById('classModal').classList.add('active');
}

function populateTeacherSelect() {
  const sel = document.getElementById('classTeacherInput');
  sel.innerHTML = '<option value="">-- ' + t('assignTeacher') + ' --</option>' +
    adminTeachers.map(tc => `<option value="${tc.id}">${tc.name}</option>`).join('');
}

function editClass(id) {
  const cls = adminClasses.find(c => c.id === id);
  if (!cls) return;
  editingId = id;
  document.getElementById('classModalTitle').textContent = t('edit');
  populateTeacherSelect();
  document.getElementById('classNameInput').value = cls.name;
  document.getElementById('classLevelInput').value = cls.level;
  document.getElementById('classTeacherInput').value = cls.teacherId;
  document.getElementById('classMaxInput').value = cls.maxStudents;
  document.getElementById('classScheduleInput').value = cls.schedule;
  document.getElementById('classRoomInput').value = cls.room;
  document.getElementById('classModal').classList.add('active');
}

async function saveClass() {
  const teacherId = document.getElementById('classTeacherInput').value;
  const teacher = adminTeachers.find(tc => tc.id === teacherId);
  const data = {
    name:        document.getElementById('classNameInput').value.trim(),
    level:       document.getElementById('classLevelInput').value.trim(),
    teacherId:   teacherId || null,
    teacher:     teacher ? teacher.name : '',
    maxStudents: parseInt(document.getElementById('classMaxInput').value) || 15,
    schedule:    document.getElementById('classScheduleInput').value.trim(),
    room:        document.getElementById('classRoomInput').value.trim(),
    status: 'active', students: 0,
  };
  if (!data.name) { showToast(t('errorMsg'), 'error'); return; }
  try {
    if (editingId) {
      await Classes.update(editingId, data);
      const idx = adminClasses.findIndex(c => c.id === editingId);
      if (idx !== -1) adminClasses[idx] = { ...adminClasses[idx], ...data, id: editingId };
    } else {
      const row = await Classes.create(data);
      const mapped = mapClass(row);
      adminClasses.push(mapped);
      mockData.classes.push(mapped);
    }
    closeClassModal();
    renderManageClasses();
    showToast(t('successMsg'), 'success');
  } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function deleteClass(id) {
  openConfirmModal(t('deleteWarning'), async () => {
    try {
      await Classes.delete(id);
      adminClasses = adminClasses.filter(c => c.id !== id);
      mockData.classes = mockData.classes.filter(c => c.id !== id);
      renderManageClasses();
      showToast(t('successMsg'), 'success');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
  });
}

function closeClassModal() { document.getElementById('classModal').classList.remove('active'); }

// ===== TRACK PROGRESS =====
function renderTrackProgress() {
  const tbody = document.getElementById('progressTableBody');
  tbody.innerHTML = adminStudents.map(s => `
    <tr>
      <td>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">${s.name.split(' ').pop()[0]}</div>
          <span class="font-semibold text-gray-900 text-sm">${s.name}</span>
        </div>
      </td>
      <td><span class="badge bg-indigo-100 text-indigo-700">${s.class}</span></td>
      <td>
        <div class="flex items-center gap-2">
          <div class="progress-bar flex-1" style="min-width:100px"><div class="progress-fill" style="width:${s.progress}%"></div></div>
          <span class="text-sm font-bold ${s.progress >= 80 ? 'text-emerald-600' : s.progress >= 60 ? 'text-amber-600' : 'text-red-500'}">${s.progress}%</span>
        </div>
      </td>
      <td>
        <span class="badge ${s.progress >= 80 ? 'bg-emerald-100 text-emerald-700' : s.progress >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}">
          ${s.progress >= 80 ? 'Xuất sắc' : s.progress >= 60 ? 'Đạt' : 'Cần cải thiện'}
        </span>
      </td>
      <td class="text-gray-600 text-sm">${Math.round(mockData.lessons.length * s.progress / 100)}/${mockData.lessons.length}</td>
      <td class="text-gray-600 text-sm">${formatDate(s.joinDate)}</td>
    </tr>
  `).join('');
}

// ===== TUITION =====
function renderTuition(filter) {
  const filterEl = document.getElementById('tuitionFilter');
  const activeFilter = (filterEl ? filterEl.value : 'all') || 'all';
  let list = mockData.tuitions;
  if (activeFilter !== 'all') list = list.filter(rec => rec.status === activeFilter);

  const totalPaid = mockData.tuitions.filter(rec => rec.status === 'paid').reduce((s, rec) => s + rec.amount, 0);
  const totalUnpaid = mockData.tuitions.filter(rec => rec.status === 'unpaid').reduce((s, rec) => s + rec.amount, 0);
  document.getElementById('tuitionTotalPaid').textContent = formatCurrency(totalPaid);
  document.getElementById('tuitionTotalUnpaid').textContent = formatCurrency(totalUnpaid);

  const tbody = document.getElementById('tuitionTableBody');
  tbody.innerHTML = list.map(rec => `
    <tr>
      <td class="font-semibold text-gray-900 text-sm">${rec.studentName}</td>
      <td><span class="badge bg-indigo-100 text-indigo-700">${rec.class}</span></td>
      <td class="text-gray-600 text-sm">${rec.month}</td>
      <td class="font-semibold text-gray-900">${formatCurrency(rec.amount)}</td>
      <td class="text-gray-600 text-sm">${formatDate(rec.dueDate)}</td>
      <td>
        <span class="badge ${rec.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">
          <i class="fas fa-${rec.status === 'paid' ? 'check-circle' : 'clock'} mr-1"></i>
          ${rec.status === 'paid' ? t('paid') : t('unpaid')}
        </span>
      </td>
      <td class="text-gray-500 text-sm">${rec.paidDate ? formatDate(rec.paidDate) : '—'}</td>
      <td>
        ${rec.status === 'unpaid' ? `<button onclick="markTuitionPaid(${rec.id})" class="btn-secondary text-xs px-2 py-1">Xác nhận đóng</button>` : ''}
      </td>
    </tr>
  `).join('') || `<tr><td colspan="8" class="text-center text-gray-400 py-6">${t('noData')}</td></tr>`;
}

async function markTuitionPaid(id) {
  try {
    await Tuitions.markPaid(id);
    const record = mockData.tuitions.find(item => item.id === id);
    if (record) {
      record.status = 'paid';
      record.paidDate = new Date().toISOString().split('T')[0];
    }
    renderTuition();
    showToast('Cập nhật học phí thành công!', 'success');
  } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// ===== SETTINGS =====
function renderSettings() {
  // Merge localStorage settings nếu có
  const saved = localStorage.getItem('centerSettings');
  if (saved) { try { Object.assign(mockData.centerSettings, JSON.parse(saved)); } catch(e) {} }
  const s = mockData.centerSettings;
  document.getElementById('settingCenterName').value      = s.name || '';
  document.getElementById('settingAddress').value         = s.address || '';
  document.getElementById('settingPhone').value           = s.phone || '';
  document.getElementById('settingEmail').value           = s.email || '';
  document.getElementById('settingWebsite').value         = s.website || '';
  document.getElementById('settingDesc').value            = s.description || '';
  document.getElementById('settingMaxClass').value        = s.maxClassSize || 15;
  document.getElementById('settingSessionDuration').value = s.sessionDuration || 90;
  document.getElementById('settingWorkingHours').value    = s.workingHours || '';
}

async function saveSettings() {
  mockData.centerSettings.name        = document.getElementById('settingCenterName').value;
  mockData.centerSettings.address     = document.getElementById('settingAddress').value;
  mockData.centerSettings.phone       = document.getElementById('settingPhone').value;
  mockData.centerSettings.email       = document.getElementById('settingEmail').value;
  mockData.centerSettings.website     = document.getElementById('settingWebsite').value;
  mockData.centerSettings.description = document.getElementById('settingDesc').value;
  // Lưu settings vào localStorage (không có bảng riêng)
  localStorage.setItem('centerSettings', JSON.stringify(mockData.centerSettings));
  showToast(t('successMsg'), 'success');
}

// ── Account Created Modal ─────────────────────────────────────────────────
function showCreatedAccountModal(name, username, password, role) {
  document.getElementById('acName').textContent = name;
  document.getElementById('acUsername').textContent = username;
  document.getElementById('acPassword').textContent = password;
  document.getElementById('acPasswordLabel').textContent =
    role === 'student' ? 'Mật khẩu (Mã HS)' : 'Mật khẩu';
  // Lưu để dùng cho copy all và share
  document.getElementById('accountCreatedModal')._name     = name;
  document.getElementById('accountCreatedModal')._username = username;
  document.getElementById('accountCreatedModal')._password = password;
  document.getElementById('accountCreatedModal').classList.add('active');
}
function closeAccountCreatedModal() {
  document.getElementById('accountCreatedModal').classList.remove('active');
}
function copyText(elId) {
  const text = document.getElementById(elId).textContent;
  navigator.clipboard.writeText(text).then(() => showToast('Đã sao chép!', 'success'));
}
function copyFullAccountInfo() {
  const modal = document.getElementById('accountCreatedModal');
  const name  = modal._name || '';
  const user  = modal._username || document.getElementById('acUsername').textContent;
  const pwd   = modal._password || document.getElementById('acPassword').textContent;
  const text  = `🎓 Thông tin tài khoản Thiên Tuệ English\n👤 Họ tên: ${name}\n📧 Tên đăng nhập: ${user}\n🔑 Mật khẩu: ${pwd}\n\n🌐 Đăng nhập tại: ${location.origin}/index.html`;
  navigator.clipboard.writeText(text).then(() => showToast('Đã sao chép thông tin tài khoản!', 'success'));
}
function shareAccountInfo() {
  const modal = document.getElementById('accountCreatedModal');
  const name  = modal._name || '';
  const user  = modal._username || document.getElementById('acUsername').textContent;
  const pwd   = modal._password || document.getElementById('acPassword').textContent;
  const text  = `🎓 Thông tin tài khoản Thiên Tuệ English\n👤 Họ tên: ${name}\n📧 Tên đăng nhập: ${user}\n🔑 Mật khẩu: ${pwd}\n\n🌐 Đăng nhập tại: ${location.origin}/index.html`;
  if (navigator.share) {
    navigator.share({ title: 'Tài khoản Thiên Tuệ English', text }).catch(() => {});
  } else {
    // Fallback: mở mailto
    const mailto = `mailto:${user}?subject=Thông tin tài khoản Thiên Tuệ English&body=${encodeURIComponent(text)}`;
    window.open(mailto);
  }
}

// ── Reset Password Modal ──────────────────────────────────────────────────
let resetPwdUserId = null;
let resetPwdUserEmail = null;

function openResetPwdModal(userId, name, email, role) {
  resetPwdUserId = userId;
  resetPwdUserEmail = email;
  document.getElementById('resetPwdName').textContent = name;
  document.getElementById('resetPwdEmail').textContent = email;
  document.getElementById('newPwdInput').value = '';
  document.getElementById('resetPwdModal').classList.add('active');
}
function closeResetPwdModal() {
  document.getElementById('resetPwdModal').classList.remove('active');
}
function genNewPwd() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  document.getElementById('newPwdInput').value = code;
  document.getElementById('newPwdInput').type = 'text';
}
async function saveResetPwd() {
  const newPwd = document.getElementById('newPwdInput').value.trim();
  if (!newPwd || newPwd.length < 5) { showToast('Mật khẩu tối thiểu 5 ký tự!', 'error'); return; }
  try {
    // Cập nhật password trong bảng users theo email
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(resetPwdUserEmail)}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ password: newPwd }),
    });
    if (!res.ok) throw new Error(await res.text());
    closeResetPwdModal();
    showToast('Đã đổi mật khẩu thành công!', 'success');
  } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// ── Add Student to Class ──────────────────────────────────────────────────
function openAddToClassModal() {
  const sel = document.getElementById('addToClassSelect');
  sel.innerHTML = '<option value="">-- Chọn lớp --</option>' +
    adminClasses.map(c => `<option value="${c.name}">${c.name} (${c.level || ''})</option>`).join('');
  document.getElementById('addToClassStudentList').innerHTML =
    '<p class="text-gray-400 text-sm text-center py-4">Chọn lớp để xem danh sách</p>';
  document.getElementById('addToClassModal').classList.add('active');
}
function closeAddToClassModal() {
  document.getElementById('addToClassModal').classList.remove('active');
}
function renderAddToClassStudents() {
  const cls = document.getElementById('addToClassSelect').value;
  if (!cls) return;
  const container = document.getElementById('addToClassStudentList');
  container.innerHTML = adminStudents.map(s => `
    <label class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer border border-transparent hover:border-indigo-100">
      <input type="checkbox" value="${s.id}" ${s.class === cls ? 'checked' : ''}
        class="w-4 h-4 accent-indigo-600 flex-shrink-0" />
      <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        ${s.name.split(' ').pop()[0]}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-gray-900 text-sm">${s.name}</p>
        <p class="text-xs text-gray-400">${s.class ? 'Lớp ' + s.class : 'Chưa có lớp'}</p>
      </div>
    </label>
  `).join('') || '<p class="text-gray-400 text-sm text-center py-4">Chưa có học sinh</p>';
}
async function saveAddToClass() {
  const cls = document.getElementById('addToClassSelect').value;
  if (!cls) { showToast('Vui lòng chọn lớp!', 'error'); return; }
  const checked = [...document.querySelectorAll('#addToClassStudentList input[type=checkbox]:checked')]
    .map(cb => cb.value);
  try {
    // Cập nhật class_name cho từng học sinh được chọn
    await Promise.all(checked.map(id =>
      sb.update('students', id, { class_name: cls })
    ));
    // Cập nhật local
    adminStudents.forEach(s => {
      if (checked.includes(String(s.id))) s.class = cls;
    });
    mockData.students = [...adminStudents];
    closeAddToClassModal();
    renderManageStudents();
    showToast(`Đã gán ${checked.length} học sinh vào lớp ${cls}!`, 'success');
  } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

// ── Tuition Create ────────────────────────────────────────────────────────
function openTuitionCreateModal() {
  const sel = document.getElementById('tuitionStudentSelect');
  sel.innerHTML = adminStudents.map(s =>
    `<option value="${s.id}" data-class="${s.class}" data-name="${s.name}">
      ${s.name} — Lớp ${s.class || 'N/A'}
    </option>`
  ).join('');
  // Default tháng hiện tại
  const now = new Date();
  document.getElementById('tuitionMonth').value =
    `${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
  document.getElementById('tuitionDueDate').value =
    `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-05`;
  document.getElementById('tuitionCreateModal').classList.add('active');
}
function closeTuitionCreateModal() {
  document.getElementById('tuitionCreateModal').classList.remove('active');
}
async function saveTuitionRecord() {
  const sel = document.getElementById('tuitionStudentSelect');
  const opt = sel.options[sel.selectedIndex];
  const studentId   = sel.value;
  const studentName = opt.dataset.name || opt.textContent.trim().split('—')[0].trim();
  const className   = opt.dataset.class || '';
  const amount  = parseInt(document.getElementById('tuitionAmount').value) || 0;
  const month   = document.getElementById('tuitionMonth').value.trim();
  const dueDate = document.getElementById('tuitionDueDate').value;
  if (!studentId || !month || !dueDate) { showToast(t('errorMsg'), 'error'); return; }
  try {
    const row = await Tuitions.create({
      studentId, studentName, class: className,
      amount, month, dueDate, status: 'unpaid', paidDate: null,
    });
    const mapped = mapTuition(Array.isArray(row) ? row[0] : row);
    mockData.tuitions.push(mapped);
    closeTuitionCreateModal();
    renderTuition();
    showToast('Đã tạo phiếu học phí!', 'success');
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

document.addEventListener('DOMContentLoaded', initAdmin);
