// data.js - Thiên Tuệ English

const mockData = {
  // ── Tài khoản đăng nhập (quản lý trên Supabase) ────────────────────────────
  users: [],

  students:      [],
  teachers:      [],
  classes:       [],
  lessons:       [],
  quizQuestions: [],
  vocabulary:    [],
  schedule:      [],
  notifications: [],
  attendance:    [],
  tuitions:      [],

  // ── Nội dung ngữ pháp (giữ lại vì là tài liệu học) ─────────────────────
  grammarTopics: [
    {
      id: 1, name: 'Present Simple', level: 'beginner', color: 'indigo',
      desc: 'Thì hiện tại đơn dùng để diễn tả hành động thường xuyên, sự thật hiển nhiên.',
      rules: [
        { title: 'Khẳng định',        formula: 'S + V(s/es)',              example: 'She works every day.' },
        { title: 'Phủ định',          formula: 'S + do/does + not + V',    example: "He doesn't like coffee." },
        { title: 'Nghi vấn',          formula: 'Do/Does + S + V?',         example: 'Do they play football?' },
        { title: 'Thêm s/es',         formula: 'He/She/It → V+s/es',       example: 'He watches TV. She goes to school.' },
      ],
      uses: [
        'Hành động lặp đi lặp lại, thói quen: I study English every morning.',
        'Sự thật hiển nhiên, quy luật tự nhiên: The sun rises in the east.',
        'Lịch trình cố định: The train leaves at 8 AM.',
        'Cảm xúc, trạng thái: I love music. She knows the answer.',
      ],
      tips: 'Nhớ thêm S/ES cho he, she, it. Động từ kết thúc -ch, -sh, -x, -o, -ss thêm ES.',
      signal: ['always','usually','often','sometimes','rarely','never','every day/week/month'],
    },
    {
      id: 2, name: 'Past Simple', level: 'beginner', color: 'emerald',
      desc: 'Thì quá khứ đơn diễn tả hành động đã xảy ra và kết thúc trong quá khứ.',
      rules: [
        { title: 'Khẳng định (đều)',        formula: 'S + V-ed',              example: 'She walked to school.' },
        { title: 'Khẳng định (bất quy tắc)',formula: 'S + V2',                example: 'He went to the market.' },
        { title: 'Phủ định',                formula: "S + didn't + V",        example: "I didn't go to the party." },
        { title: 'Nghi vấn',                formula: 'Did + S + V?',          example: 'Did she call you?' },
      ],
      uses: [
        'Hành động xảy ra tại thời điểm xác định trong quá khứ: I met him in 2020.',
        'Chuỗi hành động liên tiếp trong quá khứ: She woke up, had breakfast and left.',
        'Thói quen trong quá khứ: He used to play tennis.',
      ],
      tips: 'Học thuộc bảng động từ bất quy tắc. Phủ định và câu hỏi luôn dùng did + V nguyên mẫu.',
      signal: ['yesterday','last week/month/year','ago','in + năm','when I was young'],
    },
    {
      id: 3, name: 'Present Perfect', level: 'intermediate', color: 'amber',
      desc: 'Thì hiện tại hoàn thành nối quá khứ với hiện tại, nhấn mạnh kết quả hoặc kinh nghiệm.',
      rules: [
        { title: 'Khẳng định', formula: 'S + have/has + V3', example: 'I have finished my homework.' },
        { title: 'Phủ định',   formula: "S + haven't/hasn't + V3", example: "She hasn't arrived yet." },
        { title: 'Nghi vấn',   formula: 'Have/Has + S + V3?', example: 'Have you ever been to Paris?' },
      ],
      uses: [
        'Kinh nghiệm chưa xác định thời gian: I have been to Japan twice.',
        'Hành động vừa mới xảy ra: She has just left the office.',
        'Hành động từ quá khứ đến hiện tại: He has lived here for 5 years.',
        'Thành tích, kết quả: Scientists have discovered a new planet.',
      ],
      tips: 'Không dùng với thời gian cụ thể (yesterday, last year...). Dùng for (khoảng thời gian) và since (mốc thời gian).',
      signal: ['just','already','yet','ever','never','since','for','recently','so far'],
    },
    {
      id: 4, name: 'Future Simple (will)', level: 'beginner', color: 'rose',
      desc: 'Thì tương lai đơn dùng will để diễn đạt quyết định tức thì, dự đoán, lời hứa.',
      rules: [
        { title: 'Khẳng định', formula: 'S + will + V',        example: 'I will help you.' },
        { title: 'Phủ định',   formula: "S + won't + V",       example: "It won't rain tomorrow." },
        { title: 'Nghi vấn',   formula: 'Will + S + V?',       example: 'Will she come to the party?' },
      ],
      uses: [
        "Quyết định tức thì tại thời điểm nói: I'll answer the phone.",
        'Dự đoán không có bằng chứng: I think it will rain.',
        'Lời hứa, đề nghị: I will call you tonight.',
        'Sự thật hiển nhiên trong tương lai: The sun will rise tomorrow.',
      ],
      tips: "Phân biệt will (quyết định tức thì) với be going to (kế hoạch đã chuẩn bị). Won't = will not.",
      signal: ['tomorrow','next week','in the future','soon','I think...','probably'],
    },
    {
      id: 5, name: 'Passive Voice', level: 'intermediate', color: 'cyan',
      desc: 'Câu bị động nhấn mạnh vào đối tượng chịu tác động của hành động.',
      rules: [
        { title: 'Cấu trúc chung',         formula: 'S + be + V3 (+ by + agent)',  example: 'The book was written by Hemingway.' },
        { title: 'Present Simple Passive',  formula: 'S + am/is/are + V3',          example: 'English is spoken worldwide.' },
        { title: 'Past Simple Passive',     formula: 'S + was/were + V3',           example: 'The cake was eaten by the children.' },
        { title: 'Present Perfect Passive', formula: 'S + have/has been + V3',      example: 'The report has been submitted.' },
      ],
      uses: [
        'Khi không biết hoặc không cần nêu chủ thể: The window was broken.',
        'Nhấn mạnh vào đối tượng, kết quả: The Eiffel Tower was built in 1889.',
        'Văn phong trang trọng, khoa học, báo chí.',
      ],
      tips: 'By + agent có thể bỏ nếu không quan trọng. Chú ý chia be theo thì và chủ ngữ.',
      signal: ['by','is/are/was/were + V3'],
    },
    {
      id: 6, name: 'Conditional Sentences', level: 'advanced', color: 'purple',
      desc: 'Câu điều kiện diễn đạt giả thiết và kết quả có thể xảy ra.',
      rules: [
        { title: 'Type 0 (sự thật)',              formula: 'If + S + V(present), S + V(present)',       example: 'If you heat water to 100°C, it boils.' },
        { title: 'Type 1 (có thể xảy ra)',         formula: 'If + S + V(present), S + will + V',        example: 'If it rains, I will stay home.' },
        { title: 'Type 2 (giả định hiện tại)',     formula: 'If + S + V(past), S + would + V',          example: 'If I had money, I would travel the world.' },
        { title: 'Type 3 (giả định quá khứ)',      formula: 'If + S + had + V3, S + would have + V3',   example: 'If she had studied, she would have passed.' },
      ],
      uses: [
        'Type 0: Quy luật, sự thật khoa học.',
        'Type 1: Điều kiện thực tế, khả năng xảy ra cao.',
        'Type 2: Tình huống giả định, ước muốn hiện tại.',
        'Type 3: Hối tiếc, giả định về quá khứ.',
      ],
      tips: 'Phân biệt 4 loại qua động từ trong mệnh đề if. Type 2 dùng were cho I/he/she/it trong văn phong trang trọng.',
      signal: ['if','unless','provided that','as long as'],
    },
  ],

  grammarExercises: [
    // Present Simple
    { id:1,  topicId:1, type:'multiple', question:'She ___ to school every morning.',                    options:['go','goes','going','went'],                                  correct:1, explain:'He/She/It + V+s/es trong Present Simple.' },
    { id:2,  topicId:1, type:'fill',     question:'The sun ___ (rise) in the east.',                    options:['rise','rises','rose','is rising'],                           correct:1, explain:'Sự thật hiển nhiên dùng Present Simple.' },
    { id:3,  topicId:1, type:'multiple', question:'They ___ not like spicy food.',                      options:['do','does','did','are'],                                     correct:0, explain:'They dùng "do not" trong phủ định Present Simple.' },
    { id:4,  topicId:1, type:'error',    question:"He don't go to work on Sundays. Find the error:",   options:["don't → doesn't",'go → goes','on → in','Sundays → Sunday'],  correct:0, explain:'He/She/It dùng "doesn\'t".' },
    { id:5,  topicId:1, type:'multiple', question:'___ your sister speak French?',                      options:['Do','Does','Did','Is'],                                      correct:1, explain:'Câu hỏi với she/he/it dùng "Does".' },
    // Past Simple
    { id:6,  topicId:2, type:'multiple', question:'They ___ a movie last night.',                       options:['watch','watched','watches','watching'],                      correct:1, explain:'Past Simple của "watch" là "watched".' },
    { id:7,  topicId:2, type:'fill',     question:'She ___ (go) to the market yesterday.',              options:['go','goes','went','gone'],                                   correct:2, explain:'Past Simple của go là went (bất quy tắc).' },
    { id:8,  topicId:2, type:'multiple', question:'I ___ not see him at the party.',                    options:['do','does','did','was'],                                     correct:2, explain:'Phủ định Past Simple dùng "did not".' },
    { id:9,  topicId:2, type:'multiple', question:'___ you finish your homework last night?',           options:['Do','Does','Did','Were'],                                    correct:2, explain:'Câu hỏi Past Simple dùng "Did".' },
    // Present Perfect
    { id:10, topicId:3, type:'multiple', question:'She ___ already ___ her lunch.',                     options:['has / eaten','have / eaten','had / eaten','is / eating'],    correct:0, explain:'She + has + V3. "Already" đặt giữa have/has và V3.' },
    { id:11, topicId:3, type:'fill',     question:'I ___ (live) here for ten years.',                   options:['live','lived','have lived','had lived'],                     correct:2, explain:'Present Perfect với "for" = hành động từ quá khứ đến hiện tại.' },
    { id:12, topicId:3, type:'multiple', question:'Have you ever ___ sushi?',                           options:['eat','ate','eaten','eating'],                                correct:2, explain:'Have/Has + V3. Eaten là V3 của eat.' },
    { id:13, topicId:3, type:'error',    question:'"They have went to Paris last year." Find error:',   options:['have went → went','have went → have gone','to → in','They → He'], correct:1, explain:'V3 của go là gone. Không dùng Present Perfect với "last year".' },
    // Future Simple
    { id:14, topicId:4, type:'multiple', question:'I think it ___ rain tomorrow.',                      options:['is','will','would','shall'],                                 correct:1, explain:'Will + V diễn tả dự đoán tương lai.' },
    { id:15, topicId:4, type:'fill',     question:"Don't worry, I ___ (help) you.",                     options:['help','helped','will help','am helping'],                    correct:2, explain:'Lời hứa tức thì dùng will + V.' },
    // Passive Voice
    { id:16, topicId:5, type:'multiple', question:'The letter ___ by Mary yesterday.',                  options:['write','wrote','was written','is written'],                  correct:2, explain:'Past Simple Passive: was/were + V3.' },
    { id:17, topicId:5, type:'multiple', question:'English ___ all over the world.',                    options:['speaks','is speaking','is spoken','was spoken'],             correct:2, explain:'Present Simple Passive: is/are + V3.' },
    { id:18, topicId:5, type:'fill',     question:'The new bridge ___ (build) in 2020.',                options:['built','was built','is built','has built'],                  correct:1, explain:'Past Simple Passive: was/were + V3.' },
    // Conditional
    { id:19, topicId:6, type:'multiple', question:'If I ___ rich, I would travel the world.',           options:['am','was','were','will be'],                                 correct:2, explain:'Type 2 dùng "were" cho tất cả chủ ngữ trong văn phong chuẩn.' },
    { id:20, topicId:6, type:'multiple', question:'If she had studied harder, she ___ the exam.',       options:['will pass','would pass','would have passed','had passed'],   correct:2, explain:'Type 3: would have + V3 trong mệnh đề chính.' },
    { id:21, topicId:6, type:'fill',     question:'If it ___ (rain) tomorrow, we will cancel the trip.',options:['rained','rains','will rain','would rain'],                   correct:1, explain:'Type 1: If + Present Simple, will + V.' },
  ],

  // ── Cài đặt trung tâm ───────────────────────────────────────────────────
  centerSettings: {
    name:            'Thiên Tuệ English Center',
    address:         '',
    phone:           '',
    email:           'info@thientueenglish.vn',
    website:         'www.thientueenglish.vn',
    description:     'Trung tâm tiếng Anh chất lượng cao',
    maxClassSize:    15,
    sessionDuration: 90,
    workingHours:    '8:00 - 21:00',
  },
};

// ── Auth functions ───────────────────────────────────────────────────────────
function login(username, password, role) {
  const user = mockData.users.find(u => u.username === username && u.password === password && u.role === role);
  if (user) {
    const sessionUser = { ...user };
    delete sessionUser.password;
    sessionStorage.setItem('currentUser', JSON.stringify(sessionUser));
    return true;
  }
  return false;
}

function getCurrentUser() {
  const data = sessionStorage.getItem('currentUser');
  return data ? JSON.parse(data) : null;
}

function logout() {
  sessionStorage.removeItem('currentUser');
  window.location.href = 'index.html';
}

function requireAuth(role) {
  const user = getCurrentUser();
  if (!user || user.role !== role) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

// ── Helper functions ─────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN');
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function getDayName(dayIndex) {
  const days = {
    vi: ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'],
    en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  };
  return days[localStorage.getItem('lang') || 'vi'][dayIndex];
}

function getTodaySchedule(className) {
  const today = new Date().getDay();
  return mockData.schedule.filter(s => s.day === today && s.class === className);
}

function getTopicColor(topic) {
  return ({
    grammar:    'bg-indigo-100 text-indigo-700',
    vocabulary: 'bg-emerald-100 text-emerald-700',
    listening:  'bg-amber-100 text-amber-700',
    speaking:   'bg-rose-100 text-rose-700',
    reading:    'bg-cyan-100 text-cyan-700',
    writing:    'bg-purple-100 text-purple-700',
  })[topic] || 'bg-gray-100 text-gray-700';
}

function getLevelColor(level) {
  return ({
    beginner:     'bg-green-100 text-green-700',
    intermediate: 'bg-yellow-100 text-yellow-700',
    advanced:     'bg-red-100 text-red-700',
  })[level] || 'bg-gray-100 text-gray-700';
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-medium transform transition-all duration-300 translate-x-full';
  toast.style.backgroundColor = type === 'success' ? '#10B981' : '#EF4444';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.remove('translate-x-full'), 10);
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
