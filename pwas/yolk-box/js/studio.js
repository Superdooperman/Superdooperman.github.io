// Midnight's Yolk Box - brick shelf, song timeline, brick / trim dialogs, quick tour and long-press tips.
// Everything here works on plain data through the API object handed over by app.js.
import * as B from './bricks.js';

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LS_COACH = 'yolkbox.coach.done';

export function initStudio(A) {
  let sel = [], multi = false, ppb = Math.round(Math.max(28, Math.min(48, innerWidth / 14))), head = 0, loopSel = false, lastClipEnd = 0;
  const lib = () => A.lib, clips = () => A.P.clips, brick = (id) => A.lib.find((b) => b.id === id);
  const tl = $('#timeline'), lane = $('#lane'), ruler = $('#ruler'), headEl = $('#tlHead');

  // ---------------------------------------------------------------- shelf
  function dots(cv, st) {
    const W = cv.width = 240, H = cv.height = 60, g = cv.getContext('2d'), d = B.brickDots(st), bars = st.kk.loop.bars;
    g.fillStyle = '#060a1a'; g.fillRect(0, 0, W, H);
    const cw = W / 16, rows = [['kick', '#e0352b'], ['snare', '#f4efe1'], ['hats', '#f6c431']];
    rows.forEach(([k, c], r) => d[k].forEach((on, i) => { g.fillStyle = on ? c : '#ffffff14'; g.beginPath(); g.arc(i * cw + cw / 2, 8 + r * 11, on ? 3.4 : 1.6, 0, 7); g.fill(); }));
    d.bass.forEach((n, i) => { if (n < 0) return; g.fillStyle = '#2f9e44'; g.fillRect(i * cw + 2, 50 - Math.max(-6, Math.min(18, n)) * 0.6 - 4, cw - 4, 4); });
    g.fillStyle = '#ffffffcc'; for (const [p, x] of d.kk) { g.fillRect(p * W, 4 + (1 - x) * (H - 12), 3, 3); }
    if (bars > 1) { g.fillStyle = '#ffffff55'; for (let b = 1; b < bars; b++) g.fillRect((b / bars) * W, 0, 1, H); }
  }
  function renderShelf() {
    const sh = $('#shelf'); sh.innerHTML = '';
    if (!lib().length) { sh.innerHTML = '<p class="hint">No bricks yet. Make something in the workspace, then press SAVE AS BRICK.</p>'; return; }
    for (const b of lib()) {
      const c = document.createElement('div'); c.className = 'bcard'; c.style.setProperty('--bc', b.color); c.dataset.id = b.id;
      c.innerHTML = `<span class="lock" title="Locked: a saved brick never changes. Open it in the workspace to make a new version.">&#128274;</span>
        <div class="bname">${A.esc(b.name)}</div><div class="bmeta">${A.esc(b.bars)} bar${b.bars > 1 ? 's' : ''}${b.v > 1 ? ' &middot; v' + A.esc(b.v) : ''}</div><canvas></canvas>
        <div class="bbtns"><button class="btn sm" data-a="prev" aria-label="Preview ${A.esc(b.name)}" title="Listen to this brick">&#9654;</button><button class="btn sm" data-a="add" aria-label="Add ${A.esc(b.name)} to the song" title="Add to the song">+</button><button class="btn sm" data-a="more" aria-label="More for ${A.esc(b.name)}" title="Open, duplicate, rename, trim, delete">&hellip;</button></div>`;
      dots($('canvas', c), b.state);
      $('[data-a=prev]', c).onclick = () => preview(b.id);
      $('[data-a=add]', c).onclick = () => addBrick(b.id);
      $('[data-a=more]', c).onclick = (e) => menu(e.currentTarget, [
        ['Open in workspace (copy)', () => { A.openBrick(b.id); A.goScreen(0); }],
        ['Add to song', () => addBrick(b.id)],
        ['Duplicate', () => { const n = A.dupBrick(b.id); A.toast(`Made "${n.name}"`); }],
        ['Rename', () => { const n = (prompt('Rename brick:', b.name) || '').trim(); if (n) A.renameBrick(b.id, n.slice(0, 24)); }],
        ['Trim', () => openTrim({ brick: b.id })],
        ['Delete', () => { const u = A.usedIn(b.id); if (confirm(`Delete brick "${b.name}"?` + (u.length ? `\nIt will also be removed from: ${u.join(', ')}` : ''))) A.deleteBrick(b.id); }],
      ]);
      shelfDrag(c, b.id);
      sh.appendChild(c);
    }
    playUI();
  }
  function preview(id) {
    if (A.playing && A.mode === 'prev' && A.src.brick === id) return A.stop();
    A.playSrc({ kind: 'prev', brick: id });
  }
  function addBrick(id, at = null) {
    const c = B.newClip(id), cl = clips();
    const pos = at ?? (sel.length ? Math.max(...sel.map((u) => cl.findIndex((x) => x.uid === u))) + 1 : cl.length);
    A.setClips(B.insertClips(cl, [c], pos)); sel = [c.uid]; multi = false; render(); scrollTo(c.uid);
    A.toast(`Added "${brick(id).name}" to the song`);
  }
  // drag a brick card into the timeline (mouse: any direction; touch: pull it downwards)
  function shelfDrag(card, id) {
    let st = null, ghost = null;
    const start = (x, y) => (st = { x, y, on: false });
    const move = (x, y, ev, touch) => {
      if (!st) return;
      if (!st.on) {
        const dx = x - st.x, dy = y - st.y;
        if (touch && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { st = null; return; }   // horizontal = scroll the shelf
        if (Math.hypot(dx, dy) < 10) return;
        st.on = true; ghost = card.cloneNode(true); Object.assign(ghost.style, { position: 'fixed', zIndex: 70, pointerEvents: 'none', width: card.offsetWidth + 'px', opacity: 0.85 }); document.body.appendChild(ghost);
      }
      ev.preventDefault(); ghost.style.left = x - 60 + 'px'; ghost.style.top = y - 30 + 'px'; dropMark(x, y);
    };
    const end = (x, y) => {
      if (st && st.on) { ghost.remove(); const i = dropIndex(x, y); clearMark(); if (i != null) addBrick(id, i); }
      st = null; ghost = null;
    };
    card.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.target.closest('button')) return; start(e.clientX, e.clientY);
      const mm = (ev) => move(ev.clientX, ev.clientY, ev, false), mu = (ev) => { removeEventListener('pointermove', mm); removeEventListener('pointerup', mu); end(ev.clientX, ev.clientY); };
      addEventListener('pointermove', mm); addEventListener('pointerup', mu); });
    card.addEventListener('touchstart', (e) => { if (e.touches.length === 1 && !e.target.closest('button')) start(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    card.addEventListener('touchmove', (e) => { const t = e.touches[0]; move(t.clientX, t.clientY, e, true); }, { passive: false });
    card.addEventListener('touchend', (e) => { const t = e.changedTouches[0]; end(t.clientX, t.clientY); });
  }

  // ---------------------------------------------------------------- timeline
  const starts = () => { let a = 0; return clips().map((c) => { const s = a; a += B.clipBars(c, lib()); return s; }); };
  function render() {
    const cl = clips(), S0 = starts(), total = B.songBars(cl, lib());
    sel = sel.filter((u) => cl.some((c) => c.uid === u)); if (!sel.length) multi = false;
    tl.style.setProperty('--ppb', ppb + 'px');
    const W = Math.max(tl.clientWidth - 4, (total + 8) * ppb); lane.style.width = ruler.style.width = W + 'px';
    const every = ppb < 22 ? 4 : ppb < 40 ? 2 : 1;
    ruler.innerHTML = Array.from({ length: Math.ceil(W / ppb) }, (_, i) => (i % every ? '' : `<b style="left:${i * ppb}px">${i + 1}</b>`)).join('');
    lane.innerHTML = cl.length ? '' : '<div class="tlempty">Your song is empty. Tap + on a brick above (or drag one here).</div>';
    cl.forEach((c, i) => {
      const b = brick(c.brick); if (!b) return;
      const el = document.createElement('div'); el.className = 'clip' + (sel.includes(c.uid) ? ' sel' : ''); el.dataset.uid = c.uid;
      el.style.left = S0[i] * ppb + 'px'; el.style.width = b.bars * c.rep * ppb - 3 + 'px'; el.style.setProperty('--bc', b.color); el.style.setProperty('--rw', b.bars * ppb + 'px');
      if (c.rep === 1) el.style.backgroundImage = 'none';
      el.innerHTML = `<div class="cname">${A.esc(b.name)}</div><div class="cbars">${A.esc(b.bars * c.rep)} bar${b.bars * c.rep > 1 ? 's' : ''}</div><button class="rep" title="Repeat: tap to change how many times this clip plays">x${A.esc(c.rep)}</button>`;
      el.setAttribute('role', 'button'); el.setAttribute('aria-label', `${b.name}, ${b.bars * c.rep} bars, repeat ${c.rep}`);
      $('.rep', el).onclick = (e) => { e.stopPropagation(); if (!sel.includes(c.uid)) { sel = [c.uid]; render(); } repeatMenu(e.currentTarget); };
      clipGestures(el, c.uid);
      lane.appendChild(el);
    });
    lastClipEnd = total;
    const sec = total * 16 * 60 / A.S.bpm / 4;
    $('#songInfo').textContent = `${A.P.name}: ${total} bar${total === 1 ? '' : 's'} = ${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')} at ${Math.round(A.S.bpm)} BPM`;
    head = Math.min(head, total); headEl.style.left = head * ppb + 'px';
    tools();
  }
  function tools() {
    const t = $('#clipTools'), cl = clips(), n = sel.length;
    const B_ = (label, fn, title, cls = '') => { const b = document.createElement('button'); b.className = 'btn sm ' + cls; b.innerHTML = label; b.title = title; b.onclick = (e) => fn(e); return b; };
    t.innerHTML = '';
    if (!n) {
      t.insertAdjacentHTML('beforeend', '<span class="ttl">Tap a clip to edit it</span>');
      t.appendChild(B_('+ Add brick', (e) => menu(e.currentTarget, lib().map((b) => [`${b.name} (${b.bars} bar${b.bars > 1 ? 's' : ''})`, () => addBrick(b.id)])), 'Add a brick to the end of the song'));
      if (cl.length) t.appendChild(B_('Select all', () => { sel = cl.map((c) => c.uid); multi = true; render(); }, 'Select every clip'));
      return;
    }
    const one = n === 1 && cl.find((c) => c.uid === sel[0]);
    t.insertAdjacentHTML('beforeend', `<span class="ttl">${n === 1 ? A.esc(brick(one.brick).name) : n + ' clips'}</span>`);
    t.appendChild(B_('Duplicate', dup, 'Copy right after (Ctrl/Cmd+D)'));
    t.appendChild(B_('Repeat', (e) => repeatMenu(e.currentTarget), 'Play this clip more than once in a row'));
    t.appendChild(B_('&#9664;', () => move(-1), 'Move left (Ctrl/Cmd+Left)'));
    t.appendChild(B_('&#9654;', () => move(1), 'Move right (Ctrl/Cmd+Right)'));
    t.appendChild(B_('Replace', (e) => menu(e.currentTarget, lib().map((b) => [b.name, () => { A.setClips(B.replaceClips(clips(), sel, b.id)); render(); }])), 'Swap in a different brick'));
    if (one) t.appendChild(B_('Trim', () => openTrim({ brick: one.brick, clip: one.uid }), 'Trim this brick (makes a new version)'));
    if (cl.some((c) => sel.includes(c.uid) && c.rep > 1)) t.appendChild(B_('Unroll', unroll, 'Split repeats into separate clips'));
    t.appendChild(B_('&#9654; Here', () => playFrom(starts()[cl.findIndex((c) => sel.includes(c.uid))]), 'Play the song from this clip'));
    t.appendChild(B_('Loop', () => { loopSel = true; playLoopSel(); }, 'Loop the selected clips'));
    t.appendChild(B_('Delete', del, 'Remove from the song (Delete key)', 'del'));
  }
  const dup = () => { const r = B.duplicateClips(clips(), sel); A.setClips(r.clips); sel = r.sel; render(); };
  const del = () => { A.setClips(B.deleteClips(clips(), sel)); sel = []; render(); };
  const move = (d) => { A.setClips(B.moveClips(clips(), sel, d)); render(); };
  const unroll = () => { const r = B.unrollClips(clips(), sel); A.setClips(r.clips); sel = r.sel; render(); };
  function repeatMenu(anchor) {
    menu(anchor, Array.from({ length: 16 }, (_, i) => [`x${i + 1}`, () => { A.setClips(B.setRepeat(clips(), sel, i + 1)); render(); }]), 'Play it this many times');
  }
  function scrollTo(u) { const el = $(`.clip[data-uid="${u}"]`, lane); if (el) { const l = el.offsetLeft, r = l + el.offsetWidth; if (l < tl.scrollLeft || r > tl.scrollLeft + tl.clientWidth) tl.scrollLeft = Math.max(0, r - tl.clientWidth + 20); } }

  // tap = select; long-press = multi-select (then taps add more); drag = reorder (touch: long-press first)
  function clipGestures(el, u) {
    let g = null;
    const down = (x, y, touch, mod) => { g = { x, y, touch, mod, lp: false, drag: false }; if (touch) g.t = setTimeout(() => { g.lp = true; if (!sel.includes(u)) sel = multi ? [...sel, u] : [u]; multi = true; render(); navigator.vibrate && navigator.vibrate(15); }, 450); };
    const mv = (x, y, ev) => {
      if (!g) return; const dx = x - g.x, dy = y - g.y;
      if (!g.drag) {
        if (Math.hypot(dx, dy) < 8) return;
        if (g.touch && !g.lp) { clearTimeout(g.t); g = null; return; }      // moved before long-press: it's a scroll
        if (!sel.includes(u)) { sel = [u]; render(); }
        g.drag = true; $$('.clip', lane).forEach((c) => sel.includes(c.dataset.uid) && c.classList.add('drag'));
      }
      ev.preventDefault(); $$('.clip.drag', lane).forEach((c) => (c.style.transform = `translate(${dx}px,-4px)`)); dropMark(x, y, true);
    };
    const up = (x, y) => {
      if (!g) return; clearTimeout(g.t);
      if (g.drag) { const i = dropIndex(x, y, true); clearMark(); if (i != null) { A.setClips(B.reorderClips(clips(), sel, i)); } render(); }
      else if (!g.lp) {
        if (multi || g.mod) { sel = sel.includes(u) ? sel.filter((s) => s !== u) : [...sel, u]; multi = sel.length > 0; }
        else sel = sel.length === 1 && sel[0] === u ? [] : [u];
        render(); const i = clips().findIndex((c) => c.uid === u); if (i >= 0 && !A.playing) setHead(starts()[i]);
      }
      g = null;
    };
    el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.target.closest('.rep')) return; down(e.clientX, e.clientY, false, e.shiftKey || e.ctrlKey || e.metaKey);
      const m = (ev) => mv(ev.clientX, ev.clientY, ev), U = (ev) => { removeEventListener('pointermove', m); removeEventListener('pointerup', U); up(ev.clientX, ev.clientY); };
      addEventListener('pointermove', m); addEventListener('pointerup', U); });
    el.addEventListener('touchstart', (e) => { if (e.touches.length !== 1 || e.target.closest('.rep')) { if (g) clearTimeout(g.t); g = null; return; } down(e.touches[0].clientX, e.touches[0].clientY, true); }, { passive: true });
    el.addEventListener('touchmove', (e) => { if (e.touches.length !== 1) { if (g) clearTimeout(g.t); g = null; return; } mv(e.touches[0].clientX, e.touches[0].clientY, e); }, { passive: false });
    el.addEventListener('touchend', (e) => { if (g) { e.preventDefault(); up(e.changedTouches[0].clientX, e.changedTouches[0].clientY); } });
    el.addEventListener('touchcancel', () => { if (g) clearTimeout(g.t); g = null; clearMark(); });
  }
  // where would a drop at (x, y) land? index into the clip list (null = outside the timeline)
  function dropIndex(x, y, internal = false) {
    const r = tl.getBoundingClientRect(); if (!internal && (y < r.top - 20 || y > r.bottom + 20 || x < r.left || x > r.right)) return null;
    const bar = (x - r.left + tl.scrollLeft) / ppb, S0 = starts(), cl = clips();
    for (let i = 0; i < cl.length; i++) if (bar < S0[i] + B.clipBars(cl[i], lib()) / 2) return i;
    return cl.length;
  }
  let mark = null;
  function dropMark(x, y, internal) {
    const i = dropIndex(x, y, internal); if (i == null) return clearMark();
    if (!mark) { mark = document.createElement('div'); mark.className = 'dropmark'; lane.appendChild(mark); }
    const S0 = starts(); mark.style.left = (i < S0.length ? S0[i] : lastClipEnd) * ppb + 'px';
  }
  function clearMark() { if (mark) mark.remove(); mark = null; }
  lane.addEventListener('click', (e) => { if (e.target === lane || e.target.classList.contains('tlempty')) { sel = []; multi = false; render(); } });

  // playhead: tap or drag the ruler
  function setHead(bar) { head = Math.max(0, Math.min(lastClipEnd, bar)); headEl.style.left = head * ppb + 'px'; }
  const rulerBar = (x) => Math.floor((x - ruler.getBoundingClientRect().left) / ppb);
  ruler.addEventListener('pointerdown', (e) => {
    ruler.setPointerCapture(e.pointerId); setHead(rulerBar(e.clientX));
    const m = (ev) => setHead(rulerBar(ev.clientX)), U = () => { ruler.removeEventListener('pointermove', m); ruler.removeEventListener('pointerup', U); if (A.playing && A.mode === 'song') playFrom(head); };
    ruler.addEventListener('pointermove', m); ruler.addEventListener('pointerup', U);
  });
  function playFrom(bar) { loopSel = false; head = bar; A.playSrc({ kind: 'song' }, Math.floor(bar)); }
  function playLoopSel() {
    const S0 = starts(), cl = clips(), idx = cl.map((c, i) => (sel.includes(c.uid) ? i : -1)).filter((i) => i >= 0); if (!idx.length) return;
    const a = S0[idx[0]], b = S0[idx[idx.length - 1]] + B.clipBars(cl[idx[idx.length - 1]], lib());
    A.playSrc({ kind: 'song', loop: [a, b] }, a); A.toast(`Looping bars ${a + 1}-${b}`);
  }
  $('#songPlay').onclick = () => { if (A.playing && A.mode === 'song') return A.stop(); if (!clips().length) return A.toast('Add a brick to the song first'); playFrom(head >= lastClipEnd ? 0 : head); };
  $('#songMp3b').onclick = () => A.exportSong('mp3'); $('#songWavb').onclick = () => A.exportSong('wav');

  // zoom: buttons, ctrl+wheel, pinch
  function zoom(f, cx = tl.clientWidth / 2) {
    const bar = (tl.scrollLeft + cx) / ppb; ppb = Math.max(14, Math.min(140, ppb * f)); render(); tl.scrollLeft = bar * ppb - cx;
  }
  $('#zoomIn').onclick = () => zoom(1.4); $('#zoomOut').onclick = () => zoom(1 / 1.4);
  tl.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - tl.getBoundingClientRect().left); }, { passive: false });
  let pinch = null;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  tl.addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch = { d: dist(e.touches), p: ppb, cx: (e.touches[0].clientX + e.touches[1].clientX) / 2 - tl.getBoundingClientRect().left }; }, { passive: true });
  tl.addEventListener('touchmove', (e) => { if (pinch && e.touches.length === 2) { e.preventDefault(); const target = pinch.p * dist(e.touches) / pinch.d; zoom(target / ppb, pinch.cx); } }, { passive: false });
  tl.addEventListener('touchend', (e) => { if (e.touches.length < 2) pinch = null; });

  // keyboard (only on the Bricks & Song screen)
  function key(e) {
    if (!sel.length) return false;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); dup(); return true; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); del(); return true; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault(); const d = e.key === 'ArrowLeft' ? -1 : 1;
      if (mod || e.altKey) move(d);
      else { const cl = clips(), i = cl.findIndex((c) => c.uid === sel[sel.length - 1]), j = Math.max(0, Math.min(cl.length - 1, i + d)); sel = [cl[j].uid]; multi = false; render(); scrollTo(sel[0]); }
      return true;
    }
    if (e.key === 'Escape') { sel = []; multi = false; render(); return true; }
    return false;
  }

  // ---------------------------------------------------------------- popup menu
  function menu(anchor, items, head = '') {
    const m = $('#menu'); m.innerHTML = ''; if (head) { const h = document.createElement('div'); h.className = 'mh'; h.textContent = head; m.appendChild(h); }
    for (const [label, fn] of items) { const b = document.createElement('button'); b.textContent = label; b.onclick = () => { close(); fn(); }; m.appendChild(b); }
    m.hidden = false; const r = anchor.getBoundingClientRect(), mh = m.offsetHeight, mw = m.offsetWidth;
    m.style.left = Math.max(6, Math.min(innerWidth - mw - 6, r.left)) + 'px';
    m.style.top = (r.bottom + mh + 6 < innerHeight ? r.bottom + 4 : Math.max(6, r.top - mh - 4)) + 'px';
    const close = () => { m.hidden = true; removeEventListener('pointerdown', out, true); };
    const out = (e) => { if (!m.contains(e.target)) close(); };
    setTimeout(() => addEventListener('pointerdown', out, true));
  }

  // ---------------------------------------------------------------- save-as-brick dialog
  function saveDialog() {
    const d = $('#brickDlg'), S = A.S, orig = S.origin && brick(S.origin);
    const used = new Set(lib().map((b) => b.name)), name = B.BRICK_NAMES.find((n) => !used.has(n)) || 'Brick ' + (lib().length + 1);
    let color = orig ? orig.color : B.BRICK_COLORS[lib().length % B.BRICK_COLORS.length];
    $('#bdName').value = orig ? orig.name + ' 2' : name;
    $('#bdChips').innerHTML = B.BRICK_NAMES.map((n) => `<button class="btn sm" type="button">${n}</button>`).join('');
    $$('#bdChips button').forEach((b) => (b.onclick = () => { $('#bdName').value = b.textContent; $('#bdReplace').checked = false; warn(); }));
    const sw = () => { $('#bdColors').innerHTML = B.BRICK_COLORS.map((c) => `<button type="button" aria-label="Colour ${c}" class="${c === color ? 'on' : ''}" style="background:${c}" data-c="${c}"></button>`).join(''); $$('#bdColors button').forEach((b) => (b.onclick = () => { color = b.dataset.c; sw(); })); };
    sw();
    $('#bdReplaceRow').hidden = !orig; $('#bdReplace').checked = false;
    if (orig) $('#bdReplaceLbl').textContent = `Replace "${orig.name}" (instead of making a new brick)`;
    const warn = () => {
      const u = orig ? A.usedIn(orig.id) : [];
      $('#bdWarn').textContent = $('#bdReplace').checked ? (u.length ? `Every place "${orig.name}" is used will change, in: ${u.join(', ')}.` : `"${orig.name}" isn't used in any song yet.`) : '';
      $('#bdName').disabled = $('#bdReplace').checked; if ($('#bdReplace').checked) $('#bdName').value = orig.name;
    };
    $('#bdReplace').onchange = warn; warn();
    $('#bdOk').onclick = () => {
      const rep = $('#bdReplace').checked;
      if (rep && !confirm(`Replace "${orig.name}"?` + (A.usedIn(orig.id).length ? `\nSongs that change: ${A.usedIn(orig.id).join(', ')}` : ''))) return;
      const n = ($('#bdName').value || name).trim().slice(0, 24);
      const br = A.saveBrick(n, color, rep); d.close();
      A.toast(rep ? `Replaced "${br.name}" (v${br.v})` : `Saved brick "${br.name}". It's on the Bricks & Song tab`);
      render();
    };
    $('#bdCancel').onclick = () => d.close();
    d.showModal(); $('#bdName').select();
  }

  // ---------------------------------------------------------------- trim editor
  const TR = { open: false };
  function openTrim(o = {}) {
    const d = $('#trimDlg'), from = o.brick ? brick(o.brick) : null;
    if (A.playing && A.mode === 'ws' && !from) { /* keep playing the workspace */ }
    TR.open = true; TR.from = from; TR.clip = o.clip || null; TR.st = B.clone(from ? from.state : A.S); TR.undo = [];
    TR.total = 4 * TR.st.kk.loop.bars; TR.a = 0; TR.b = TR.total; TR.snap = 4; TR.mode = 'pad';
    $('#trTitle').textContent = from ? `Trim brick "${from.name}"` : 'Trim the workspace';
    $('#trApply').textContent = from ? 'Save as new brick' : 'Use trim';
    let rb = $('#trReplace'); if (!rb) { rb = document.createElement('button'); rb.className = 'btn sm'; rb.id = 'trReplace'; $('#trApply').after(rb); }
    rb.textContent = 'Replace original'; rb.hidden = !from;
    $('#trSnap').value = '4'; seg('#trMode', TR.mode); seg('#trBest', null);
    d.showModal(); requestAnimationFrame(drawTrim);
  }
  const seg = (s, v) => $$(s + ' button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
  const trimmed = () => B.trimState(TR.st, TR.a, TR.b, TR.mode);
  function trPush() { TR.undo.push({ st: B.clone(TR.st), a: TR.a, b: TR.b }); if (TR.undo.length > 60) TR.undo.shift(); }
  function trGeom() {
    const cv = $('#trCanvas'), wrapW = $('.trimwrap').clientWidth - 4, W = Math.max(wrapW, 0), ppB = W / TR.total;
    return { cv, W, H: 220, ppB, x: (b) => b * ppB, beat: (x) => x / ppB };
  }
  function drawTrim() {
    if (!TR.open) return;
    const { cv, W, H, ppB, x } = trGeom(), dpr = devicePixelRatio || 1;
    cv.style.width = W + 'px'; cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#060a1a'; g.fillRect(0, 0, W, H);
    const st = TR.st, bars = st.kk.loop.bars, layers = st.kk.loop.layers;
    for (let b = 0; b <= TR.total; b += 0.25) { const bar = b % 4 === 0; g.fillStyle = bar ? '#ffffff44' : b % 1 === 0 ? '#ffffff1c' : '#ffffff08'; g.fillRect(Math.round(x(b)), 18, 1, H - 18); }
    g.fillStyle = '#cfc8b4'; g.font = '11px ui-monospace, monospace'; for (let b = 0; b < bars; b++) g.fillText(String(b + 1), x(b * 4) + 3, 12);
    // rows: drums (kick / snare / hats), bass, then one row per pad layer
    const rowsTop = 22, dr = [['bd', '#e0352b'], ['sd', '#f4efe1'], ['ch', '#f6c431']];
    dr.forEach(([k, c], r) => { for (let i = 0; i < 4 * TR.total; i++) if (st.drums.steps[k][i % 16] || (k === 'sd' && st.drums.steps.cp[i % 16]) || (k === 'ch' && st.drums.steps.oh[i % 16])) { g.fillStyle = c; g.fillRect(x(i / 4) + 1, rowsTop + r * 9, Math.max(2, ppB / 4 - 2), 6); } });
    for (let i = 0; i < 4 * TR.total; i++) { const s = st.bass.steps[i % 16]; if (s.on) { g.fillStyle = '#2f9e44'; g.fillRect(x(i / 4) + 1, rowsTop + 30 + (12 - s.n) * 0.9, Math.max(2, ppB / 4 - 2), 5); } }
    const ly0 = rowsTop + 48, lh = Math.max(14, Math.min(40, (H - ly0 - 4) / Math.max(1, layers.length)));
    TR.hits = [];
    layers.forEach((L, li) => {
      const y0 = ly0 + li * lh; g.fillStyle = '#ffffff10'; g.fillRect(0, y0, W, lh - 2);
      for (const n of B.notesOf(L.ev)) {
        const off = Number.isFinite(n.off) ? n.off : TR.total, xx = n.ev[0][2];
        const nx = x(n.on), nw = Math.max(4, x(off) - nx), ny = y0 + (1 - xx) * (lh - 8);
        g.fillStyle = n.on < TR.a - 1e-9 || n.on >= TR.b - 1e-9 ? '#7a6a3a' : '#f6c431'; g.fillRect(nx, ny, nw, 6);
        TR.hits.push({ li, on: n.on, x0: nx - 4, x1: nx + nw + 4, y0: ny - 6, y1: ny + 12 });
      }
    });
    g.fillStyle = '#000000a8'; g.fillRect(0, 18, x(TR.a), H); g.fillRect(x(TR.b), 18, W - x(TR.b), H);
    for (const h of [TR.a, TR.b]) { g.fillStyle = '#f6c431'; g.fillRect(x(h) - 2, 0, 4, H); g.beginPath(); g.moveTo(x(h) - 8, 0); g.lineTo(x(h) + 8, 0); g.lineTo(x(h), 12); g.fill(); }
    const tl_ = B.trimLength(TR.a, TR.b, TR.mode), keep = (TR.b - TR.a) / 4;
    const whole = Math.abs(keep - Math.round(keep)) < 1e-9;
    const onBars = TR.a % 4 === 0 && TR.b % 4 === 0, span = onBars ? (TR.b - TR.a === 4 ? `<b>bar ${TR.a / 4 + 1}</b>` : `<b>bars ${TR.a / 4 + 1} to ${TR.b / 4}</b>`) : `from <b>${fmtPos(TR.a)}</b> up to <b>${fmtPos(TR.b)}</b>`;
    $('#trRead').innerHTML = `Keeping ${span} (${+keep.toFixed(3)} bar${keep === 1 ? '' : 's'}). ` +
      (whole ? `Result: exactly <b>${tl_.bars} bar${tl_.bars > 1 ? 's' : ''}</b>.` : TR.mode === 'pad' ? `Not whole bars, so it becomes <b>${tl_.bars} bars</b> with ${+tl_.pad.toFixed(2)} beats of silence at the end.` : `Not whole bars, so it is rounded down to <b>${tl_.bars} bar${tl_.bars > 1 ? 's' : ''}</b>.`);
    if (A.playing && A.mode === 'trim') A.src.tmp = tmpBrick();
  }
  const fmtPos = (b) => { const bar = Math.floor(b / 4) + 1, beat = Math.floor(b % 4) + 1, six = Math.round((b % 1) * 4); return six ? `${bar}.${beat}.${six + 1}` : beat > 1 ? `${bar}.${beat}` : String(bar); };
  const tmpBrick = () => B.makeBrick(trimmed(), 'Trim preview', '#f6c431', '__trim');
  (function trimEvents() {
    const cv = $('#trCanvas'); let drag = null;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return { px: e.clientX - r.left, py: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', (e) => {
      const { px, py } = pos(e), { x, beat } = trGeom();
      const da = Math.abs(px - x(TR.a)), db = Math.abs(px - x(TR.b));
      if (Math.min(da, db) < 22) { trPush(); drag = da <= db ? 'a' : 'b'; cv.setPointerCapture(e.pointerId); return; }
      const h = TR.hits.find((n) => px >= n.x0 && px <= n.x1 && py >= n.y0 && py <= n.y1);
      if (h) { trPush(); TR.st = B.deleteNote(TR.st, h.li, h.on); A.toast('Note deleted'); drawTrim(); return; }
      trPush(); drag = Math.abs(beat(px) - TR.a) < Math.abs(beat(px) - TR.b) ? 'a' : 'b'; cv.setPointerCapture(e.pointerId); moveH(px);
    });
    const moveH = (px) => {
      const { beat } = trGeom(), s = TR.snap; let v = Math.round(beat(px) / s) * s; v = Math.max(0, Math.min(TR.total, v));
      if (drag === 'a') TR.a = Math.min(v, TR.b - s); else TR.b = Math.max(v, TR.a + s);
      TR.a = Math.max(0, TR.a); TR.b = Math.min(TR.total, TR.b); seg('#trBest', null); drawTrim();
    };
    cv.addEventListener('pointermove', (e) => { if (drag) moveH(pos(e).px); });
    cv.addEventListener('pointerup', () => (drag = null)); cv.addEventListener('pointercancel', () => (drag = null));
    $('#trSnap').onchange = (e) => (TR.snap = +e.target.value);
    $$('#trMode button').forEach((b) => (b.onclick = () => { TR.mode = b.dataset.v; seg('#trMode', TR.mode); drawTrim(); }));
    $$('#trBest button').forEach((b) => (b.onclick = () => { trPush(); bestWindow(+b.dataset.v); seg('#trBest', b.dataset.v); drawTrim(); }));
    $('#trQuant').onclick = () => {
      trPush(); const q = A.PR.q === 'off' ? '1/16' : A.PR.q;
      TR.st.kk.loop.layers = TR.st.kk.loop.layers.map((l) => ({ ...l, ev: B.quantizeEvents(l.ev, B.QUANT[q], 1, TR.total) }));
      A.toast('Snapped notes to ' + q); drawTrim();
    };
    $('#trOutside').onclick = () => { trPush(); TR.st = B.removeOutside(TR.st, TR.a, TR.b); drawTrim(); A.toast('Removed notes outside the trim'); };
    $('#trUndo').onclick = () => { const u = TR.undo.pop(); if (!u) return A.toast('Nothing to undo in Trim'); Object.assign(TR, u); drawTrim(); };
    $('#trPlay').onclick = () => {
      if (A.playing && A.mode === 'trim') { A.stop(); $('#trPlay').innerHTML = '&#9654; Preview'; return; }
      A.playSrc({ kind: 'trim', tmp: tmpBrick() }); $('#trPlay').innerHTML = '&#9632; Stop';
    };
    const close = () => { TR.open = false; if (A.playing && A.mode === 'trim') A.stop(); $('#trPlay').innerHTML = '&#9654; Preview'; $('#trimDlg').close(); };
    $('#trCancel').onclick = close;
    $('#trimDlg').addEventListener('cancel', () => { TR.open = false; if (A.playing && A.mode === 'trim') A.stop(); });
    $('#trApply').onclick = () => { applyTrim(false); close(); };
    document.addEventListener('click', (e) => { if (e.target.id === 'trReplace') { if (applyTrim(true) !== false) close(); } });
    addEventListener('resize', () => TR.open && drawTrim());
  })();
  // best N bars: the bar-aligned window with the most pad notes (ties: earliest)
  function bestWindow(n) {
    const len = Math.min(4 * n, TR.total), on = TR.st.kk.loop.layers.flatMap((l) => B.notesOf(l.ev).map((x) => x.on));
    let best = 0, bc = -1;
    for (let s = 0; s + len <= TR.total + 1e-9; s += 4) { const c = on.filter((b) => b >= s - 1e-9 && b < s + len - 1e-9).length; if (c > bc) { bc = c; best = s; } }
    TR.a = best; TR.b = best + len;
  }
  function applyTrim(replace) {
    const out = trimmed();
    if (!TR.from) { A.setWorkspace(out); A.toast(`Workspace trimmed to ${out.kk.loop.bars} bar${out.kk.loop.bars > 1 ? 's' : ''}`); return; }
    if (replace) {
      const u = A.usedIn(TR.from.id);
      if (!confirm(`Replace "${TR.from.name}" with the trimmed version?` + (u.length ? `\nSongs that change: ${u.join(', ')}` : ''))) return false;
      api.replaceBrickWith(TR.from.id, out); A.toast(`Replaced "${TR.from.name}"`); return;
    }
    const nb = api.newBrickFrom(out, TR.from.name + ' (trim)', TR.from.color);
    if (TR.clip) { A.setClips(B.replaceClips(clips(), [TR.clip], nb.id)); sel = [TR.clip]; }
    render(); A.toast(`Saved "${nb.name}". The original is unchanged`);
  }

  // ---------------------------------------------------------------- quick tour (first launch, skippable)
  const STEPS = [
    { sel: '#play', scr: null, h: 'Press play', t: 'The big button starts the beat. The four yellow eggs flash 1-2-3-4 so you can feel where the bar starts.' },
    { sel: '#drumGrid', scr: 0, h: 'Tap squares to add hits', t: 'Each row is a drum, each square is a step. Lit squares play. You cannot break anything: undo is at the top.' },
    { sel: '#kkRec', scr: 2, h: 'Record a pad loop', t: 'Press Rec, wait for the next bar, then slide your finger on the pad. Your playing snaps to the beat automatically.' },
    { sel: '#wsSave', scr: null, h: 'Save it as a brick', t: 'When you like it, press SAVE AS BRICK. Bricks are locked copies, so you can keep experimenting safely.' },
    { sel: '#shelf', scr: 4, h: 'Snap bricks into a song', t: 'On Bricks & Song, tap + on a brick to add it to the song timeline. Tap a clip to repeat, move or duplicate it.' },
  ];
  let ci = 0;
  function coach(force) {
    if (!force && localStorage.getItem(LS_COACH)) return;
    ci = 0; $('#coach').hidden = false; showStep();
  }
  function showStep() {
    const s = STEPS[ci]; if (s.scr != null) A.goScreen(s.scr);
    setTimeout(() => {
      const el = $(s.sel), r = el.getBoundingClientRect(), hole = $('#coachHole'), card = $('#coachCard');
      Object.assign(hole.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: Math.min(r.height, innerHeight * 0.45) + 12 + 'px' });
      card.innerHTML = `<h3>${ci + 1}. ${s.h}</h3><div>${s.t}</div><div class="cbtns"><span class="dots">${ci + 1} / ${STEPS.length}</span><button class="btn sm" id="coSkip">Skip tour</button>${ci ? '<button class="btn sm" id="coBack">Back</button>' : ''}<button class="btn sm on" id="coNext">${ci === STEPS.length - 1 ? 'Done' : 'Next'}</button></div>`;
      const below = r.top + Math.min(r.height, innerHeight * 0.45) + 18;
      card.style.top = (below + card.offsetHeight < innerHeight - 8 ? below : Math.max(8, r.top - card.offsetHeight - 18)) + 'px';
      $('#coSkip').onclick = endCoach; $('#coNext').onclick = () => (ci === STEPS.length - 1 ? endCoach() : (ci++, showStep())); if (ci) $('#coBack').onclick = () => { ci--; showStep(); };
    }, s.scr != null ? 420 : 30);
  }
  function endCoach() { $('#coach').hidden = true; localStorage.setItem(LS_COACH, '1'); A.goScreen(0); }
  $('#helpBtn').onclick = () => coach(true);

  // ---------------------------------------------------------------- long-press tooltips (touch screens have no hover)
  (function tips() {
    let t = null, shown = false; const tip = $('#tip');
    document.addEventListener('touchstart', (e) => {
      const el = e.target.closest('[title]'); clearTimeout(t); if (!el || e.target.closest('.clip,#kkPad,canvas,.bcard canvas')) return;
      t = setTimeout(() => {
        tip.textContent = el.title; tip.hidden = false; shown = true; const r = el.getBoundingClientRect();
        tip.style.left = Math.max(6, Math.min(innerWidth - tip.offsetWidth - 6, r.left)) + 'px'; tip.style.top = (r.top > 70 ? r.top - tip.offsetHeight - 6 : r.bottom + 6) + 'px';
      }, 550);
    }, { passive: true });
    const end = () => { clearTimeout(t); if (shown) setTimeout(() => { tip.hidden = true; }, 1600); };
    document.addEventListener('touchend', end); document.addEventListener('touchmove', () => clearTimeout(t), { passive: true });
    document.addEventListener('click', (e) => { if (shown) { shown = false; e.stopPropagation(); e.preventDefault(); } }, true);   // the long-press was for the tip, not a tap
  })();

  // ---------------------------------------------------------------- files dialog
  $('#filesBtn').onclick = () => $('#filesDlg').showModal(); $('#filesClose').onclick = () => $('#filesDlg').close();
  $('#projDelete').onclick = () => {
    const ps = Object.values(A.projects); if (ps.length < 2) return A.toast('This is your only song');
    if (!confirm(`Delete the song "${A.P.name}"? Its bricks stay on the shelf.`)) return;
    api.deleteProject(A.P.id); $('#filesDlg').close();
  };

  function playUI() {
    const songOn = A.playing && A.mode === 'song';
    $('#songPlay').innerHTML = songOn ? '&#9632; Stop' : '&#9654; Song'; $('#songPlay').classList.toggle('on', songOn);
    $$('.bcard').forEach((c) => c.classList.toggle('playing', A.playing && A.mode === 'prev' && A.src.brick === c.dataset.id));
    if (!A.playing) $$('.clip.now', lane).forEach((c) => c.classList.remove('now'));
  }
  function playhead(bar, clipUid) {
    head = bar; headEl.style.left = bar * ppb + 'px';
    $$('.clip', lane).forEach((c) => c.classList.toggle('now', c.dataset.uid === clipUid));
    if (A.mode === 'song' && !pinch) { const px = bar * ppb; if (px > tl.scrollLeft + tl.clientWidth - 30 || px < tl.scrollLeft) tl.scrollLeft = px - 30; }
  }
  const api = {
    refresh() { renderShelf(); render(); }, wsChanged() {}, playUI, playhead, saveDialog, openTrim, coach, key,
    get sel() { return sel.slice(); }, set sel(v) { sel = v.slice(); render(); }, get ppb() { return ppb; }, get head() { return head; }, get trim() { return TR; },
    select: (u) => { sel = [u]; render(); }, dup, del, move, unroll, addBrick, zoom, drawTrim, bestWindow, applyTrim, setHead, playFrom, playLoopSel, menu,
    replaceBrickWith: null, newBrickFrom: null, deleteProject: null,
  };
  return api;
}
