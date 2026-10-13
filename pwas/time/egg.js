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
    // mask on top (lifts off when popped)
    const my = 24 - pop;
    c.save();
    // comb
    [[26, my - 14, 6, 12], [32, my - 18, 7, 16], [39, my - 13, 6, 11], [44, my - 7, 4, 6]].forEach(([x, y, w, h]) => { P(x - 1, y - 1, w + 2, h + 2, C.k); });
    [[26, my - 14, 6, 12], [32, my - 18, 7, 16], [39, my - 13, 6, 11], [44, my - 7, 4, 6]].forEach(([x, y, w, h]) => { P(x, y, w, h, C.r); P(x + 1, y, w - 3, 2, '#ff4a3a'); });
    // hood
    for (let y = 0; y < 30; y++) {
      const half = Math.floor(21 * Math.sqrt(Math.max(0, 1 - Math.pow((y - 22) / 25, 2))));
      const edge = y > 24 ? ((Math.floor((cx - half) / 4) + y) % 2 ? 1 : 0) : 0;
      P(cx - half - 1, my + y, half * 2 + 2, 1, C.k);
      if (y < 29) P(cx - half, my + y, half * 2, 1, y > 20 ? C.gd : C.g);
      if (y < 10) P(cx - half + 3, my + y, 3, 1, '#57d063');
    }
    // feather points along the hood edge
    for (let x = cx - 18; x <= cx + 14; x += 6) { P(x, my + 29, 4, 2, C.gd); P(x + 1, my + 31, 2, 2, C.gd); P(x + 1, my + 33, 1, 1, C.k); }
    // googly eyes (sides, plush)
    G.Rooster.eye(c, cx - 19, my + 13, 9, this.eyes[0].x, this.eyes[0].y);
    G.Rooster.eye(c, cx + 19, my + 13, 9, this.eyes[1].x, this.eyes[1].y);
    // beak with nostril holes (that's where he looks out)
    const by = my + 10;
    for (let i = 0; i < 14; i++) { const w = Math.max(2, 14 - i); P(cx - w / 2 - 1, by + i, w + 2, 1, C.k); P(cx - w / 2, by + i, w, 1, i < 3 ? C.y : (i > 9 ? C.yd : C.y)); }
    if (o.open) { P(cx - 5, by + 14, 10, 2, C.rd); P(cx - 4, by + 16, 8, 3, C.y); P(cx - 4, by + 19, 8, 1, C.k); }
    const glint = o.t % 4 < 0.15;
    P(cx - 4, by + 3, 2, 2, C.k); P(cx + 2, by + 3, 2, 2, C.k);
    if (glint) { P(cx - 4, by + 3, 1, 1, '#9cff9c'); P(cx + 2, by + 3, 1, 1, '#9cff9c'); }
    // wattle
    P(cx - 3, by + 14 + (o.open ? 6 : 0), 6, 7, C.k); P(cx - 2, by + 15 + (o.open ? 6 : 0), 4, 5, C.r);
    c.restore();
  };
  function line(P, x0, y0, x1, y1, col) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) P(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 1, 1, col); }
  G.EggTimer = EggTimer;
})(window);
