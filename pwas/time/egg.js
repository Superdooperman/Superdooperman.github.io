/* The egg timer: an egg wearing Radioactive Rooster's mask, googly eyes drifting independently. */
(function (G) {
  'use strict';
  const W = 72, H = 92, C = G.Rooster.C;
  function EggTimer(canvas) {
    this.c = canvas.getContext('2d'); canvas.width = W; canvas.height = H;
    this.eyes = [mkEye(), mkEye()]; this.cracks = mkCracks(); this.last = performance.now();
  }
  function mkEye() { return { x: 0, y: 0, tx: 0, ty: 0, next: 0, spin: 0 }; }
  function mkCracks() { // random zigzag cracks on the lower shell
    const out = [];
    for (let k = 0; k < 4; k++) {
      let x = 18 + k * 12 + Math.random() * 6, y = 60 + Math.random() * 8; const seg = [[x, y]];
      for (let i = 0; i < 6; i++) { x += (i % 2 ? 4 : -4) + (Math.random() * 4 - 2); y += 2 + Math.random() * 3; seg.push([x, y]); }
      out.push(seg);
    }
    return out;
  }
  EggTimer.prototype.update = function (now, mode) {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    for (const e of this.eyes) {
      if (mode === 'paused') { e.spin += dt * 5; e.tx = Math.cos(e.spin); e.ty = Math.sin(e.spin); }
      else if (now > e.next) { // each eye picks its own random target
        const a = Math.random() * 6.283, m = Math.random() < 0.2 ? 0.2 : 0.6 + Math.random() * 0.4;
        e.tx = Math.cos(a) * m; e.ty = Math.sin(a) * m; e.next = now + 250 + Math.random() * 1800;
      }
      const k = mode === 'paused' ? 1 : Math.min(1, dt * (6 + Math.random() * 10));
      e.x += (e.tx - e.x) * k + (Math.random() - .5) * 0.08; e.y += (e.ty - e.y) * k + (Math.random() - .5) * 0.08;
    }
  };
  // progress: 0..1 elapsed of the current phase; low: remaining fraction
  EggTimer.prototype.draw = function (o) {
    const c = this.c, P = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w || 1, h || 1); };
    c.clearRect(0, 0, W, H);
    const pop = o.popped ? 10 : 0;
    // shell
    const cx = 36, cy = 58, rx = 22, ry = 30;
    for (let y = -ry; y <= ry; y++) {
      const ryy = y < 0 ? ry * 1.08 : ry; const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ryy * ryy))) * (y < 0 ? 0.92 + 0.08 * (1 + y / ryy) : 1));
      if (half <= 0) continue;
      P(cx - half - 1, cy + y, 1, 1, C.k); P(cx + half, cy + y, 1, 1, C.k);
      P(cx - half, cy + y, half * 2, 1, y > 18 ? '#e9dcc0' : '#fff6e2');
      P(cx + half - 4, cy + y, 3, 1, y > 0 ? '#e9dcc0' : '#fff6e2');
      if (y > -10 && y < 10) P(cx - half + 3, cy + y, 2, 1, '#ffffff');
    }
    P(cx - 10, cy + ry, 20, 1, C.k);
    // cracks as time runs low
    if (o.crack > 0) {
      c.strokeStyle = '#3a2a14'; c.lineWidth = 1;
      const segs = this.cracks;
      for (let k = 0; k < segs.length; k++) {
        const n = Math.floor(o.crack * segs[k].length * segs.length - k * segs[k].length * 0.6);
        for (let i = 1; i < Math.min(n, segs[k].length); i++) { const [x0, y0] = segs[k][i - 1], [x1, y1] = segs[k][i]; line(P, x0, y0, x1, y1, '#3a2a14'); }
      }
    }
    // ---- mask on top (lifts off when popped), rotating around the egg: o.rot radians, 0 = facing us ----
    const my = 24 - pop, rot = o.rot || 0, R = 21, eyeY = my + 13, by = my + 10;
    const ang = (lon) => { const a = lon + rot; return { s: Math.sin(a), c: Math.cos(a) }; };
    const feats = [];
    // comb: lobes sit in the front-back plane, so front view = thin fin, side view = full crest
    const lobes = [[-9, 9, 4], [-4, 14, 5], [2, 16, 5], [7, 11, 4], [11, 6, 3]]; // [depth fwd, height, half-thickness]
    const fwd = Math.sin(rot), side = Math.abs(Math.sin(rot));
    feats.push({ z: 0.0, draw: () => {
      for (const [d, h, t] of lobes) { const x = cx + d * fwd, w = Math.max(2, Math.round(t * 2 * side + 5 * (1 - side))); P(x - w / 2 - 1, my - h - 1, w + 2, h + 2, C.k); }
      for (const [d, h, t] of lobes) { const x = cx + d * fwd, w = Math.max(2, Math.round(t * 2 * side + 5 * (1 - side))); P(x - w / 2, my - h, w, h, C.r); P(x - w / 2, my - h, Math.max(1, w - 2), 2, '#ff4a3a'); }
    } });
    // googly eyes on the sides (longitude ±80°): plush, so still visible a bit past the silhouette
    [[-1.15, 0], [1.15, 1]].forEach(([lon, k]) => {
      const { s: sn, c: cs } = ang(lon); if (cs < -0.6) return;
      feats.push({ z: cs, draw: () => {
        const x = cx + (R + 2) * sn, rx = Math.max(2, Math.round(9 * (0.3 + 0.7 * Math.max(0, cs + 0.35) / 1.35))), e = this.eyes[k];
        ellipseEye(c, P, x, eyeY, rx, 9, e.x * (rx / 9), e.y);
      } });
    });
    // beak (with nostril holes, his real eye-holes), then wattle, at longitude 0
    { const { s: sn, c: cs } = ang(0);
      if (cs > -0.2) feats.push({ z: cs + 0.01, draw: () => {
        const bx = cx + R * 0.8 * sn, tip = 6 * sn;  // tip swings sideways as he turns
        for (let i = 0; i < 14; i++) {
          // front view: downward triangle; profile: a wedge sticking out of the hood
          const w = Math.max(2, (14 - i) * (0.25 + 0.75 * Math.max(0, cs))), x0 = bx + tip * (i / 14);
          const pw = Math.round(Math.abs(sn) * Math.max(0, 11 - Math.abs(i - 4) * 2)), dir = Math.sign(sn);
          P(x0 - w / 2 - 1, by + i, w + 2, 1, C.k); P(x0 - w / 2, by + i, w, 1, i > 9 ? C.yd : C.y);
          if (pw > 0) { const px0 = dir > 0 ? x0 : x0 - pw; P(px0 - 1, by + i, pw + 2, 1, C.k); P(px0, by + i, pw, 1, i > 5 ? C.yd : C.y); }
        }
        if (o.open) { P(bx + tip - 5, by + 14, 10, 2, C.rd); P(bx + tip - 4, by + 16, 8, 3, C.y); P(bx + tip - 4, by + 19, 8, 1, C.k); }
        const nd = 3 * cs; if (cs > 0.15) { P(bx + tip * 0.2 - nd - 1, by + 3, 2, 2, C.k); P(bx + tip * 0.2 + nd - 1, by + 3, 2, 2, C.k);
          if (o.t % 4 < 0.15) { P(bx + tip * 0.2 - nd - 1, by + 3, 1, 1, '#9cff9c'); P(bx + tip * 0.2 + nd - 1, by + 3, 1, 1, '#9cff9c'); } }
        const wy = by + 14 + (o.open ? 6 : 0), ww = Math.max(2, Math.round(6 * (0.4 + 0.6 * Math.max(0, cs)))), wx = bx + tip * 0.6;
        P(wx - ww / 2 - 1, wy, ww + 2, 7, C.k); P(wx - ww / 2, wy + 1, ww, 5, C.r);
      } }); }
    // far-side features first (hood covers them), then the hood, then near-side features
    feats.filter((f) => f.z < 0).forEach((f) => f.draw());
    for (let y = 0; y < 30; y++) {
      const half = Math.floor(R * Math.sqrt(Math.max(0, 1 - Math.pow((y - 22) / 25, 2))));
      P(cx - half - 1, my + y, half * 2 + 2, 1, C.k);
      if (y < 29) P(cx - half, my + y, half * 2, 1, y > 20 ? C.gd : C.g);
      if (y < 10) P(cx - half + 3, my + y, 3, 1, '#57d063');   // fixed highlight: light doesn't turn with him
    }
    for (let x = cx - 18; x <= cx + 14; x += 6) { P(x, my + 29, 4, 2, C.gd); P(x + 1, my + 31, 2, 2, C.gd); P(x + 1, my + 33, 1, 1, C.k); }
    // back of the head: hood seam + stitches at longitude 180°
    { const { s: sn, c: cs } = ang(Math.PI);
      if (cs > 0.05) { const x = cx + R * 0.9 * sn;
        for (let y = 2; y < 28; y++) { const hx = x * (1 - y / 120) + cx * (y / 120); P(hx, my + y, 1, 1, '#145c1b'); if (y % 4 === 0 && cs > 0.4) { P(hx - 1, my + y, 3, 1, '#145c1b'); } } } }
    feats.filter((f) => f.z >= 0).sort((a, b) => a.z - b.z).forEach((f) => f.draw());
    c.restore();
  };
  // Googly eye squashed horizontally (foreshortened): rx x ry, pupil offset px,py in -1..1
  function ellipseEye(c, P, cx, cy, rx, ry, px, py) {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      if (d <= 1) P(cx + x, cy + y, 1, 1, d > 0.72 ? C.k : C.w);
    }
    const pr = Math.max(1, Math.round(rx / 2.4)), pry = Math.max(1, Math.round(ry / 2.4));
    const ox = Math.round(px * (rx - pr - 1)), oy = Math.round(py * (ry - pry - 1));
    for (let y = -pry; y <= pry; y++) for (let x = -pr; x <= pr; x++) if ((x * x) / (pr * pr + .01) + (y * y) / (pry * pry) <= 1.1) P(cx + ox + x, cy + oy + y, 1, 1, C.k);
  }
  function line(P, x0, y0, x1, y1, col) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) P(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 1, 1, col); }
  G.EggTimer = EggTimer;
})(window);
