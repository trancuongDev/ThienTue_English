/**
 * Shared learning games for Thien Tue English LMS (student.html + admin.html).
 */
window.LearningGames = (function () {
  let ctx = {
    getVocabWords: () => [],
    getGrammarQuestions: () => [],
    areaId: '',
    accent: 'primary', // 'primary' for vocab, 'green' for grammar
    _area: null
  };

  function setCtx(partial) { Object.assign(ctx, partial); }
  function areaEl(fallback) { return fallback || ctx._area || document.getElementById(ctx.areaId); }
  function vocabWords() { return ctx.getVocabWords() || []; }
  function grammarQs() { return ctx.getGrammarQuestions() || []; }
  function btnGrad() {
    return ctx.accent === 'green'
      ? 'linear-gradient(135deg,#059669,#10b981)'
      : 'linear-gradient(135deg,var(--primary),var(--primary-dark))';
  }
  function accentBorder(active) {
    return ctx.accent === 'green' ? (active ? '#059669' : 'var(--border)') : (active ? 'var(--primary)' : 'var(--border)');
  }
  function accentBg(active) {
    return ctx.accent === 'green' ? (active ? '#d1fae5' : 'var(--card)') : (active ? 'var(--primary-light)' : 'var(--card)');
  }
  function accentText(active) {
    return ctx.accent === 'green' ? (active ? '#065f46' : 'var(--text)') : (active ? 'var(--primary)' : 'var(--text)');
  }
  function chipStyle(active) {
    return `padding:.4rem .85rem;border-radius:999px;font-size:.85rem;font-weight:700;cursor:pointer;transition:all .15s;border:2px solid ${accentBorder(active)};background:${accentBg(active)};color:${accentText(active)}`;
  }

  // ── Vocab state ──
  let _fcIdx = 0;
  let _fcKnown = new Set();   // ids của từ đã đánh dấu "Biết rồi"
  let _fcDoneThisRound = 0;  // đếm đã duyệt bao nhiêu từ trong vòng hiện tại
  let _fiWords = [], _fiIdx = 0, _fiScore = 0;
  let _matchSelected = { type: null, id: null };
  let _matchPairs = [];
  let _matchMatched = new Set();
  let _matchLastCount = 8;
  let _vqWords = [], _vqIdx = 0, _vqScore = 0, _vqHistory = [];

  // ── Grammar state ──
  let _gfQuestions = [], _gfIdx = 0, _gfScore = 0;
  let _gmSelected = { type: null, id: null };
  let _gmPairs = [];
  let _gmMatched = new Set();
  let _gmLastCount = 6;

  function getCorrectOption(q) {
    const letter = (q.answer || 'A').toUpperCase();
    return (q['option_' + letter.toLowerCase()] || '').trim();
  }

  function formatBlank(text) {
    if (!text) return '';
    const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return esc.replace(/_{2,}|___+/g, '<span style="display:inline-block;min-width:3.5rem;border-bottom:2.5px solid #059669;color:#059669;font-weight:800;padding:0 .15rem">___</span>');
  }

  function truncate(text, max) {
    if (!text) return '';
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }

  // ── Database helpers cho vocab_progress ──
  function _fcDb() {
    if (typeof db === 'undefined') return null;
    return db;
  }

  // Lấy student_id từ sessionStorage (student.js set sẵn)
  function _getStudentDbId() {
    return sessionStorage.getItem('st_student_db_id') || null;
  }

  // Load progress từ DB
  async function loadVocabProgress(setId, studentDbIdOverride) {
    const database = _fcDb();
    const studentDbId = studentDbIdOverride || _getStudentDbId();
    if (!database || !studentDbId) return null;
    try {
      const { data } = await database
        .from('vocab_progress')
        .select('known_word_ids, unknown_word_ids, last_card_index')
        .eq('student_id', Number(studentDbId))
        .eq('vocab_set_id', setId)
        .single();
      return data || null;
    } catch(e) { return null; }
  }

  // Lưu progress vào DB (upsert)
  async function saveVocabProgress(setId, knownIds, unknownIds, cardIdx, studentDbIdOverride) {
    const database = _fcDb();
    const studentDbId = studentDbIdOverride || ctx._studentDbId || _getStudentDbId();
    if (!database || !studentDbId) return;
    const allKnown = knownIds.length === vocabWords().filter(w => !unknownIds.includes(String(w.id))).length;
    await database.from('vocab_progress').upsert({
      student_id: Number(studentDbId),  // convert string → number (bigint)
      vocab_set_id: setId,
      known_word_ids: knownIds,
      unknown_word_ids: unknownIds,
      last_card_index: cardIdx,
      completed_at: allKnown ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'student_id,vocab_set_id' }).throwOnError();
  }

  // ── Nhảy đến thẻ số N ──
  function fcGoTo(n) {
    _fcIdx = Math.max(0, Math.min(n, vocabWords().length - 1));
    _fcDoneThisRound = Math.min(_fcIdx, _fcDoneThisRound);
    renderFcCard();
  }

  // ══════════════════════════════════════════════════════════════════
  // VOCAB GAMES
  // ══════════════════════════════════════════════════════════════════

  function flashcard(area) {
    area = areaEl(area);
    if (!area) return;
    ctx._area = area;
    const words = vocabWords();
    if (!words.length) { area.innerHTML = '<p style="color:var(--muted);padding:2rem;text-align:center">Bộ từ này chưa có từ nào.</p>'; return; }
    _fcDoneThisRound = 0;
    // Chỉ reset về 0 nếu chưa có restored index (tránh ghi đè restoreFcState)
    if (typeof ctx._fcRestoredIdx !== 'number') {
      _fcIdx = 0;
    }
    renderFcCard();
  }

  // ── Lấy từ tiếp theo trong vòng hiện tại ──
  // mode: 'next' = đi tới, 'prev' = lùi lại
  function fcMove(mode) {
    const words = vocabWords();
    if (!words.length) return;
    if (mode === 'prev') {
      if (_fcIdx > 0) _fcIdx--;
    } else {
      _fcIdx++;
      _fcDoneThisRound = Math.min(_fcIdx, _fcDoneThisRound);
    }
    renderFcCard();
  }

  // ── Xử lý nút "Biết rồi" / "Chưa biết" ──
  function fcMark(known) {
    const words = vocabWords();
    const w = words[_fcIdx];
    if (!w) return;
    if (known) {
      _fcKnown.add(w.id);
    } else {
      _fcKnown.delete(w.id);
    }
    // Lưu DB (bất đồng bộ, không chờ)
    _saveProgressDebounced();
    // Tự động chuyển sang từ tiếp theo sau 400ms
    setTimeout(() => fcMove('next'), 400);
  }

  // ── Debounce save để tránh spam DB ──
  let _saveProgressTimer = null;
  function _saveProgressDebounced() {
    clearTimeout(_saveProgressTimer);
    _saveProgressTimer = setTimeout(async () => {
      const setId = typeof _stCurrentVocabSetId !== 'undefined' ? _stCurrentVocabSetId : null;
      if (!setId) return;
      const knownArr = Array.from(_fcKnown);
      const unknownArr = words ? words.filter(w => !_fcKnown.has(w.id)).map(w => String(w.id)) : [];
      await saveVocabProgress(setId, knownArr, unknownArr, _fcIdx);
    }, 800);
  }

  function renderFcCard() {
    const area = areaEl();
    if (!area) return;
    const words = vocabWords();
    if (!words.length) return;

    const remaining = words.length - _fcIdx - 1;
    const unknownCount = words.filter(w => !_fcKnown.has(w.id)).length;
    const knownCount = words.filter(w => _fcKnown.has(w.id)).length;
    const allDone = _fcIdx >= words.length;

    if (allDone) {
      // ── Màn hình hoàn thành vòng học ──
      const pct = Math.round(knownCount / words.length * 100);
      area.innerHTML = `
        <div style="text-align:center;padding:2rem;background:var(--card);border-radius:16px;border:1.5px solid var(--border)">
          <div style="font-size:3rem;margin-bottom:.75rem">${knownCount === words.length ? '🏆' : knownCount >= words.length * 0.6 ? '🎉' : '📚'}</div>
          <div style="font-size:1.3rem;font-weight:900;color:var(--text);margin-bottom:.5rem">
            Hoàn thành vòng học!
          </div>
          <div style="font-size:1rem;font-weight:700;color:var(--primary);margin-bottom:.35rem">
            ✅ Đã thuộc: ${knownCount} / ${words.length}
          </div>
          ${unknownCount > 0 ? `
          <div style="font-size:.9rem;color:#f59e0b;margin-bottom:1rem">
            ⚠️ Còn ${unknownCount} từ chưa thuộc — cần ôn lại
          </div>` : `
          <div style="font-size:.9rem;color:#10b981;margin-bottom:1rem">
            🎉 Tuyệt vời! Bạn thuộc hết tất cả từ!
          </div>`}
          <div style="width:100%;height:10px;background:#e5e7eb;border-radius:999px;overflow:hidden;margin-bottom:.85rem">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#4338ca,#6366f1);border-radius:999px;transition:width .5s"></div>
          </div>
          <div style="display:flex;gap:.65rem;justify-content:center;flex-wrap:wrap">
            ${unknownCount > 0 ? `
            <button onclick="LearningGames.vocab.startNewRound()"
              style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:12px;padding:.65rem 1.5rem;font-size:.9rem;font-weight:700;cursor:pointer">
              🔄 Ôn lại từ chưa thuộc (${unknownCount})
            </button>` : ''}
            <button onclick="LearningGames.vocab.startNewRound()"
              style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:12px;padding:.65rem 1.5rem;font-size:.9rem;font-weight:700;cursor:pointer">
              🔄 Học lại từ đầu
            </button>
            <button onclick="LearningGames.vocab.flashcard(areaEl())"
              style="background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;border:none;border-radius:12px;padding:.65rem 1.5rem;font-size:.9rem;font-weight:700;cursor:pointer">
              🃏 Mở lại Flashcard
            </button>
          </div>
        </div>`;
      return;
    }

    const w = words[_fcIdx];
    const isKnown = _fcKnown.has(w.id);
    const pct = Math.round((_fcIdx / words.length) * 100);

    const btnStyle = 'background:none;border:1.5px solid var(--border);border-radius:8px;padding:.4rem .9rem;cursor:pointer;font-size:.85rem;color:var(--text)';
    const atStart = _fcIdx === 0;
    const atEnd = _fcIdx === words.length - 1;

    area.innerHTML = `
      <!-- Progress bar + counters -->
      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.85rem;flex-wrap:wrap">
        <span style="font-size:.78rem;color:var(--muted);font-weight:700;white-space:nowrap">
          ${_fcIdx + 1} / ${words.length}
        </span>
        <div style="flex:1;min-width:80px;height:8px;background:#e5e7eb;border-radius:999px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#4338ca,#6366f1);border-radius:999px;transition:width .4s"></div>
        </div>
        <span style="font-size:.72rem;background:#d1fae5;color:#065f46;padding:.2rem .6rem;border-radius:999px;font-weight:700;white-space:nowrap">
          ✅ ${knownCount} thuộc
        </span>
        ${unknownCount > 0 ? `<span style="font-size:.72rem;background:#fee2e2;color:#991b1b;padding:.2rem .6rem;border-radius:999px;font-weight:700;white-space:nowrap">
          ⚠️ ${unknownCount} chưa
        </span>` : ''}
      </div>

      <!-- Nhảy đến thẻ số X -->
      <div style="display:flex;align-items:center;justify-content:center;gap:.4rem;margin-bottom:.75rem">
        <span style="font-size:.78rem;color:var(--muted)">Nhảy đến thẻ:</span>
        <input type="number" id="lgFcGoInput" min="1" max="${words.length}" placeholder="1 – ${words.length}"
          style="width:68px;padding:.3rem .5rem;border:1.5px solid var(--border);border-radius:8px;font-size:.82rem;text-align:center;outline:none"
          onkeydown="if(event.key==='Enter'){LearningGames.vocab.fcGoTo(parseInt(this.value)-1);this.value='';}">
        <button type="button" onclick="LearningGames.vocab.fcGoTo(parseInt(document.getElementById('lgFcGoInput').value)-1);document.getElementById('lgFcGoInput').value='';"
          style="padding:.3rem .7rem;background:var(--primary);color:#fff;border:none;border-radius:8px;font-size:.78rem;font-weight:700;cursor:pointer">
          → Đi
        </button>
      </div>

      <!-- Flashcard -->
      <div class="st-flashcard" id="lgFlashcard" onclick="this.classList.toggle('flipped')">
        <div class="st-flashcard-inner">
          <div class="st-flashcard-front">
            ${w.image_url ? `<img src="${w.image_url}" alt="${w.word}" style="width:100%;max-height:90px;object-fit:contain;margin-bottom:.75rem;border-radius:10px" onerror="this.style.display='none'"/>` : ''}
            <div style="font-size:1.8rem;font-weight:900;margin-bottom:.35rem">${w.word}</div>
            ${w.phonetic ? `<div style="font-size:.9rem;opacity:.75;font-style:italic">${w.phonetic}</div>` : ''}
            <div style="font-size:.75rem;margin-top:auto;opacity:.5">Bấm để xem nghĩa ⟳</div>
          </div>
          <div class="st-flashcard-back">
            <div style="font-size:1.4rem;font-weight:800;margin-bottom:.5rem">${w.meaning}</div>
            ${w.example ? `<div style="font-size:.85rem;font-style:italic;opacity:.9;text-align:center">"${w.example}"</div>` : ''}
            <div style="font-size:.75rem;margin-top:auto;opacity:.5">Bấm để xem từ ⟳</div>
          </div>
        </div>
      </div>

      <!-- Nút điều hướng -->
      <div style="display:flex;align-items:center;justify-content:center;margin-top:1rem;gap:.5rem">
        <button type="button" onclick="LearningGames.vocab.flashcard(areaEl())"
          style="${btnStyle};font-size:.78rem" title=" Quay về từ đầu">⏮ Từ đầu</button>
        <button type="button" id="lgFcPrevBtn" ${atStart ? 'disabled' : ''}
          style="${btnStyle}${atStart ? ';opacity:.4;cursor:not-allowed' : ''}">◀ Trước</button>
        <button type="button" id="lgFcNextBtn"
          style="${btnStyle}">Sau ▶</button>
      </div>

      <!-- Nút Biết / Chưa biết -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-top:.85rem;max-width:480px;margin-left:auto;margin-right:auto">
        <button type="button" onclick="LearningGames.vocab.fcMark(false)"
          style="padding:.7rem;border:2px solid #ef4444;border-radius:12px;background:#fee2e2;color:#dc2626;font-size:.95rem;font-weight:800;cursor:pointer;transition:all .15s;box-shadow:0 4px 12px rgba(239,68,68,.2)">
          ❌ Chưa biết
        </button>
        <button type="button" onclick="LearningGames.vocab.fcMark(true)"
          style="padding:.7rem;border:2px solid #10b981;border-radius:12px;background:#d1fae5;color:#065f46;font-size:.95rem;font-weight:800;cursor:pointer;transition:all .15s;box-shadow:0 4px 12px rgba(16,185,129,.2)">
          ✅ Biết rồi
        </button>
      </div>

      <div style="text-align:center;margin-top:.85rem;font-size:.82rem;color:var(--muted)">
        Nhấp vào thẻ để lật · Dùng <b>❌ Chưa biết</b> / <b>✅ Biết rồi</b> để ghi nhớ tiến độ
      </div>`;

    document.getElementById('lgFcPrevBtn').onclick = () => fcMove('prev');
    document.getElementById('lgFcNextBtn').onclick = () => fcMove('next');
  }

  function fillInCard(area) {
    area = areaEl(area);
    if (!area) return;
    ctx._area = area;
    if (_fiIdx >= _fiWords.length) {
      area.innerHTML = `
      <div style="text-align:center;padding:2rem;background:var(--card);border-radius:16px;border:1.5px solid var(--border)">
        <div style="font-size:3rem;margin-bottom:.75rem">${_fiScore === _fiWords.length ? '🏆' : _fiScore >= _fiWords.length * 0.6 ? '🎉' : '📚'}</div>
        <div style="font-size:1.3rem;font-weight:900;color:var(--text);margin-bottom:.5rem">Kết quả: ${_fiScore}/${_fiWords.length}</div>
        <div style="font-size:.9rem;color:var(--muted);margin-bottom:1.25rem">${_fiScore === _fiWords.length ? 'Xuất sắc! Bạn thuộc hết rồi!' : _fiScore >= _fiWords.length * 0.6 ? 'Tốt lắm! Luyện thêm nhé!' : 'Cần ôn thêm, cố lên!'}</div>
        <button onclick="LearningGames.vocab.fillIn()"
          style="background:${btnGrad()};color:#fff;border:none;border-radius:12px;padding:.65rem 1.75rem;font-size:.9rem;font-weight:700;cursor:pointer">🔄 Chơi lại</button>
      </div>`;
      return;
    }
    const w = _fiWords[_fiIdx];
    area.innerHTML = `
    <div style="background:var(--card);border:1.5px solid var(--border);border-radius:16px;padding:1.5rem;max-width:480px;margin:0 auto">
      <div style="text-align:center;font-size:.78rem;color:var(--muted);font-weight:600;margin-bottom:.75rem">Câu ${_fiIdx + 1}/${_fiWords.length} · Điểm: ${_fiScore}</div>
      ${w.image_url ? `<img src="${w.image_url}" style="width:100%;max-height:120px;object-fit:contain;border-radius:10px;margin-bottom:1rem" onerror="this.style.display='none'"/>` : ''}
      <div style="font-size:1.05rem;font-weight:700;color:var(--text);text-align:center;margin-bottom:.35rem">${w.meaning}</div>
      ${w.example ? `<div style="font-size:.8rem;color:var(--muted);text-align:center;font-style:italic;margin-bottom:1rem">${w.example.replace(new RegExp(w.word, 'gi'), '___')}</div>` : '<div style="margin-bottom:1rem"></div>'}
      <input id="fiInput" type="text" placeholder="Nhập từ tiếng Anh..."
        style="width:100%;padding:.65rem 1rem;border:2px solid var(--border);border-radius:12px;font-size:1rem;outline:none;text-align:center;background:var(--bg);color:var(--text)"
        onkeydown="if(event.key==='Enter')LearningGames.vocab.checkFillIn()"
        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"/>
      <div id="fiMsg" style="text-align:center;min-height:28px;margin-top:.6rem;font-size:.88rem;font-weight:700"></div>
      <div style="display:flex;gap:.65rem;margin-top:.85rem">
        <button onclick="LearningGames.vocab.checkFillIn()" style="flex:1;padding:.6rem;background:${btnGrad()};color:#fff;border:none;border-radius:10px;font-size:.9rem;font-weight:700;cursor:pointer">✓ Kiểm tra</button>
        <button onclick="LearningGames.vocab.skipFillIn()" style="padding:.6rem 1rem;border:1.5px solid var(--border);border-radius:10px;background:var(--bg);color:var(--muted);cursor:pointer;font-size:.85rem">Bỏ qua ▶</button>
      </div>
    </div>`;
    setTimeout(() => document.getElementById('fiInput')?.focus(), 50);
  }

  function fillIn(area) {
    area = areaEl(area);
    if (!area) return;
    ctx._area = area;
    const words = vocabWords();
    if (!words.length) { area.innerHTML = '<p style="color:var(--muted);padding:2rem;text-align:center">Bộ từ này chưa có từ nào.</p>'; return; }
    _fiWords = [...words].sort(() => Math.random() - 0.5);
    _fiIdx = 0;
    _fiScore = 0;
    fillInCard(area);
  }

  function checkFillIn() {
    const input = document.getElementById('fiInput');
    const msg = document.getElementById('fiMsg');
    if (!input || !msg) return;
    const val = input.value.trim().toLowerCase();
    const correct = _fiWords[_fiIdx].word.toLowerCase();
    if (val === correct) {
      msg.style.color = '#10b981';
      msg.textContent = '✅ Chính xác!';
      _fiScore++;
      input.disabled = true;
      setTimeout(() => { _fiIdx++; fillInCard(); }, 900);
    } else {
      msg.style.color = '#ef4444';
      msg.textContent = `❌ Sai rồi! Đáp án: ${_fiWords[_fiIdx].word}`;
      input.style.borderColor = '#ef4444';
      setTimeout(() => { _fiIdx++; fillInCard(); }, 1600);
    }
  }

  function skipFillIn() {
    _fiIdx++;
    fillInCard();
  }

  function match(area) {
    area = areaEl(area);
    if (!area) return;
    ctx._area = area;
    const words = vocabWords();
    if (!words.length) { area.innerHTML = '<p style="color:var(--muted);padding:2rem;text-align:center">Bộ từ này chưa có từ nào.</p>'; return; }
    if (words.length < 2) { area.innerHTML = '<p style="color:var(--muted);padding:2rem;text-align:center">Cần ít nhất 2 từ để chơi nối từ.</p>'; return; }
    matchSetup(area);
  }

  function matchSetup(area) {
    area = areaEl(area);
    if (!area) return;
    ctx._area = area;
    const words = vocabWords();
    const total = words.length;
    const presets = [...new Set([4, 6, 8, 10, 12, 15, 20, total].filter(n => n >= 2 && n <= total))].sort((a, b) => a - b);
    const def = (_matchLastCount >= 2 && _matchLastCount <= total) ? _matchLastCount : (total <= 8 ? total : 8);
    area.innerHTML = `
    <div style="max-width:420px;margin:0 auto;background:var(--card);border:1.5px solid var(--border);border-radius:16px;padding:1.25rem 1.5rem;box-shadow:var(--shadow)">
      <div style="text-align:center;font-weight:800;font-size:1rem;margin-bottom:.35rem">🔗 Chọn số cặp từ</div>
      <div style="text-align:center;font-size:.82rem;color:var(--muted);margin-bottom:1rem">Bộ này có <b style="color:var(--text)">${total}</b> từ — chọn bao nhiêu cặp để luyện</div>
      <div style="display:flex;flex-wrap:wrap;gap:.45rem;justify-content:center;margin-bottom:1rem">
        ${presets.map(n => `
          <button type="button" data-count="${n}" onclick="LearningGames.vocab.selectMatchCount(${n},this)"
            style="${chipStyle(n === def)}">${n === total ? `Tất cả (${n})` : n + ' cặp'}</button>
        `).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:1.1rem">
        <label style="font-size:.82rem;color:var(--muted);white-space:nowrap;font-weight:600">Tuỳ chọn:</label>
        <input type="number" id="matchCountInput" min="2" max="${total}" value="${def}"
          oninput="document.querySelectorAll('[data-count]').forEach(b=>{b.style.borderColor='var(--border)';b.style.background='var(--card)';b.style.color='var(--text)';})"
          style="flex:1;padding:.5rem .65rem;border:2px solid var(--border);border-radius:10px;font-size:.95rem;text-align:center;font-weight:700;background:var(--bg);color:var(--text);outline:none"/>
        <span style="font-size:.82rem;color:var(--muted);font-weight:600">/ ${total}</span>
      </div>
      <button type="button" onclick="LearningGames.vocab.startMatchGame()"
        style="width:100%;padding:.75rem;border:none;background:${btnGrad()};color:#fff;border-radius:12px;font-size:.95rem;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(99,102,241,.3)">
        ▶ Bắt đầu nối từ
      </button>
    </div>`;
  }

  function selectMatchCount(n, btn) {
    const inp = document.getElementById('matchCountInput');
    if (inp) inp.value = n;
    document.querySelectorAll('[data-count]').forEach(b => {
      const active = b === btn;
      b.style.borderColor = accentBorder(active);
      b.style.background = accentBg(active);
      b.style.color = accentText(active);
    });
  }

  function startMatchGame() {
    const words = vocabWords();
    const total = words.length;
    const inp = document.getElementById('matchCountInput');
    let count = parseInt(inp?.value, 10);
    if (!count || count < 2) count = 2;
    if (count > total) count = total;
    _matchLastCount = count;
    matchBoard(areaEl(), count);
  }

  function matchBoard(area, count) {
    area = areaEl(area);
    if (!area) return;
    ctx._area = area;
    const words = vocabWords();
    if (!words.length) return;
    _matchSelected = { type: null, id: null };
    _matchMatched = new Set();
    const total = words.length;
    count = Math.min(Math.max(count || 2, 2), total);
    _matchPairs = [...words].sort(() => Math.random() - 0.5).slice(0, count);
    const leftCol = [..._matchPairs].sort(() => Math.random() - 0.5);
    const rightCol = [..._matchPairs].sort(() => Math.random() - 0.5);
    const scrollWrap = _matchPairs.length > 10 ? 'max-height:60vh;overflow-y:auto;padding-right:.35rem' : '';
    area.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:.5rem;margin-bottom:.75rem;flex-wrap:wrap">
      <span style="font-size:.78rem;color:var(--muted);font-weight:600;background:var(--bg);border:1px solid var(--border);border-radius:999px;padding:.25rem .7rem">${count} / ${total} cặp từ</span>
      <button type="button" onclick="LearningGames.vocab.match()"
        style="font-size:.78rem;font-weight:700;padding:.25rem .65rem;border:1.5px solid var(--border);border-radius:999px;background:var(--card);color:var(--text);cursor:pointer">⚙️ Đổi số từ</button>
    </div>
    <div style="text-align:center;font-size:.82rem;color:var(--muted);margin-bottom:1rem;font-weight:600">Chọn một từ bên trái rồi chọn nghĩa tương ứng bên phải</div>
    <div id="matchScoreBar" style="text-align:center;font-size:.82rem;color:var(--muted);font-weight:600;margin-bottom:.85rem">Đã ghép: 0 / ${_matchPairs.length}</div>
    <div style="${scrollWrap}">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.65rem;max-width:720px;margin:0 auto">
        <div id="matchLeft" style="display:flex;flex-direction:column;gap:.5rem">
          ${leftCol.map(w => `<div class="st-match-word" id="mw-${w.id}" data-id="${w.id}" onclick="LearningGames.vocab.matchClick('word','${w.id}')">${w.word}</div>`).join('')}
        </div>
        <div id="matchRight" style="display:flex;flex-direction:column;gap:.5rem">
          ${rightCol.map(w => `<div class="st-match-meaning" id="mm-${w.id}" data-id="${w.id}" onclick="LearningGames.vocab.matchClick('meaning','${w.id}')">${w.meaning}</div>`).join('')}
        </div>
      </div>
    </div>`;
  }

  function matchClick(type, id) {
    const el = document.getElementById(type === 'word' ? `mw-${id}` : `mm-${id}`);
    if (!el || el.classList.contains('matched')) return;
    if (_matchSelected.type === type) {
      const oldEl = document.getElementById(_matchSelected.type === 'word' ? `mw-${_matchSelected.id}` : `mm-${_matchSelected.id}`);
      if (oldEl) oldEl.classList.remove('selected');
      _matchSelected = { type, id };
      el.classList.add('selected');
      return;
    }
    if (!_matchSelected.type) {
      _matchSelected = { type, id };
      el.classList.add('selected');
      return;
    }
    const wordId = type === 'word' ? id : _matchSelected.id;
    const meaningId = type === 'meaning' ? id : _matchSelected.id;
    const wEl = document.getElementById(`mw-${wordId}`);
    const mEl = document.getElementById(`mm-${meaningId}`);
    if (wordId === meaningId) {
      wEl?.classList.replace('selected', 'matched');
      mEl?.classList.replace('selected', 'matched');
      _matchMatched.add(wordId);
      const bar = document.getElementById('matchScoreBar');
      if (bar) bar.textContent = `Đã ghép: ${_matchMatched.size} / ${_matchPairs.length}`;
      if (_matchMatched.size === _matchPairs.length) {
        const replayCount = _matchPairs.length;
        const container = areaEl();
        setTimeout(() => {
          container?.insertAdjacentHTML('afterbegin',
            `<div style="text-align:center;background:#d1fae5;border:2px solid #10b981;border-radius:14px;padding:1rem;margin-bottom:1rem;font-weight:800;color:#065f46;font-size:1rem">🏆 Hoàn thành! Bạn ghép đúng hết ${replayCount} cặp!
            <button onclick="LearningGames.vocab.matchBoard(null,${replayCount})" style="margin-left:.5rem;background:#10b981;color:#fff;border:none;border-radius:8px;padding:.35rem .9rem;cursor:pointer;font-weight:700">🔄 Chơi lại</button>
            <button onclick="LearningGames.vocab.match()" style="margin-left:.35rem;background:#fff;color:#065f46;border:1.5px solid #10b981;border-radius:8px;padding:.35rem .9rem;cursor:pointer;font-weight:700">⚙️ Đổi số từ</button>
          </div>`);
        }, 300);
      }
    } else {
      wEl?.classList.add('wrong');
      mEl?.classList.add('wrong');
      setTimeout(() => { wEl?.classList.remove('wrong', 'selected'); mEl?.classList.remove('wrong', 'selected'); }, 600);
    }
    _matchSelected = { type: null, id: null };
  }

  function buildVocabQuizOptions(word) {
    const all = vocabWords();
    const wrong = all.filter(x => x.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3);
    return [{ text: word.meaning, correct: true }, ...wrong.map(x => ({ text: x.meaning, correct: false }))].sort(() => Math.random() - 0.5);
  }

  function vocabQuizRecalcScore() {
    return _vqHistory.filter(h => h && h.answered && h.options[h.selectedIdx]?.correct).length;
  }

  function vocabQuizCard(area) {
    area = areaEl(area);
    if (!area) return;
    ctx._area = area;
    if (_vqIdx >= _vqWords.length) {
      _vqScore = vocabQuizRecalcScore();
      const pct = Math.round(_vqScore / _vqWords.length * 100);
      area.innerHTML = `
      <div style="text-align:center;padding:2rem;background:var(--card);border-radius:16px;border:1.5px solid var(--border)">
        <div style="font-size:3rem;margin-bottom:.75rem">${pct === 100 ? '🏆' : pct >= 70 ? '🎉' : '📖'}</div>
        <div style="font-size:1.3rem;font-weight:900;color:var(--text);margin-bottom:.5rem">Kết quả: ${_vqScore}/${_vqWords.length} (${pct}%)</div>
        <div style="font-size:.9rem;color:var(--muted);margin-bottom:1.25rem">${pct === 100 ? 'Hoàn hảo!' : pct >= 70 ? 'Làm tốt lắm!' : 'Luyện thêm nhé!'}</div>
        <div style="display:flex;gap:.65rem;justify-content:center;flex-wrap:wrap">
          <button onclick="LearningGames.vocab.reviewQuiz()"
            style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;border:none;border-radius:12px;padding:.65rem 1.75rem;font-size:.9rem;font-weight:700;cursor:pointer">📋 Xem lại từng câu</button>
          <button onclick="LearningGames.vocab.vocabQuiz()"
            style="background:${btnGrad()};color:#fff;border:none;border-radius:12px;padding:.65rem 1.75rem;font-size:.9rem;font-weight:700;cursor:pointer">🔄 Chơi lại</button>
        </div>
      </div>`;
      return;
    }

    const w = _vqWords[_vqIdx];
    if (!_vqHistory[_vqIdx]) {
      _vqHistory[_vqIdx] = { options: buildVocabQuizOptions(w), selectedIdx: null, answered: false };
    }
    const hist = _vqHistory[_vqIdx];
    const opts = hist.options;
    const labels = ['A', 'B', 'C', 'D'];
    const answered = hist.answered;
    _vqScore = vocabQuizRecalcScore();

    const optBtnStyle = (i, o) => {
      if (!answered) {
        return 'padding:.65rem 1rem;border:2px solid var(--border);border-radius:12px;background:var(--bg);color:var(--text);font-size:.88rem;font-weight:600;cursor:pointer;text-align:left;transition:all .18s;width:100%';
      }
      const isSelected = hist.selectedIdx === i;
      if (o.correct) {
        return 'padding:.65rem 1rem;border:2px solid #10b981;border-radius:12px;background:#d1fae5;color:#065f46;font-size:.88rem;font-weight:700;text-align:left;width:100%;cursor:default';
      }
      if (isSelected) {
        return 'padding:.65rem 1rem;border:2px solid #ef4444;border-radius:12px;background:#fee2e2;color:#dc2626;font-size:.88rem;font-weight:700;text-align:left;width:100%;cursor:default';
      }
      return 'padding:.65rem 1rem;border:2px solid var(--border);border-radius:12px;background:var(--bg);color:var(--muted);font-size:.88rem;font-weight:600;text-align:left;opacity:.55;width:100%;cursor:default';
    };

    const navBtn = (label, onclick, disabled) =>
      `<button type="button" onclick="${onclick}" ${disabled ? 'disabled' : ''}
      style="padding:.45rem 1rem;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:.85rem;font-weight:700;cursor:${disabled ? 'not-allowed' : 'pointer'};opacity:${disabled ? '.4' : '1'}">${label}</button>`;

    area.innerHTML = `
    <div style="background:var(--card);border:1.5px solid var(--border);border-radius:16px;padding:1.5rem;max-width:520px;margin:0 auto">
      <div style="display:flex;justify-content:space-between;font-size:.78rem;color:var(--muted);font-weight:600;margin-bottom:1rem">
        <span>Câu ${_vqIdx + 1}/${_vqWords.length}</span><span>Điểm: ${_vqScore}</span>
      </div>
      ${w.image_url ? `<img src="${w.image_url}" style="width:100%;max-height:120px;object-fit:contain;border-radius:10px;margin-bottom:1rem" onerror="this.style.display='none'"/>` : ''}
      <div style="font-size:1.2rem;font-weight:900;color:var(--primary);text-align:center;margin-bottom:.35rem">${w.word}</div>
      ${w.phonetic ? `<div style="font-size:.85rem;color:var(--muted);text-align:center;font-style:italic;margin-bottom:1rem">${w.phonetic}</div>` : '<div style="margin-bottom:1rem"></div>'}
      <div style="font-size:.88rem;color:var(--muted);text-align:center;margin-bottom:.85rem;font-weight:600">${answered ? '📋 Đáp án của bạn' : 'Từ này có nghĩa là gì?'}</div>
      <div style="display:flex;flex-direction:column;gap:.55rem">
        ${opts.map((o, i) => `
          <button type="button" ${answered ? 'disabled' : ''} onclick="LearningGames.vocab.checkVocabQuiz(${i},${o.correct})"
            style="${optBtnStyle(i, o)}"
            ${!answered ? `onmouseover="if(!this.disabled)this.style.borderColor='var(--primary)'" onmouseout="if(!this.disabled)this.style.borderColor='var(--border)'"` : ''}>
            <b>${labels[i]}.</b> ${o.text}${answered && o.correct ? ' ✅' : ''}${answered && hist.selectedIdx === i && !o.correct ? ' ❌' : ''}
          </button>`).join('')}
      </div>
      ${answered && hist.selectedIdx !== null && !opts[hist.selectedIdx]?.correct
        ? `<div style="margin-top:.65rem;padding:.5rem .75rem;background:#f0fdf4;border-left:3px solid #10b981;border-radius:0 8px 8px 0;font-size:.83rem;color:#065f46">✅ Đáp án đúng: <b>${opts.find(o => o.correct)?.text || ''}</b></div>`
        : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.1rem;gap:.5rem">
        ${navBtn('◀ Câu trước', 'LearningGames.vocab.vocabQuizPrev()', _vqIdx === 0)}
        ${answered && _vqIdx < _vqWords.length - 1
          ? navBtn('Câu sau ▶', 'LearningGames.vocab.vocabQuizNext()', false)
          : answered && _vqIdx === _vqWords.length - 1
            ? navBtn('Xem kết quả ✓', 'LearningGames.vocab.vocabQuizFinish()', false)
            : navBtn('Câu sau ▶', '', true)}
      </div>
    </div>`;
  }

  function vocabQuiz(area) {
    area = areaEl(area);
    if (!area) return;
    ctx._area = area;
    const words = vocabWords();
    if (words.length < 4) {
      area.innerHTML = '<p style="color:var(--muted);padding:2rem;text-align:center">Cần ít nhất 4 từ để chơi trắc nghiệm.</p>';
      return;
    }
    _vqWords = [...words].sort(() => Math.random() - 0.5);
    _vqIdx = 0;
    _vqScore = 0;
    _vqHistory = _vqWords.map(() => null);
    vocabQuizCard(area);
  }

  function vocabQuizPrev() {
    if (_vqIdx > 0) { _vqIdx--; vocabQuizCard(); }
  }

  function vocabQuizNext() {
    if (!_vqHistory[_vqIdx]?.answered) return;
    if (_vqIdx < _vqWords.length - 1) { _vqIdx++; vocabQuizCard(); }
  }

  function vocabQuizFinish() {
    if (!_vqHistory[_vqIdx]?.answered) return;
    _vqIdx = _vqWords.length;
    vocabQuizCard();
  }

  function checkVocabQuiz(optIdx, isCorrect) {
    const hist = _vqHistory[_vqIdx];
    if (!hist || hist.answered) return;
    hist.selectedIdx = optIdx;
    hist.answered = true;
    _vqScore = vocabQuizRecalcScore();
    vocabQuizCard();
  }

  function reviewQuiz() {
    _vqIdx = 0;
    vocabQuizCard();
  }

  // ── Vocab preview — xem tất cả từ trước khi học (dạng danh sách) ──
  let _vpFilter = '';

  // ── Reset progress flashcard khi chuyển bộ từ mới ──
  function _resetFcState() {
    _fcIdx = 0;
    _fcKnown.clear();
    _fcDoneThisRound = 0;
    ctx._fcUnknownOnly = false;
  }

  // ── Lấy danh sách từ đã thuộc (để student.js lưu session) ──
  function _getFcKnown() { return _fcKnown; }

  // ── Khôi phục trạng thái flashcard từ DB hoặc sessionStorage ──
  function restoreFcState(knownIds, unknownIds, lastCardIdx) {
    _fcKnown.clear();
    (knownIds || []).forEach(id => _fcKnown.add(id));
    _fcIdx = (typeof lastCardIdx === 'number' && lastCardIdx >= 0) ? lastCardIdx : 0;
    _fcDoneThisRound = 0;
    ctx._fcRestoredIdx = _fcIdx; // đánh dấu đã restore để flashcard() không reset
  }

  // ── Bắt đầu vòng mới: lọc từ chưa thuộc hoặc chơi lại từ đầu ──
  function startNewRound() {
    ctx._fcRestoredIdx = undefined; // clear restore flag khi bắt đầu vòng mới
    const words = vocabWords();
    const unknown = words.filter(w => !_fcKnown.has(w.id));
    if (unknown.length > 0) {
      // Chỉ học từ chưa thuộc
      ctx._fcUnknownOnly = true;
      _fcIdx = 0;
      _fcDoneThisRound = 0;
    } else {
      // Học lại tất cả, reset progress + DB
      ctx._fcUnknownOnly = false;
      _fcKnown.clear();
      _fcIdx = 0;
      _fcDoneThisRound = 0;
      // Xóa progress DB khi reset toàn bộ
      const setId = typeof _stCurrentVocabSetId !== 'undefined' ? _stCurrentVocabSetId : null;
      if (setId) saveVocabProgress(setId, [], [], 0);
    }
    renderFcCard();
  }

  function vocabPreview(area) {
    area = areaEl(area);
    if (!area) return;
    ctx._area = area;
    const words = vocabWords();
    if (!words.length) {
      area.innerHTML = '<p style="color:var(--muted);padding:2rem;text-align:center">Bộ từ này chưa có từ nào.</p>';
      return;
    }

    const esc = (s) => (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const filter = _vpFilter.trim().toLowerCase();
    const list = !filter ? words : words.filter(w =>
      (w.word || '').toLowerCase().includes(filter) ||
      (w.meaning || '').toLowerCase().includes(filter) ||
      (w.example || '').toLowerCase().includes(filter)
    );

    area.innerHTML = `
      <div class="st-vocab-preview-toolbar">
        <div class="st-vocab-preview-search">
          <span class="st-vocab-preview-search-icon">🔍</span>
          <input type="text" id="vpSearch" placeholder="Tìm từ, nghĩa, ví dụ..." value="${esc(_vpFilter)}"/>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
          <span style="font-size:.78rem;color:var(--muted);font-weight:600;background:var(--primary-light);color:var(--primary);padding:.3rem .75rem;border-radius:999px">
            📖 ${list.length}/${words.length} từ
          </span>
          <button type="button" id="vpStartBtn" data-game="flashcard"
            style="padding:.55rem 1.15rem;border:none;border-radius:10px;background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;font-size:.85rem;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,.3)">
            ▶ Bắt đầu học Flashcard
          </button>
        </div>
      </div>

      <div style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1.5px solid #c7d2fe;border-radius:12px;padding:.85rem 1.1rem;margin-bottom:1rem;display:flex;align-items:flex-start;gap:.65rem;font-size:.84rem;color:#3730a3;line-height:1.6">
        <span style="font-size:1.2rem;flex-shrink:0">💡</span>
        <span><b>Đọc qua toàn bộ danh sách từ bên dưới</b> trước, ghi nhớ nghĩa và cách dùng. Sau khi nắm rồi, nhấn <b>“Bắt đầu học Flashcard”</b> hoặc chọn trò chơi khác (Điền từ · Nối từ · Trắc nghiệm) ở thanh phía trên để luyện tập.</span>
      </div>

      <div id="vpList" class="st-vocab-preview-list">
        ${list.map((w, i) => `
          <div class="st-vocab-word-card">
            <div class="st-vocab-word-idx">${i + 1}</div>
            ${w.image_url
              ? `<img class="st-vocab-word-img" src="${esc(w.image_url)}" alt="${esc(w.word)}" onerror="this.style.display='none'"/>`
              : ''}
            <div class="st-vocab-word-body">
              <div class="st-vocab-word-en">
                <span>${esc(w.word)}</span>
                ${w.phonetic ? `<span class="st-vocab-word-phonetic">${esc(w.phonetic)}</span>` : ''}
                ${w.word_type ? `<span style="font-size:.7rem;font-weight:700;color:#6b7280;background:#f3f4f6;padding:.15rem .55rem;border-radius:6px;text-transform:uppercase">${esc(w.word_type)}</span>` : ''}
              </div>
              <div class="st-vocab-word-meaning">${esc(w.meaning)}</div>
              ${w.example ? `<div class="st-vocab-word-example">"${esc(w.example)}"</div>` : ''}
            </div>
          </div>`).join('')}
      </div>
    `;

    // Search filter
    const searchEl = document.getElementById('vpSearch');
    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        _vpFilter = e.target.value || '';
        vocabPreview(area);
        // Giữ focus + vị trí con trỏ
        const re = document.getElementById('vpSearch');
        if (re) {
          re.focus();
          const v = re.value;
          re.setSelectionRange(v.length, v.length);
        }
      });
    }

    // Start button → chuyển sang flashcard
    const startBtn = document.getElementById('vpStartBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const tabBtn = document.querySelector('.st-game-tab[data-game="flashcard"]');
        if (tabBtn) tabBtn.click();
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // GRAMMAR GAMES
  // ══════════════════════════════════════════════════════════════════

  function grammarFillInCard(area) {
    area = areaEl(area);
    if (!area) return;
    ctx._area = area;
    if (_gfIdx >= _gfQuestions.length) {
      const pct = Math.round(_gfScore / _gfQuestions.length * 100);
      area.innerHTML = `
      <div style="text-align:center;padding:2rem;background:var(--card);border-radius:16px;border:1.5px solid var(--border)">
        <div style="font-size:3rem;margin-bottom:.75rem">${pct === 100 ? '🏆' : pct >= 70 ? '🎉' : '📖'}</div>
        <div style="font-size:1.3rem;font-weight:900;color:var(--text);margin-bottom:.5rem">Kết quả: ${_gfScore}/${_gfQuestions.length} (${pct}%)</div>
        <div style="font-size:.9rem;color:var(--muted);margin-bottom:1.25rem">${pct === 100 ? 'Hoàn hảo!' : pct >= 70 ? 'Làm tốt lắm!' : 'Ôn lại lý thuyết nhé!'}</div>
        <button onclick="LearningGames.grammar.fillIn()"
          style="background:${btnGrad()};color:#fff;border:none;border-radius:12px;padding:.65rem 1.75rem;font-size:.9rem;font-weight:700;cursor:pointer">🔄 Chơi lại</button>
      </div>`;
      return;
    }
    const q = _gfQuestions[_gfIdx];
    area.innerHTML = `
    <div style="background:var(--card);border:1.5px solid var(--border);border-radius:16px;padding:1.5rem;max-width:560px;margin:0 auto">
      <div style="text-align:center;font-size:.78rem;color:var(--muted);font-weight:600;margin-bottom:.85rem">Câu ${_gfIdx + 1}/${_gfQuestions.length} · Điểm: ${_gfScore}</div>
      <div style="font-size:1rem;font-weight:700;color:var(--text);line-height:1.75;margin-bottom:.85rem;text-align:center">${formatBlank(q.question)}</div>
      <div style="text-align:center;font-size:.82rem;color:var(--muted);margin-bottom:.65rem">Điền từ/cấu trúc đúng vào chỗ trống</div>
      <input id="gfInput" type="text" placeholder="Nhập đáp án..."
        style="width:100%;padding:.65rem 1rem;border:2px solid var(--border);border-radius:12px;font-size:1rem;outline:none;text-align:center;background:var(--bg);color:var(--text)"
        onkeydown="if(event.key==='Enter')LearningGames.grammar.checkFillIn()"
        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"/>
      <div id="gfMsg" style="text-align:center;min-height:28px;margin-top:.6rem;font-size:.88rem;font-weight:700"></div>
      <div style="display:flex;gap:.65rem;margin-top:.85rem">
        <button onclick="LearningGames.grammar.checkFillIn()" style="flex:1;padding:.6rem;background:${btnGrad()};color:#fff;border:none;border-radius:10px;font-size:.9rem;font-weight:700;cursor:pointer">✓ Kiểm tra</button>
        <button onclick="LearningGames.grammar.skipFillIn()" style="padding:.6rem 1rem;border:1.5px solid var(--border);border-radius:10px;background:var(--bg);color:var(--muted);cursor:pointer;font-size:.85rem">Bỏ qua ▶</button>
      </div>
    </div>`;
    setTimeout(() => document.getElementById('gfInput')?.focus(), 50);
  }

  function grammarFillIn(area) {
    area = areaEl(area);
    if (!area) return;
    ctx._area = area;
    const qs = grammarQs();
    if (!qs.length) {
      area.innerHTML = '<p style="color:var(--muted);padding:2rem;text-align:center">Bài này chưa có câu hỏi. Giáo viên cần thêm câu hỏi quiz trước.</p>';
      return;
    }
    _gfQuestions = [...qs].sort(() => Math.random() - 0.5);
    _gfIdx = 0;
    _gfScore = 0;
    grammarFillInCard(area);
  }

  function checkGrammarFillIn() {
    const input = document.getElementById('gfInput');
    const msg = document.getElementById('gfMsg');
    if (!input || !msg) return;
    const q = _gfQuestions[_gfIdx];
    const correct = getCorrectOption(q).toLowerCase();
    const val = input.value.trim().toLowerCase();
    if (val === correct) {
      msg.style.color = '#10b981';
      msg.textContent = '✅ Chính xác!';
      _gfScore++;
      input.disabled = true;
      setTimeout(() => { _gfIdx++; grammarFillInCard(); }, 900);
    } else {
      msg.style.color = '#ef4444';
      msg.textContent = `❌ Sai! Đáp án: ${getCorrectOption(q)}`;
      input.style.borderColor = '#ef4444';
      setTimeout(() => { _gfIdx++; grammarFillInCard(); }, 1600);
    }
  }

  function skipGrammarFillIn() {
    _gfIdx++;
    grammarFillInCard();
  }

  function grammarMatch(area) {
    area = areaEl(area);
    if (!area) return;
    ctx._area = area;
    const qs = grammarQs();
    if (qs.length < 2) {
      area.innerHTML = '<p style="color:var(--muted);padding:2rem;text-align:center">Cần ít nhất 2 câu hỏi để chơi nối câu.</p>';
      return;
    }
    grammarMatchSetup(area);
  }

  function grammarMatchSetup(area) {
    area = areaEl(area);
    if (!area) return;
    ctx._area = area;
    const qs = grammarQs();
    const total = qs.length;
    const presets = [...new Set([4, 6, 8, 10, 12, total].filter(n => n >= 2 && n <= total))].sort((a, b) => a - b);
    const def = (_gmLastCount >= 2 && _gmLastCount <= total) ? _gmLastCount : Math.min(6, total);
    area.innerHTML = `
    <div style="max-width:420px;margin:0 auto;background:var(--card);border:1.5px solid var(--border);border-radius:16px;padding:1.25rem 1.5rem">
      <div style="text-align:center;font-weight:800;font-size:1rem;margin-bottom:.35rem">🔗 Chọn số cặp nối</div>
      <div style="text-align:center;font-size:.82rem;color:var(--muted);margin-bottom:1rem">Bài có <b style="color:var(--text)">${total}</b> câu — nối câu hỏi với cấu trúc/đáp án đúng</div>
      <div style="display:flex;flex-wrap:wrap;gap:.45rem;justify-content:center;margin-bottom:1rem">
        ${presets.map(n => `
          <button type="button" data-gmcount="${n}" onclick="LearningGames.grammar.selectMatchCount(${n},this)"
            style="${chipStyle(n === def)}">${n === total ? `Tất cả (${n})` : n + ' cặp'}</button>
        `).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:1.1rem">
        <label style="font-size:.82rem;color:var(--muted);font-weight:600">Tuỳ chọn:</label>
        <input type="number" id="gmCountInput" min="2" max="${total}" value="${def}"
          style="flex:1;padding:.5rem .65rem;border:2px solid var(--border);border-radius:10px;font-size:.95rem;text-align:center;font-weight:700;background:var(--bg);color:var(--text)"/>
        <span style="font-size:.82rem;color:var(--muted)">/ ${total}</span>
      </div>
      <button type="button" onclick="LearningGames.grammar.startMatchGame()"
        style="width:100%;padding:.75rem;border:none;background:${btnGrad()};color:#fff;border-radius:12px;font-size:.95rem;font-weight:800;cursor:pointer">
        ▶ Bắt đầu nối câu
      </button>
    </div>`;
  }

  function selectGrammarMatchCount(n, btn) {
    const inp = document.getElementById('gmCountInput');
    if (inp) inp.value = n;
    document.querySelectorAll('[data-gmcount]').forEach(b => {
      const active = b === btn;
      b.style.borderColor = accentBorder(active);
      b.style.background = accentBg(active);
      b.style.color = accentText(active);
    });
  }

  function startGrammarMatchGame() {
    const qs = grammarQs();
    const total = qs.length;
    const inp = document.getElementById('gmCountInput');
    let count = parseInt(inp?.value, 10);
    if (!count || count < 2) count = 2;
    if (count > total) count = total;
    _gmLastCount = count;
    grammarMatchBoard(areaEl(), count);
  }

  function grammarMatchBoard(area, count) {
    area = areaEl(area);
    if (!area) return;
    ctx._area = area;
    const qs = grammarQs();
    _gmSelected = { type: null, id: null };
    _gmMatched = new Set();
    count = Math.min(Math.max(count || 2, 2), qs.length);
    _gmPairs = [...qs].sort(() => Math.random() - 0.5).slice(0, count);
    const leftCol = [..._gmPairs].sort(() => Math.random() - 0.5);
    const rightCol = [..._gmPairs].sort(() => Math.random() - 0.5);
    const scrollWrap = _gmPairs.length > 8 ? 'max-height:60vh;overflow-y:auto;padding-right:.35rem' : '';
    area.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:.5rem;margin-bottom:.75rem;flex-wrap:wrap">
      <span style="font-size:.78rem;color:var(--muted);font-weight:600;background:var(--bg);border:1px solid var(--border);border-radius:999px;padding:.25rem .7rem">${count} cặp · Nối câu ↔ đáp án</span>
      <button type="button" onclick="LearningGames.grammar.match()"
        style="font-size:.78rem;font-weight:700;padding:.25rem .65rem;border:1.5px solid var(--border);border-radius:999px;background:var(--card);cursor:pointer">⚙️ Đổi số cặp</button>
    </div>
    <div style="text-align:center;font-size:.82rem;color:var(--muted);margin-bottom:1rem;font-weight:600">Chọn câu bên trái rồi chọn cấu trúc/đáp án đúng bên phải</div>
    <div id="gmScoreBar" style="text-align:center;font-size:.82rem;color:var(--muted);font-weight:600;margin-bottom:.85rem">Đã ghép: 0 / ${_gmPairs.length}</div>
    <div style="${scrollWrap}">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.65rem;max-width:820px;margin:0 auto">
        <div id="gmLeft" style="display:flex;flex-direction:column;gap:.5rem">
          ${leftCol.map(q => `<div class="st-match-word" id="gmq-${q.id}" data-id="${q.id}" onclick="LearningGames.grammar.matchClick('question','${q.id}')" title="${(q.question || '').replace(/"/g, '&quot;')}">${truncate(q.question, 80)}</div>`).join('')}
        </div>
        <div id="gmRight" style="display:flex;flex-direction:column;gap:.5rem">
          ${rightCol.map(q => `<div class="st-match-meaning" id="gma-${q.id}" data-id="${q.id}" onclick="LearningGames.grammar.matchClick('answer','${q.id}')" title="${getCorrectOption(q).replace(/"/g, '&quot;')}">${truncate(getCorrectOption(q), 70)}</div>`).join('')}
        </div>
      </div>
    </div>`;
  }

  function grammarMatchClick(type, id) {
    const el = document.getElementById(type === 'question' ? `gmq-${id}` : `gma-${id}`);
    if (!el || el.classList.contains('matched')) return;
    if (_gmSelected.type === type) {
      const oldEl = document.getElementById(_gmSelected.type === 'question' ? `gmq-${_gmSelected.id}` : `gma-${_gmSelected.id}`);
      if (oldEl) oldEl.classList.remove('selected');
      _gmSelected = { type, id };
      el.classList.add('selected');
      return;
    }
    if (!_gmSelected.type) {
      _gmSelected = { type, id };
      el.classList.add('selected');
      return;
    }
    const qId = type === 'question' ? id : _gmSelected.id;
    const aId = type === 'answer' ? id : _gmSelected.id;
    const qEl = document.getElementById(`gmq-${qId}`);
    const aEl = document.getElementById(`gma-${aId}`);
    if (String(qId) === String(aId)) {
      qEl?.classList.replace('selected', 'matched');
      aEl?.classList.replace('selected', 'matched');
      _gmMatched.add(String(qId));
      const bar = document.getElementById('gmScoreBar');
      if (bar) bar.textContent = `Đã ghép: ${_gmMatched.size} / ${_gmPairs.length}`;
      if (_gmMatched.size === _gmPairs.length) {
        const replayCount = _gmPairs.length;
        const container = areaEl();
        setTimeout(() => {
          container?.insertAdjacentHTML('afterbegin',
            `<div style="text-align:center;background:#d1fae5;border:2px solid #10b981;border-radius:14px;padding:1rem;margin-bottom:1rem;font-weight:800;color:#065f46">
            🏆 Hoàn thành! Ghép đúng ${replayCount} cặp!
            <button onclick="LearningGames.grammar.matchBoard(null,${replayCount})" style="margin-left:.5rem;background:#10b981;color:#fff;border:none;border-radius:8px;padding:.35rem .9rem;cursor:pointer;font-weight:700">🔄 Chơi lại</button>
            <button onclick="LearningGames.grammar.match()" style="margin-left:.35rem;background:#fff;color:#065f46;border:1.5px solid #10b981;border-radius:8px;padding:.35rem .9rem;cursor:pointer;font-weight:700">⚙️ Đổi số cặp</button>
          </div>`);
        }, 300);
      }
    } else {
      qEl?.classList.add('wrong');
      aEl?.classList.add('wrong');
      setTimeout(() => { qEl?.classList.remove('wrong', 'selected'); aEl?.classList.remove('wrong', 'selected'); }, 600);
    }
    _gmSelected = { type: null, id: null };
  }

  const vocab = {
    vocabPreview,
    flashcard,
    fcMark,
    fcGoTo,
    startNewRound,
    _resetFcState,
    _getFcKnown,
    restoreFcState,
    loadVocabProgress,
    saveVocabProgress,
    fillIn,
    fillInCard,
    checkFillIn,
    skipFillIn,
    match,
    matchSetup,
    selectMatchCount,
    startMatchGame,
    matchBoard,
    matchClick,
    vocabQuiz,
    vocabQuizCard,
    checkVocabQuiz,
    vocabQuizPrev,
    vocabQuizNext,
    vocabQuizFinish,
    reviewQuiz
  };

  const grammar = {
    getCorrectOption,
    formatBlank,
    fillIn: grammarFillIn,
    fillInCard: grammarFillInCard,
    checkFillIn: checkGrammarFillIn,
    skipFillIn: skipGrammarFillIn,
    match: grammarMatch,
    matchSetup: grammarMatchSetup,
    selectMatchCount: selectGrammarMatchCount,
    startMatchGame: startGrammarMatchGame,
    matchBoard: grammarMatchBoard,
    matchClick: grammarMatchClick
  };

  // Global aliases for onclick (optional shortcuts)
  window.LG_vocab_checkFillIn = () => window.LearningGames.vocab.checkFillIn();
  window.LG_vocab_skipFillIn = () => window.LearningGames.vocab.skipFillIn();
  window.LG_vocab_match = () => window.LearningGames.vocab.match();
  window.LG_vocab_matchClick = (type, id) => window.LearningGames.vocab.matchClick(type, id);
  window.LG_vocab_vocabQuiz = () => window.LearningGames.vocab.vocabQuiz();
  window.LG_vocab_checkVocabQuiz = (i, c) => window.LearningGames.vocab.checkVocabQuiz(i, c);
  window.LG_grammar_checkFillIn = () => window.LearningGames.grammar.checkFillIn();
  window.LG_grammar_skipFillIn = () => window.LearningGames.grammar.skipFillIn();
  window.LG_grammar_match = () => window.LearningGames.grammar.match();
  window.LG_grammar_matchClick = (type, id) => window.LearningGames.grammar.matchClick(type, id);

  return { setCtx, vocab, grammar };
})();
