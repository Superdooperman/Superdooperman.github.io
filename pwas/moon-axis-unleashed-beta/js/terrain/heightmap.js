// Moon Axis Unleashed terrain-3d: procedural lunar height map.
// Same generator as moon-axis-dev terrain-proto (f290a7f), unchanged, so the
// two branches share one landscape. Height is 0..255 (Uint8); colour index
// 0..3 highland bands, 4..7 crater floor (mare). Baked once at load.

export const MAP_BITS = 9;
export const MAP_SIZE = 1 << MAP_BITS; // 512
export const MAP_MASK = MAP_SIZE - 1;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// Tileable value noise on a period-P lattice.
function makeNoise(rand, period) {
  const g = new Float32Array(period * period);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  const fade = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = fade(x - xi), fy = fade(y - yi);
    const x0 = ((xi % period) + period) % period, y0 = ((yi % period) + period) % period;
    const x1 = (x0 + 1) % period, y1 = (y0 + 1) % period;
    const a = g[y0 * period + x0], b = g[y0 * period + x1];
    const c = g[y1 * period + x0], d = g[y1 * period + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

/**
 * Bake the map.
 * @returns {{height: Uint8Array, color: Uint8Array, size: number}}
 */
export function bakeLunarMap(seed = 1947) {
  const N = MAP_SIZE;
  const rand = rng(seed);
  const f = new Float32Array(N * N);

  // Ridged fBm highlands + soft rolling base. Each octave tiles the map.
  const octs = [];
  for (let o = 0; o < 6; o++) octs.push(makeNoise(rand, 4 << o));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let amp = 1, sum = 0, ridge = 0;
      for (let o = 0; o < 6; o++) {
        const p = 4 << o;
        const n = octs[o]((x / N) * p, (y / N) * p);
        sum += n * amp;
        if (o < 4) ridge += (1 - Math.abs(n * 2 - 1)) ** 2 * amp;
        amp *= 0.47;
      }
      f[y * N + x] = sum * 0.6 + ridge * 0.45;
    }
  }

  // Craters: bowl + raised rim, toroidal distance so the map still wraps.
  const mare = new Float32Array(N * N);
  const craters = [];
  for (let i = 0; i < 70; i++) {
    const big = i < 7;
    craters.push({
      x: rand() * N, y: rand() * N,
      r: big ? 38 + rand() * 30 : 6 + rand() * 22,
      d: big ? 0.8 + rand() * 0.4 : 0.3 + rand() * 0.4,
    });
  }
  for (const c of craters) {
    const R = c.r, ext = Math.ceil(R * 1.8);
    for (let dy = -ext; dy <= ext; dy++) {
      for (let dx = -ext; dx <= ext; dx++) {
        const r = Math.hypot(dx, dy) / R;
        if (r > 1.8) continue;
        const xx = (Math.floor(c.x) + dx) & MAP_MASK, yy = (Math.floor(c.y) + dy) & MAP_MASK;
        const k = yy * N + xx;
        let h = 0;
        if (r < 1) h -= c.d * (1 - r * r);
        h += c.d * 0.45 * Math.exp(-(((r - 1) / 0.22) ** 2));
        f[k] += h;
        if (r < 0.85) mare[k] = Math.max(mare[k], 1 - r / 0.85);
      }
    }
  }

  // One 3x3 box blur: kills single-cell spikes that streak at close range.
  {
    const g = new Float32Array(f);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let a = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) a += g[((y + dy) & MAP_MASK) * N + ((x + dx) & MAP_MASK)];
        f[y * N + x] = a / 9;
      }
    }
  }

  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < f.length; i++) { if (f[i] < lo) lo = f[i]; if (f[i] > hi) hi = f[i]; }
  const height = new Uint8Array(N * N);
  for (let i = 0; i < f.length; i++) height[i] = Math.round(((f[i] - lo) / (hi - lo)) * 255);

  // Colour index: 4 hard light bands (low sun from the west, long shadows)
  // x 2 materials (highland, crater floor) + ordered-dither speckle.
  // Index layout: 0..3 highland dark->lit, 4..7 floor dark->lit.
  const color = new Uint8Array(N * N);
  const speck = makeNoise(rand, 128);
  const sx = -0.78, sy = -0.28, sz = 0.56;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const k = y * N + x;
      const hx = height[y * N + ((x + 1) & MAP_MASK)] - height[y * N + ((x - 1) & MAP_MASK)];
      const hy = height[((y + 1) & MAP_MASK) * N + x] - height[((y - 1) & MAP_MASK) * N + x];
      const nx = -hx, ny = -hy, nz = 4.0;
      const inv = 1 / Math.hypot(nx, ny, nz);
      let lum = (nx * sx + ny * sy + nz * sz) * inv; // -1..1
      lum += (speck((x / N) * 128, (y / N) * 128) - 0.5) * 0.18;
      const bayer = ((x & 1) ^ (y & 1)) ? 0.06 : -0.06;
      let band = Math.floor((lum + bayer + 0.05) * 4.2);
      band = band < 0 ? 0 : band > 3 ? 3 : band;
      color[k] = band + (mare[k] > 0.25 ? 4 : 0);
    }
  }
  return { height, color, size: N };
}
