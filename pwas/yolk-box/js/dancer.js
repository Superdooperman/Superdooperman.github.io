// Dancing metronome: a pixel dancer locked to the scheduler's audio clock.
// The scheduler pushes one record per beat ({t, n, k, spb, countIn}); every animation frame looks up the
// beat that contains "now" (audio time) and derives the pose and the secondary motion from (now - beat.t).
// Nothing integrates over frames, so the dance is a pure function of the audio clock and cannot drift.
import { DANCERS } from './dancers-data.js';

const FW = DANCERS.frame[0], FH = DANCERS.frame[1];
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; };

// which body pose is showing at phase p of beat (n, k)
export function poseAt(ch, n, k, p, half) {
  const q = ch.seq;
  if (k === 0) return p < 0.45 ? q.acc : q.acc2;                     // beat 1: the big accent pose (wings out / arms in a V)
  const side = half ? (n >> 1) % 2 : n % 2;                          // half time: one hit per bar, so alternate by bar
  return p < 0.4 ? (side ? q.hitB : q.hitA) : q.mid;                 // other beats: alternate hit sides, then recover
}
// Above 220 BPM a full move on every beat turns into a blur, so the dancer moves on every other beat (one move
// cycle spans two beats: accent on beat 1, a hit on beat 3) and marks each beat with a 1px bounce instead.
export const HALF_BPM = 220;
const isHalf = (spb) => 60 / spb > HALF_BPM + 1e-6;
function halfPair(b) {                        // the move-beat records (2 beats long) that contain audio beat b
  const second = b.k % 2 === 1, t = second ? b.t - b.spb : b.t, m = Math.floor(b.n / 2), sp = 2 * b.spb;
  const cur = { t, n: m, k: b.k >= 2 ? 1 : 0, spb: sp, half: true };
  return { b: cur, prev: m > 0 ? { t: t - sp, n: m - 1, k: 1 - cur.k, spb: sp, half: true } : null };
}
const idlePose = (ch, n) => ch.seq.idle[((n % ch.seq.idle.length) + ch.seq.idle.length) % ch.seq.idle.length];

// pose-change events inside one beat: [{dt, from, to}]
function beatEvents(ch, b, prevPose, idle) {
  if (idle) { const to = idlePose(ch, b.n); return [{ t: b.t, from: prevPose, to }]; }
  const hit = poseAt(ch, b.n, b.k, 0, b.half), post = poseAt(ch, b.n, b.k, 0.99, b.half), split = b.k === 0 ? 0.45 : 0.4;
  return [{ t: b.t, from: prevPose, to: hit }, { t: b.t + split * b.spb, from: hit, to: post }];
}

// Damped follow-through of one rigged part. Each pose change moves the part's anchor by D; the part holds its
// world position for `delay` seconds, then springs to the new anchor with a damped cosine that overshoots and
// settles well before the next beat. Returns the part offset from its anchor in sprite pixels.
function follow(ch, r, evs, now, spb) {
  const P = clamp(r.per * spb, 0.09, 0.25), Tc = Math.max(0.03, (spb - r.delay) / 4.5);
  let ox = 0, oy = 0, last = null;
  for (const e of evs) {
    const tau = now - e.t; if (tau < 0) continue;
    const a0 = ch.poses[e.from].a[r.at], a1 = ch.poses[e.to].a[r.at];
    const dx = a1[0] - a0[0], dy = a1[1] - a0[1]; if (!dx && !dy) continue;
    const u = tau - r.delay, h = u < 0 ? 1 : Math.cos(2 * Math.PI * u / P) * Math.exp(-u / Tc);
    // a vertical bob also kicks dangly parts sideways (alternating per beat) so they swing instead of just bouncing
    const side = (e.n % 2 ? 1 : -1) * (r.tilt ? 0.5 : 0);
    ox += -(dx + Math.abs(dy) * side) * r.gain * h; oy += -dy * r.gain * h;
    if (u >= 0) last = { e, u, P, Tc, mag: Math.hypot(dx, dy) * r.gain };
  }
  return { ox, oy, last };
}

export function initDancer(o) {
  const chars = DANCERS.chars;
  const atlas = new Image(); let ready = false;
  atlas.onload = () => { ready = true; draw(true); }; atlas.src = 'img/dancers.png';
  const off = document.createElement('canvas'); off.width = FW; off.height = FH;
  const ox = off.getContext('2d'); ox.imageSmoothingEnabled = false;
  const panel = o.panel, mini = o.mini, big = o.big;
  const rm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let q = [], ci = Math.max(0, chars.findIndex((c) => c.id === o.PR.dancer)), lastKey = '', log = [], lastSample = null;
  const ch = () => chars[ci];

  // ---------------------------------------------------------------- clock
  function clockNow() {                       // the audio time the listener is hearing right now
    const c = o.getCtx(); if (!c) return 0;
    return c.currentTime - clamp((c.baseLatency || 0) + (c.outputLatency || 0), 0, 0.3);
  }
  function beatAt(now) {                      // current beat record and the one before it (for follow-through)
    while (q.length > 2 && q[2].t <= now) q.shift();
    let i = -1; for (let j = 0; j < q.length; j++) if (q[j].t <= now + 1e-6) i = j;
    if (i < 0) return null;
    return { b: q[i], prev: i > 0 ? q[i - 1] : null };
  }
  const IDLE_SPB = 1.1;
  function idleBeat(nowS) { const n = Math.floor(nowS / IDLE_SPB); return { b: { t: n * IDLE_SPB, n, k: n % 4, spb: IDLE_SPB }, prev: { t: (n - 1) * IDLE_SPB, n: n - 1, k: (n + 3) % 4, spb: IDLE_SPB } }; }

  // ---------------------------------------------------------------- compositing
  function blitPart(c, pd, v, x, y) { const r = pd.v[v]; c.drawImage(atlas, r[0], r[1], r[2], r[3], x - pd.pivot[0], y - pd.pivot[1], r[2], r[3]); }
  // render the dancer at audio time `now` for the beat pair `bp`; `idle` = stopped (gentle sway)
  function compose(C, bp, now, idle, still) {
    const half = !idle && !still && isHalf(bp.b.spb), ap = clamp((now - bp.b.t) / bp.b.spb, 0, 0.9999);
    const bob = half && ap < 0.3 ? 1 : 0;     // the per-beat bounce in half time
    if (half) bp = halfPair(bp.b);
    const b = bp.b, p = clamp((now - b.t) / b.spb, 0, 0.9999);
    const pose = still ? idlePose(C, 0) : idle ? idlePose(C, b.n) : poseAt(C, b.n, b.k, p, half);
    const P = C.poses[pose];
    ox.clearRect(0, 0, FW, FH);
    if (!ready) return { pose, p };
    let evs = [];
    if (!still) {
      const pp = bp.prev;
      const endOf = (n, k) => idle ? idlePose(C, n) : half ? poseAt(C, n, ((k % 2) + 2) % 2, 0.99, true) : poseAt(C, n, ((k % 4) + 4) % 4, 0.99);
      const start = C.seq.idle[0];            // before the first beat the dancer was idling
      if (pp) evs = evs.concat(beatEvents(C, pp, pp.n > 0 || idle ? endOf(pp.n - 1, pp.k - 1) : start, idle).map((e) => ({ ...e, n: pp.n })));
      evs = evs.concat(beatEvents(C, b, pp ? endOf(pp.n, pp.k) : start, idle).map((e) => ({ ...e, n: b.n })));
    }
    const parts = C.rig.map((r) => {
      const pd = C.parts[r.part], a = P.a[r.at];
      const f = still ? { ox: 0, oy: 0, last: null } : follow(C, r, evs, now, b.spb);
      return { r, pd, a, f };
    });
    const drawPart = ({ r, pd, a, f }) => {
      if (r.rattle) {                         // googly eye: ball jiggles 1px late, pupil rattles in hashed directions
        const jx = clamp(Math.round(f.ox * 0.45), -1, 1), jy = clamp(Math.round(f.oy * 0.45), -1, 1);
        blitPart(ox, pd, 0, a[0] + jx, a[1] + jy + bob);
        let d = [0, 1];                       // resting: looking down a touch
        const L = f.last;
        if (L && !still) {
          const settle = L.mag > 0.4 ? L.Tc * Math.log(L.mag / 0.4) : 0;
          const hc = Math.floor(Math.min(L.u, settle) / (L.P / 2));
          d = DIRS[hash(L.e.n * 3 + (L.e.t > b.t ? 1 : 0) + r.at.length, hc + (r.at === 'eyeR' ? 7 : 0)) % 8];
        }
        const s = pd.pupil, rad = s >= 2 ? 2 : 1;
        const px = a[0] + jx + Math.round(d[0] * rad * (d[1] ? 0.75 : 1)) - (s >> 1), py = a[1] + jy + bob + Math.round(d[1] * rad * (d[0] ? 0.75 : 1)) - (s >> 1);
        ox.fillStyle = '#0b0f22'; ox.fillRect(px, py, s, s);
        return;
      }
      const n = pd.v.length, mid = n >> 1;
      const v = clamp(Math.round(f.ox * (r.tilt || 1) * 0.4) + mid, 0, n - 1);
      const my = r.my != null ? r.my : 1, sy = clamp(Math.round(f.oy * 0.4), -my, my), sx = clamp(Math.round(f.ox * 0.2), -1, 1);
      blitPart(ox, pd, v, a[0] + sx, a[1] + sy + bob);
    };
    parts.filter((x) => x.r.z < 0).forEach(drawPart);
    if (bob) {                                // knee-bend: feet stay planted, everything above the legs dips 1px
      const L = 7;
      ox.drawImage(atlas, P.r[0], P.r[1] + FH - L, P.r[2], L, 0, FH - L, FW, L);
      ox.drawImage(atlas, P.r[0], P.r[1], P.r[2], FH - L, 0, 1, FW, FH - L);
    } else ox.drawImage(atlas, P.r[0], P.r[1], P.r[2], P.r[3], 0, 0, FW, FH);
    parts.filter((x) => x.r.z > 0).forEach(drawPart);
    return { pose, p, half, bob, parts: parts.map((x) => ({ part: x.r.part, at: x.r.at, ox: +x.f.ox.toFixed(3), oy: +x.f.oy.toFixed(3) })) };
  }
  function blit(cv) {
    if (!cv || !cv.isConnected || cv.offsetParent === null) return;
    const k = Math.max(1, Math.round(window.devicePixelRatio || 1)), sc = +cv.dataset.scale || 1;
    const w = FW * sc * k, h = FH * sc * k;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, w, h); c.drawImage(off, 0, 0, w, h);
  }

  // ---------------------------------------------------------------- frame loop
  function sample() {
    const playing = o.isPlaying(), now = clockNow(), still = rm.matches;
    let bp = playing ? beatAt(now) : null, idle = !bp;
    if (idle) bp = idleBeat(performance.now() / 1000);
    const t = idle ? performance.now() / 1000 : now, b = bp.b, phase = clamp((t - b.t) / b.spb, 0, 0.9999);
    return { playing, idle, still, now: t, bp, n: b.n, k: b.k, beatT: b.t, spb: b.spb, phase, countIn: !!b.countIn };
  }
  function draw(force) {
    const s = sample();
    const res = compose(ch(), s.bp, s.now, s.idle, s.still);
    s.frame = res.pose; s.parts = res.parts; s.half = !!res.half; s.bob = res.bob || 0; lastSample = s;
    blit(mini); blit(big);
    // panel styling: yellow flash on beat 1, red during the count-in, gentle glow pulse for reduced motion
    const glow = s.idle ? 0 : Math.exp(-s.phase * 5);
    panel.classList.toggle('one', !s.idle && s.k === 0 && s.phase < 0.3);
    panel.classList.toggle('count', !s.idle && s.countIn);
    panel.style.setProperty('--dg', glow.toFixed(3));
    const key = s.idle ? 'idle' : s.n + ':' + s.k;
    if (key !== lastKey && !s.idle) { log.push({ n: s.n, k: s.k, t: s.beatT, seenAt: s.now, phase: s.phase }); if (log.length > 400) log.shift(); }
    lastKey = key;
  }
  function loop() { draw(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);

  // ---------------------------------------------------------------- controls
  function setChar(i) {
    ci = ((i % chars.length) + chars.length) % chars.length;
    o.PR.dancer = ch().id; o.savePrefs(); refresh(); draw(true);
  }
  function refresh() {
    const name = ch().name;
    panel.title = `${name}: dancing metronome. Tap to enlarge.`;
    if (o.nameEl) o.nameEl.textContent = name;
    if (o.clickEl) { o.clickEl.classList.toggle('on', !!o.PR.click); o.clickEl.textContent = o.PR.click ? 'CLICK ON' : 'CLICK OFF'; o.clickEl.setAttribute('aria-pressed', String(!!o.PR.click)); }
  }
  refresh();

  // deterministic render for previews / tests: synthetic clock at `bpm`, time `t` seconds after beat 0
  function renderAt(t, opt = {}) {
    const C = opt.char != null ? chars[typeof opt.char === 'number' ? opt.char : chars.findIndex((c) => c.id === opt.char)] : ch();
    const spb = 60 / (opt.bpm || 120), n = Math.floor(t / spb);
    const mk = (m) => ({ t: m * spb, n: m, k: ((m % 4) + 4) % 4, spb });
    const bp = { b: mk(n), prev: n > 0 ? mk(n - 1) : null };
    const res = compose(C, bp, t, false, !!opt.still);
    return { ...res, data: off.toDataURL('image/png') };
  }

  return {
    beat(rec) { q.push(rec); if (q.length > 64) q.splice(0, q.length - 64); },
    reset() { q = []; },
    sample: () => (lastSample ? { ...lastSample, bp: undefined } : null),
    get log() { return log.slice(); }, clearLog() { log = []; },
    get queue() { return q.slice(); },
    get char() { return ch().id; }, get chars() { return chars.map((c) => c.id); },
    get ready() { return ready; },
    setChar, next: () => setChar(ci + 1), prev: () => setChar(ci - 1), refresh, renderAt, draw,
  };
}
