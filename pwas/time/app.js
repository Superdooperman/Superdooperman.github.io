/* Rooster Timer: TimeTrack (task tracker) + Pomodoro egg timer. All timing is timestamp-based. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const LS = { get: (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } }, set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- shared data (existing keys kept: timeTasks, timeSessions) ----------
  let tasks = LS.get('timeTasks', []), sessions = LS.get('timeSessions', []);
  let current = LS.get('timeCurrent', null);              // running tracker session {taskId,startTime}
  const save = () => { LS.set('timeTasks', tasks); LS.set('timeSessions', sessions); LS.set('timeCurrent', current); };
  const fmtDur = (sec) => `${Math.floor(sec / 3600)}h ${Math.floor(sec % 3600 / 60)}m ${sec % 60}s`;
  const pad = (n) => String(n).padStart(2, '0');
  const fmtHMS = (ms) => { const t = Math.max(0, Math.floor(ms / 1000)); return `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t % 3600 / 60))}:${pad(t % 60)}`; };
  const fmtMS = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`; };
  const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  function logSession(taskId, start, sec, type) {
    const task = tasks.find((t) => t.id === taskId);
    if (task) task.totalSeconds = (task.totalSeconds || 0) + sec;
    sessions.unshift({ taskId, taskName: task ? task.name : 'Unassigned', start, end: start + sec * 1000, duration: sec, type: type || 'tracker' });
    save();
  }

  // ---------- tabs ----------
  document.querySelectorAll('.tabs button').forEach((b) => b.onclick = () => showTab(b.dataset.tab));
  function showTab(name) {
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    document.querySelectorAll('.tab').forEach((s) => s.classList.toggle('on', s.id === 'tab-' + name));
    if (name === 'hist') renderHistory();
    if (name === 'track') renderTasks();
  }

  // ---------- TRACKER ----------
  let editMode = false, editingId = null;
  function renderTasks() {
    tasks.sort((a, b) => (b.totalSeconds || 0) - (a.totalSeconds || 0));
    const g = $('taskGrid'); g.innerHTML = '';
    if (!tasks.length) g.innerHTML = '<p class="empty">No tasks yet. Make one and the rooster starts counting.</p>';
    tasks.forEach((t) => {
      const run = current && current.taskId === t.id;
      const el = document.createElement('div');
      el.className = 'task-btn' + (run ? ' running' : '') + (editMode ? ' edit-mode' : '');
      el.tabIndex = 0;
      el.innerHTML = `<div class="task-name-small">${esc(t.name)}</div><div class="task-time">${fmtDur(t.totalSeconds || 0)}</div>` +
        `<div class="task-eggs">${'🥚'.repeat(Math.min(5, eggsFor(t.id)))}${eggsFor(t.id) > 5 ? ' ×' + eggsFor(t.id) : ''}</div>` +
        `<button class="delete-btn" aria-label="Delete">×</button>`;
      el.querySelector('.delete-btn').onclick = (e) => { e.stopPropagation(); deleteTask(t.id); };
      el.onclick = () => editMode ? openEdit(t.id) : toggleTask(t.id);
      el.onkeydown = (e) => { if (e.key === 'Enter') el.onclick(); };
      g.appendChild(el);
    });
    const tot = tasks.reduce((s, t) => s + (t.totalSeconds || 0), 0); $('totalTime').textContent = fmtDur(tot);
    $('timerArea').hidden = !current;
    if (current) { const t = tasks.find((x) => x.id === current.taskId); $('currentTaskName').textContent = t ? t.name : ''; }
    fillTaskSelect();
  }
  const eggsFor = (id) => sessions.filter((s) => s.type === 'pomodoro' && s.taskId === id).length;
  function toggleTask(id) { const was = current && current.taskId === id; if (current) stopTracker(); if (!was) { current = { taskId: id, startTime: Date.now() }; save(); renderTasks(); } }
  function stopTracker() {
    if (!current) return;
    logSession(current.taskId, current.startTime, Math.floor((Date.now() - current.startTime) / 1000), 'tracker');
    current = null; save(); renderTasks();
  }
  function deleteTask(id) {
    if (!confirm('Delete this task and all its time?')) return;
    if (current && current.taskId === id) { current = null; }
    tasks = tasks.filter((t) => t.id !== id); sessions = sessions.filter((s) => s.taskId !== id);
    if (pomo.taskId === id) { pomo.taskId = null; savePomo(); }
    save(); renderTasks();
  }
  function openModal(id) { $(id).classList.add('on'); const i = $(id).querySelector('input'); if (i) setTimeout(() => i.focus(), 50); }
  function closeModals() { document.querySelectorAll('.modal').forEach((m) => m.classList.remove('on')); }
  document.querySelectorAll('[data-close]').forEach((b) => b.onclick = closeModals);
  document.querySelectorAll('.modal').forEach((m) => m.onclick = (e) => { if (e.target === m) closeModals(); });
  function openEdit(id) { editingId = id; $('editInput').value = tasks.find((t) => t.id === id).name; openModal('editModal'); }
  function saveEdit() { const n = $('editInput').value.trim(); if (n && editingId) { const t = tasks.find((x) => x.id === editingId); t.name = n; sessions.forEach((s) => { if (s.taskId === editingId) s.taskName = n; }); save(); renderTasks(); } closeModals(); }
  function createTask() {
    const n = $('taskInput').value.trim(); if (!n) return;
    const t = { id: Date.now(), name: n, totalSeconds: 0 }; tasks.unshift(t); $('taskInput').value = ''; closeModals();
    if (current) stopTracker(); current = { taskId: t.id, startTime: Date.now() }; save(); renderTasks();
  }
  $('newTaskBtn').onclick = () => openModal('newModal'); $('newOk').onclick = createTask; $('editOk').onclick = saveEdit;
  $('taskInput').onkeydown = (e) => { if (e.key === 'Enter') createTask(); }; $('editInput').onkeydown = (e) => { if (e.key === 'Enter') saveEdit(); };
  $('stopBtn').onclick = stopTracker;
  $('editBtn').onclick = () => { editMode = !editMode; $('editBtn').textContent = editMode ? '✔ Done' : '✏️ Edit'; renderTasks(); };

  // ---------- HISTORY ----------
  function renderHistory() {
    const cv = $('barChart'), c = cv.getContext('2d'), list = tasks.slice(0, 8);
    cv.height = Math.max(120, 30 + list.length * 34);
    c.clearRect(0, 0, cv.width, cv.height);
    const max = Math.max(1, ...list.map((t) => t.totalSeconds || 0));
    c.font = '15px "Lilita One", sans-serif'; c.textBaseline = 'middle';
    if (!list.length) { c.fillStyle = '#888'; c.fillText('No tasks yet', 20, 40); }
    list.forEach((t, i) => {
      const y = 20 + i * 34, w = (t.totalSeconds || 0) / max * (cv.width - 290);
      c.fillStyle = '#fff'; c.textAlign = 'right'; c.fillText(t.name.slice(0, 18), 150, y + 11);
      c.fillStyle = '#000'; c.fillRect(163, y + 3, w + 2, 20); c.fillStyle = '#e10600'; c.fillRect(160, y, w, 20);
      c.fillStyle = '#ccc'; c.textAlign = 'left'; c.fillText(fmtDur(t.totalSeconds || 0) + (eggsFor(t.id) ? `  🥚${eggsFor(t.id)}` : ''), 170 + w, y + 11);
    });
    const h = $('historyList');
    h.innerHTML = sessions.length ? sessions.slice(0, 200).map((s) => `<div class="hitem ${s.type === 'pomodoro' ? 'egg' : ''}"><div><strong>${s.type === 'pomodoro' ? '🥚 ' : ''}${esc(s.taskName)}</strong><span>${fmtDur(s.duration)}</span></div><small>${new Date(s.start).toLocaleString()}</small></div>`).join('')
      : '<p class="empty">No sessions recorded yet.</p>';
  }
  $('exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify({ app: 'rooster-timer', version: 2, tasks, sessions, pomoSettings: set, exportDate: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `rooster-timer-${dayKey(Date.now())}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('importBtn').onclick = () => $('importFile').click();
  $('importFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.tasks) || !Array.isArray(d.sessions)) throw new Error('missing tasks/sessions');
      if (!confirm(`Import ${d.tasks.length} tasks and ${d.sessions.length} sessions? This replaces current data.`)) return;
      tasks = d.tasks; sessions = d.sessions; current = null; if (d.pomoSettings) { Object.assign(set, d.pomoSettings); LS.set('pomoSettings', set); }
      save(); renderTasks(); renderHistory(); updateStats();
    } catch (err) { alert('Could not import: ' + err.message); }
    e.target.value = '';
  };

  // ---------- POMODORO ----------
  const DEF = { focus: 25, short: 5, long: 15, every: 4, autoStart: false, notify: false, wake: false, volume: 0.6, muted: false };
  const set = Object.assign({}, DEF, LS.get('pomoSettings', {}));
  const pomo = Object.assign({ phase: 'focus', endsAt: null, pausedRemaining: null, cycle: 0, taskId: null, startedAt: null }, LS.get('pomoState', {}));
  const savePomo = () => LS.set('pomoState', pomo);
  const dur = (ph) => set[ph] * 60000;
  const running = () => !!pomo.endsAt;
  const remaining = () => running() ? pomo.endsAt - Date.now() : (pomo.pausedRemaining != null ? pomo.pausedRemaining : dur(pomo.phase));
  const LABEL = { focus: 'Focus', short: 'Short break', long: 'Long break' };
  let doneUntil = 0, wakeLock = null;

  function fillTaskSelect() {
    const s = $('pomoTask'); const v = pomo.taskId;
    s.innerHTML = '<option value="">Unassigned</option>' + tasks.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
    s.value = v && tasks.some((t) => t.id === v) ? String(v) : '';
  }
  $('pomoTask').onchange = (e) => { pomo.taskId = e.target.value ? Number(e.target.value) : null; savePomo(); };

  function start() {
    unlockAudio();
    if (set.notify && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    if (running()) return;
    const rem = remaining();
    if (pomo.pausedRemaining == null) pomo.startedAt = Date.now();
    pomo.endsAt = Date.now() + rem; pomo.pausedRemaining = null; savePomo(); wake(true); ui();
  }
  function pause() { if (!running()) return; pomo.pausedRemaining = Math.max(0, pomo.endsAt - Date.now()); pomo.endsAt = null; savePomo(); wake(false); ui(); }
  function reset() { pomo.endsAt = null; pomo.pausedRemaining = null; pomo.startedAt = null; savePomo(); wake(false); ui(); }
  function nextPhase(completed) {
    if (pomo.phase === 'focus') {
      if (completed) {
        const sec = Math.round(dur('focus') / 1000);
        logSession(pomo.taskId, pomo.endsAt ? pomo.endsAt - sec * 1000 : Date.now() - sec * 1000, sec, 'pomodoro');
        renderTasks();
      }
      pomo.cycle += 1;
      pomo.phase = pomo.cycle % set.every === 0 ? 'long' : 'short';
    } else pomo.phase = 'focus';
    pomo.endsAt = null; pomo.pausedRemaining = null; pomo.startedAt = null; savePomo();
  }
  function phaseEnd() {
    const was = pomo.phase;
    nextPhase(true);
    doneUntil = Date.now() + 4000; doneAt = performance.now();
    $('bubble').hidden = false; $('bubble').textContent = was === 'focus' ? 'PAH KAW!' : 'BACK TO WORK!';
    setTimeout(() => { $('bubble').hidden = true; }, 3800);
    was === 'focus' ? crow() : blips();
    notify(was === 'focus' ? 'PAH KAW! Egg laid 🥚' : 'Break over', was === 'focus' ? `Focus done. ${LABEL[pomo.phase]} time.` : 'Back to the coop: focus time.');
    if (set.autoStart) start(); else { wake(false); ui(); }
    updateStats();
  }
  function skip() { const wasRunning = running(); nextPhase(false); if (wasRunning && set.autoStart) start(); ui(); }
  function setPhase(ph) { if (running() && !confirm('Switch phase and reset the current timer?')) return; pomo.phase = ph; reset(); }

  $('startBtn').onclick = () => running() ? pause() : start();
  $('skipBtn').onclick = skip; $('resetBtn').onclick = reset;
  document.querySelectorAll('#phasePills button').forEach((b) => b.onclick = () => setPhase(b.dataset.ph));

  function notify(title, body) {
    if (!set.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    const opt = { body, icon: 'time/icon-192.png', tag: 'rooster-timer', renotify: true };
    navigator.serviceWorker && navigator.serviceWorker.getRegistration ? navigator.serviceWorker.getRegistration().then((r) => r ? r.showNotification(title, opt) : new Notification(title, opt)).catch(() => {}) : new Notification(title, opt);
  }
  async function wake(on) {
    try {
      if (on && set.wake && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
      if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch { wakeLock = null; }
  }

  // ---------- sound (WebAudio, no files) ----------
  let actx = null;
  function unlockAudio() { if (!actx) { const A = window.AudioContext || window.webkitAudioContext; if (A) actx = new A(); } if (actx && actx.state === 'suspended') actx.resume(); }
  function tone(t0, f0, f1, d, type, v) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + d);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + d + 0.02);
  }
  function crow() { // 8-bit "PAH KAW!": short PAH, long rising-falling KAAAW with vibrato
    if (set.muted || !actx) return; const v = 0.25 * set.volume, t = actx.currentTime + 0.02;
    tone(t, 520, 700, 0.12, 'square', v);
    tone(t + 0.2, 600, 1250, 0.18, 'square', v); tone(t + 0.38, 1250, 1050, 0.25, 'square', v); tone(t + 0.63, 1050, 700, 0.3, 'sawtooth', v * 0.8);
  }
  function blips() { if (set.muted || !actx) return; const v = 0.2 * set.volume, t = actx.currentTime + 0.02; tone(t, 880, 880, 0.09, 'square', v); tone(t + 0.14, 1320, 1320, 0.12, 'square', v); }
  function muteUI() { $('muteBtn').textContent = set.muted ? '🔇' : '🔊'; }
  $('muteBtn').onclick = () => { set.muted = !set.muted; LS.set('pomoSettings', set); muteUI(); };

  // ---------- settings ----------
  const F = { sFocus: 'focus', sShort: 'short', sLong: 'long', sEvery: 'every' };
  $('setBtn').onclick = () => {
    for (const k in F) $(k).value = set[F[k]];
    $('sAuto').checked = set.autoStart; $('sNotify').checked = set.notify; $('sWake').checked = set.wake; $('sVol').value = set.volume;
    $('spriteInfo').textContent = Rooster.custom ? 'Rooster art: custom sprite sheet loaded.' : 'Rooster art: placeholder (drop rooster-sprites.png into /pwas/time/ to swap).';
    openModal('setModal');
  };
  for (const k in F) $(k).onchange = (e) => { const n = Math.round(Number(e.target.value)); if (n >= Number(e.target.min) && n <= Number(e.target.max)) { set[F[k]] = n; LS.set('pomoSettings', set); if (!running() && pomo.pausedRemaining == null) ui(); } };
  $('sAuto').onchange = (e) => { set.autoStart = e.target.checked; LS.set('pomoSettings', set); };
  $('sWake').onchange = (e) => { set.wake = e.target.checked; LS.set('pomoSettings', set); if (running()) wake(set.wake); };
  $('sNotify').onchange = async (e) => {
    set.notify = e.target.checked;
    if (set.notify && 'Notification' in window && Notification.permission !== 'granted') { const p = await Notification.requestPermission(); if (p !== 'granted') { set.notify = false; e.target.checked = false; alert('Notifications are blocked for this site in your browser settings.'); } }
    LS.set('pomoSettings', set);
  };
  $('sSpin').value = set.spin || (reduced ? 'tick' : 'smooth'); $('sSpin').onchange = (e) => { set.spin = e.target.value; LS.set('pomoSettings', set); };
  $('sVol').oninput = (e) => { set.volume = Number(e.target.value); LS.set('pomoSettings', set); };
  $('testSnd').onclick = () => { unlockAudio(); const m = set.muted; set.muted = false; crow(); set.muted = m; };

  // ---------- stats ----------
  function updateStats() {
    const eggs = sessions.filter((s) => s.type === 'pomodoro'), today = dayKey(Date.now());
    const days = new Set(eggs.map((s) => dayKey(s.start)));
    let streak = 0; const d = new Date(); if (!days.has(today)) d.setDate(d.getDate() - 1);
    while (days.has(dayKey(d.getTime()))) { streak++; d.setDate(d.getDate() - 1); }
    const nToday = eggs.filter((s) => dayKey(s.start) === today).length;
    $('stToday').textContent = nToday; $('stStreak').textContent = streak; $('stTotal').textContent = eggs.length;
    $('nest').innerHTML = nToday ? '<span class="egg-i"></span>'.repeat(Math.min(nToday, 16)) + (nToday > 16 ? `<b>+${nToday - 16}</b>` : '') : '<small>Your nest is empty. Finish a focus to lay an egg.</small>';
  }

  // ---------- UI + render loop ----------
  function ui() {
    const r = running(), rem = remaining();
    $('startBtn').textContent = r ? '❚❚ PAUSE' : (pomo.pausedRemaining != null ? '▶ RESUME' : '▶ START');
    document.querySelectorAll('#phasePills button').forEach((b) => b.classList.toggle('on', b.dataset.ph === pomo.phase));
    document.body.dataset.phase = pomo.phase;
    $('phaseLabel').textContent = pomo.phase === 'focus' ? `Focus · egg ${pomo.cycle % set.every + 1} of ${set.every}` : `${LABEL[pomo.phase]}${pomo.phase === 'long' ? ' · nap time' : ' · glide it off'}`;
    $('clock').textContent = fmtMS(rem);
    const frac = 1 - rem / dur(pomo.phase);
    $('ring').style.setProperty('--p', Math.max(0, Math.min(1, frac)));
    document.title = r || pomo.pausedRemaining != null ? `${r ? (pomo.phase === 'focus' ? '🥚' : '🐓') : '❚❚'} ${fmtMS(rem)} ${LABEL[pomo.phase]} · Rooster Timer` : 'Rooster Timer · Superdooper Arcade';
  }
  const egg = new EggTimer($('egg')), bctx = $('buddy').getContext('2d');
  let doneAt = 0, lastSec = -1;
  function loop(now) {
    if (running() && pomo.endsAt <= Date.now()) phaseEnd();
    const rem = remaining(), total = dur(pomo.phase), t = now / 1000, done = Date.now() < doneUntil;
    const sec = Math.ceil(rem / 1000); if (sec !== lastSec) { lastSec = sec; ui(); }
    const mode = running() ? 'run' : (pomo.pausedRemaining != null ? 'paused' : 'idle');
    egg.update(now, mode);
    const lowFrac = rem / total, focusRun = pomo.phase === 'focus' && (running() || pomo.pausedRemaining != null);
    const spin = set.spin || (reduced ? 'tick' : 'smooth'), remR = spin === 'tick' ? Math.ceil(rem / 1000) * 1000 : rem;
    const rot = spin === 'off' || done ? 0 : -2 * Math.PI * ((remR % 60000) / 60000);  // one full turn per minute of countdown
    egg.draw({ rot, t, crack: focusRun && lowFrac < 0.35 ? (0.35 - lowFrac) / 0.35 : (done ? 1 : 0), open: done, popped: done });
    const wob = reduced ? 0 : (done ? Math.sin(t * 30) * 4 : (running() && rem < 60000 ? Math.sin(t * (rem < 10000 ? 28 : 14)) * (rem < 10000 ? 5 : 2.5) : 0));
    $('egg').style.transform = `rotate(${wob}deg)`;
    // buddy rooster
    let st = 'idle';
    if (done) st = 'done'; else if (mode === 'paused') st = 'paused';
    else if (running()) st = pomo.phase === 'focus' ? 'focus' : pomo.phase;
    bctx.clearRect(0, 0, 32, 32);
    Rooster.draw(bctx, st, st === 'done' ? (now - doneAt) / 1000 : (reduced ? 0 : t), 0, 0, 1, st === 'focus' && rem < 60000);
    requestAnimationFrame(loop);
  }

  // keyboard
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input,select,textarea') || document.querySelector('.modal.on')) { if (e.key === 'Escape') closeModals(); return; }
    if (!$('tab-pomo').classList.contains('on')) return;
    if (e.code === 'Space') { e.preventDefault(); $('startBtn').click(); }
    else if (e.key === 's' || e.key === 'S') skip(); else if (e.key === 'r' || e.key === 'R') reset();
    else if (e.key === 'm' || e.key === 'M') $('muteBtn').click();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (running() && pomo.endsAt <= Date.now()) phaseEnd(); ui(); if (running()) wake(true); } });
  // tracker live clock (timestamp based)
  setInterval(() => { if (current) $('liveTimer').textContent = fmtHMS(Date.now() - current.startTime); }, 250);
  // background tab: tab title keeps counting even when rAF is paused
  setInterval(() => { if (document.hidden) { if (running() && pomo.endsAt <= Date.now()) phaseEnd(); ui(); } }, 1000);

  Rooster.load('time/rooster-sprites.png');
  renderTasks(); updateStats(); muteUI(); ui();
  if (/[?&]pomo=start/.test(location.search)) { pomo.phase = 'focus'; if (!running()) start(); }
  if (/[?&]tab=track/.test(location.search)) showTab('track');
  requestAnimationFrame(loop);
})();
