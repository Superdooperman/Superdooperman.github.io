/* Radioactive Rooster pixel art (placeholder, procedural).
   Sprite sheet layout matches github-pages-plans/rooster-frames.md: 8 cols x 6 rows of 32x32.
   Rows: 0 focus(8) 1 short(6) 2 long(8) 3 done(6) 4 paused(2) 5 idle(4).
   If time/rooster-sprites.png exists (Arlong's art), it replaces the placeholder automatically. */
(function (G) {
  'use strict';
  const C = { k:'#000', g:'#2fae3a', gd:'#1d7a26', r:'#e10600', rd:'#7a0a12', y:'#ffd23a', yd:'#c99312',
    w:'#ffffff', o:'#ff8a1c', od:'#b85a00', s:'#1b1d24', s2:'#2c303b', n:'#7a4a22', n2:'#a8743c', gr:'#6b6f7a' };
  const ROWS = { focus:[0,8,6], short:[1,6,4], long:[2,8,3], done:[3,6,10], paused:[4,2,1], idle:[5,4,2] };
  const rnd = (a) => { let t = a * 9301 + 49297; return ((t % 233280) / 233280); };

  function P(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w || 1)), Math.max(1, Math.round(h || 1))); }

  // Googly eye: white disc with black outline, pupil offset (px,py in -1..1)
  function eye(c, cx, cy, r, px, py) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = x * x + y * y;
      if (d <= r * r) P(c, cx + x, cy + y, 1, 1, d > (r - 1) * (r - 1) + 0.5 ? C.k : C.w);
    }
    const pr = Math.max(1, Math.round(r / 2.4)), lim = r - pr - 1;
    const ox = Math.round(px * lim), oy = Math.round(py * lim);
    if (r <= 4) { P(c, cx + (px > 0 ? 0 : -1), cy + (py > 0 ? 0 : -1), 2, 2, C.k); return; }
    for (let y = -pr; y <= pr; y++) for (let x = -pr; x <= pr; x++) if (x * x + y * y <= pr * pr + 0.5) P(c, cx + ox + x, cy + oy + y, 1, 1, C.k);
  }

  // Side-view head (facing right). hx,hy = top-left of mask. open = beak open (crow)
  function head(c, hx, hy, f, open, tilt) {
    // comb
    P(c, hx + 2, hy - 3, 2, 3, C.r); P(c, hx + 4, hy - 4, 2, 4, C.r); P(c, hx + 6, hy - 3, 2, 3, C.r);
    if (open) { P(c, hx + 3, hy - 5, 2, 2, C.r); P(c, hx + 6, hy - 5, 1, 2, C.r); }
    // mask
    P(c, hx, hy, 9, 8, C.k); P(c, hx + 1, hy + 1, 7, 6, C.g); P(c, hx + 1, hy + 5, 7, 2, C.gd);
    // beak + nostrils (he sees through them)
    const by = hy + 3 + (tilt || 0);
    P(c, hx + 8, by, 4, 2, C.y); P(c, hx + 12, by + 1, 1, 1, C.yd);
    P(c, hx + 9, by, 1, 1, C.k); P(c, hx + 11, by, 1, 1, C.k);
    if (open) { P(c, hx + 8, by + 3, 4, 1, C.y); P(c, hx + 8, by + 2, 3, 1, C.rd); }
    else P(c, hx + 8, by + 2, 3, 1, C.yd);
    // wattle
    P(c, hx + 7, hy + 7, 2, 3, C.r);
    // googly eye, independent random drift
    eye(c, hx + 3, hy + 3, 3, Math.sin(f * 1.7 + 1) , Math.cos(f * 2.3));
  }

  function suit(c, x, y, h) { P(c, x, y, 8, h, C.k); P(c, x + 1, y + 1, 6, h - 1, C.s); P(c, x + 2, y + 1, 1, h - 2, C.s2); }
  function tail(c, x, y, f) { const s = f % 2; P(c, x, y + s, 4, 2, C.g); P(c, x - 1, y + 2, 4, 2, C.gd); P(c, x + 1, y - 2 + s, 3, 2, C.g); }
  function boots(c, x, y) { // claw boot at ground y
    P(c, x, y - 4, 2, 4, C.o); P(c, x - 1, y, 4, 1, C.o); P(c, x - 2, y, 1, 1, C.od); P(c, x + 3, y, 1, 1, C.od);
  }
  function glove(c, x, y) { P(c, x, y, 2, 2, C.w); P(c, x - 1, y, 1, 2, C.k); }

  function stand(c, f, o) {
    o = o || {};
    const bob = o.bob || 0, gy = 29;
    tail(c, 6, 15 + bob, f);
    boots(c, 12, gy); boots(c, 17, gy);
    suit(c, 10, 15 + bob, 10 - bob);
    glove(c, o.lhx || 9, o.lhy || (20 + bob)); glove(c, o.rhx || 19, o.rhy || (20 + bob));
    head(c, 10 + (o.hx || 0), 6 + bob + (o.hy || 0), o.eyeF != null ? o.eyeF : f * 0.9, o.open, o.tilt);
  }

  const DRAW = {
    idle(c, f) { stand(c, f, { bob: f % 2 }); },
    focus(c, f) { // pecking at a keyboard
      P(c, 21, 25, 9, 3, C.gr); P(c, 21, 25, 9, 1, C.k); for (let i = 0; i < 4; i++) P(c, 22 + i * 2, 26, 1, 1, C.w);
      const peck = [0, 1, 2, 1, 0, 1, 2, 1][f];
      stand(c, f, { hx: peck, hy: peck * 2, tilt: 0, rhx: 20 + peck, rhy: 22 + (f % 2) });
      if (f % 4 === 0) { P(c, 3, 3, 1, 1, C.g); P(c, 28, 4, 1, 1, C.g); } // radioactive sparkle
    },
    short(c, f) { // gliding: arms out, red underarm webbing popped (only on breaks)
      const b = [0, -1, -2, -1, 0, 1][f], y = 11 + b, flap = f % 3 === 0 ? 1 : 0;
      for (let i = 0; i < 8; i++) {        // webbing: triangles from wrist down to the waist
        const h = Math.round(1 + i * 0.9) + flap;
        P(c, 4 + i, y + 2, 1, h, C.k); P(c, 4 + i, y + 2, 1, Math.max(1, h - 1), i % 3 === 2 ? C.rd : C.r);
        P(c, 27 - i, y + 2, 1, h, C.k); P(c, 27 - i, y + 2, 1, Math.max(1, h - 1), i % 3 === 2 ? C.rd : C.r);
      }
      P(c, 3, y + 1, 10, 2, C.k); P(c, 19, y + 1, 10, 2, C.k); P(c, 4, y + 1, 9, 1, C.s2); P(c, 19, y + 1, 9, 1, C.s2); // arms
      glove(c, 2, y); P(c, 29, y, 2, 2, C.w);
      suit(c, 12, y, 11); tail(c, 8, y + 8, f);
      P(c, 13, y + 11, 2, 3, C.o); P(c, 17, y + 11, 2, 3, C.o); P(c, 12, y + 14, 4, 1, C.od); P(c, 17, y + 14, 4, 1, C.od);
      head(c, 12, y - 8, f * 1.3, false);
      for (let k = 0; k < 3; k++) P(c, (f * 5 + k * 11) % 32, 28 + (k % 2), 3, 1, '#ffffff40'); // wind streaks
    },
    long(c, f) { // nap in a nest (plush googly eyes stay open)
      P(c, 4, 25, 24, 4, C.n); P(c, 5, 24, 22, 1, C.n2); P(c, 6, 28, 20, 1, C.n2);
      const br = f % 4 < 2 ? 0 : 1;
      P(c, 9, 18 - br, 14, 7 + br, C.k); P(c, 10, 19 - br, 12, 6 + br, C.s);
      tail(c, 6, 18, 0);
      head(c, 17, 13 - br, 3 + f * 0.1, false, 1);
      const z = f % 8; P(c, 24 + (z >> 1), 9 - z, 3, 1, C.w); P(c, 26 + (z >> 1), 10 - z, 1, 1, C.w); P(c, 24 + (z >> 1), 11 - z, 3, 1, C.w);
    },
    done(c, f) { // crow: PAH KAW!
      const up = Math.min(f, 3);
      if (f >= 2) for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; P(c, 16 + Math.round(Math.cos(a) * (10 + f)), 14 + Math.round(Math.sin(a) * (9 + f)), 2, 2, C.r); }
      stand(c, f, { hy: -up, tilt: -1, open: f >= 2, lhx: 6, lhy: 12, rhx: 22, rhy: 12 });
    },
    paused(c, f) { stand(c, f, { eyeF: f ? 2.2 : 5.1 }); P(c, 24, 4, 1, 3, C.w); P(c, 26, 4, 1, 3, C.w); }
  };

  function buildSheet() {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 192;
    const c = cv.getContext('2d');
    for (const k in ROWS) { const [row, n] = ROWS[k]; for (let f = 0; f < n; f++) { c.save(); c.translate(f * 32, row * 32); DRAW[k](c, f); c.restore(); } }
    return cv;
  }

  // Swappable: real art wins if present.
  const Rooster = { ROWS, sheet: null, custom: false,
    load(src) {
      this.sheet = buildSheet();
      const img = new Image();
      img.onload = () => { if (img.width >= 256 && img.height >= 192) { this.sheet = img; this.custom = true; } };
      img.src = src;
    },
    frame(state, t) { const [row, n, fps] = ROWS[state]; const f = state === 'done' ? Math.min(n - 1, Math.floor(t * fps)) : Math.floor(t * fps) % n; return { sx: f * 32, sy: row * 32 }; },
    draw(ctx, state, t, dx, dy, scale, fast) {
      const fr = this.frame(state, fast ? t * 10 / 6 : t);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.sheet, fr.sx, fr.sy, 32, 32, dx, dy, 32 * scale, 32 * scale);
    },
    C, eye
  };
  G.Rooster = Rooster;
})(window);
