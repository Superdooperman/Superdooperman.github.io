// Moon Axis Unleashed terrain-3d (prototype, off by default).
// Loaded only with ?terrain=1 (dynamic import from main.js), so a normal load
// never fetches this file. Turns the Sortie 2 surface pass into lit 3D
// height-map terrain: the same baked lunar map as moon-axis-dev terrain-proto,
// built as a recycled strip of chunked grid meshes under the chase camera.
//
// Coordinates: the rail game keeps the Voidcat near z = -6 and scrolls the
// world toward +z. `travel` is the distance flown. A scene point (x, z) sits
// over map cell u = x / CELL + U0, v = (travel - z) / CELL.
import * as THREE from 'three';
import { bakeLunarMap, MAP_SIZE, MAP_MASK } from './heightmap.js';
import { earthGroup } from './earth.js';

const CELL = 2;            // world units per map cell (rows and core columns)
const ROWS = 16;           // rows per chunk
const CHUNK_LEN = ROWS * CELL;
const CHUNKS = 10;         // 320 units of strip: +8 behind the camera to ~-300
const U0 = 256;            // map column under x = 0
const V0 = 40;             // map row under the start line
const BASE = -16;          // valley floor (world y)
const AMP = 16;            // relief above the floor
const WALL = 12;           // extra rise toward the strip edges (canyon read)
const MARGIN = 1.1;        // ground clearance before a crash

// Copper-theme regolith. Usopp look call: these four colours + fog.
const C_LOW = new THREE.Color(0x3a2c25);
const C_MID = new THREE.Color(0x7d6553);
const C_HIGH = new THREE.Color(0xb39478);
const C_COPPER = new THREE.Color(0xc45c26);

function columnXs() {
  // Dense in the play lane, coarser out to the fogged walls.
  const xs = [];
  for (let x = -200; x < -96; x += 8) xs.push(x);
  for (let x = -96; x < -40; x += 4) xs.push(x);
  for (let x = -40; x <= 40; x += CELL) xs.push(x);
  for (let x = 44; x <= 96; x += 4) xs.push(x);
  for (let x = 104; x <= 200; x += 8) xs.push(x);
  return xs;
}

export function createTerrain({ scene, renderer }) {
  const t0 = performance.now();
  const map = bakeLunarMap(1947);
  const N = MAP_SIZE;
  // Remap the baked 0..255 band (most cells sit in 0.35..0.85) to world y.
  const H = new Float32Array(N * N);
  const MARE = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const hn = Math.min(1, Math.max(0, (map.height[i] / 255 - 0.35) / 0.5));
    H[i] = hn;
    MARE[i] = map.color[i] >= 4 ? 1 : 0;
  }
  const bakeMs = performance.now() - t0;

  let travel = 0;
  let active = false;
  const chunks = [];
  // Lambert, not Standard: matte regolith needs no GGX, and the terrain covers
  // most of the screen, so per-pixel cost matters on phones.
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    emissive: new THREE.Color(0x1c120c),
    emissiveIntensity: 0.35,
  });
  const XS = columnXs();
  const COLS = XS.length;

  function rawAt(u, v) {
    const ui = Math.floor(u), vi = Math.floor(v);
    const fu = u - ui, fv = v - vi;
    const x0 = ui & MAP_MASK, x1 = (ui + 1) & MAP_MASK;
    const y0 = vi & MAP_MASK, y1 = (vi + 1) & MAP_MASK;
    const a = H[y0 * N + x0], b = H[y0 * N + x1], c = H[y1 * N + x0], d = H[y1 * N + x1];
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
  }
  function wall(x) {
    const t = Math.min(1, Math.max(0, (Math.abs(x) - 26) / 70));
    return t * t * (3 - 2 * t) * WALL;
  }
  /** Ground height at world-strip coords (x, wz) where wz = z - travel. */
  function groundW(x, wz) {
    const u = x / CELL + U0, v = V0 - wz / CELL;
    // Base map plus the same map at 4x as a detail octave (small rims and rubble).
    const hn = rawAt(u, v) + (rawAt(u * 4 + 97, v * 4 + 31) - 0.5) * 0.16;
    let y = BASE + hn * AMP;
    // Soft knee then hard cap: the stage start (py 0, neutral stick) always clears.
    if (y > -5) y = Math.min(-3.2, -5 + (y + 5) * 0.3);
    return y + wall(x);
  }
  function heightAt(x, z) {
    return groundW(x, z - travel);
  }

  function buildChunk() {
    const verts = COLS * (ROWS + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    const idx = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        const a = r * COLS + c, b = a + 1, d = a + COLS, e = d + 1;
        idx.push(a, b, d, b, e, d);
      }
    }
    g.setIndex(idx);
    const mesh = new THREE.Mesh(g, mat);
    mesh.matrixAutoUpdate = true;
    return { mesh, k: 0 };
  }

  const col = new THREE.Color();
  function fillChunk(ch, k) {
    ch.k = k;
    const g = ch.mesh.geometry;
    const pos = g.attributes.position.array;
    const nor = g.attributes.normal.array;
    const clr = g.attributes.color.array;
    const wz0 = -k * CHUNK_LEN;
    let i = 0;
    for (let r = 0; r <= ROWS; r++) {
      const lz = -r * CELL;
      const wz = wz0 + lz;
      for (let c = 0; c < COLS; c++) {
        const x = XS[c];
        const y = groundW(x, wz);
        pos[i] = x; pos[i + 1] = y; pos[i + 2] = lz;
        const e = 1.0;
        const dx = groundW(x + e, wz) - groundW(x - e, wz);
        const dz = groundW(x, wz + e) - groundW(x, wz - e);
        let nx = -dx, ny = 2 * e, nz = -dz;
        const inv = 1 / Math.hypot(nx, ny, nz);
        nor[i] = nx * inv; nor[i + 1] = ny * inv; nor[i + 2] = nz * inv;
        const u = (x / CELL + U0) | 0, v = (V0 - wz / CELL) | 0;
        const cell = (v & MAP_MASK) * N + (u & MAP_MASK);
        const hn = Math.min(1, Math.max(0, (y - BASE) / (AMP + WALL * 0.6)));
        if (hn < 0.5) col.copy(C_LOW).lerp(C_MID, hn * 2);
        else col.copy(C_MID).lerp(C_HIGH, (hn - 0.5) * 2);
        if (MARE[cell]) col.multiplyScalar(0.72);
        const crest = Math.max(0, ny * inv < 0.86 ? (0.86 - ny * inv) * 2.4 : 0);
        col.lerp(C_COPPER, Math.min(0.4, crest + Math.max(0, hn - 0.78) * 0.9));
        const speck = 0.94 + (map.color[cell] & 3) * 0.035;
        clr[i] = col.r * speck; clr[i + 1] = col.g * speck; clr[i + 2] = col.b * speck;
        i += 3;
      }
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.computeBoundingSphere();
    ch.mesh.position.z = wz0 + travel;
  }

  let earth = null;
  function backdrop() {
    if (!earth) {
      earth = earthGroup();
      earth.position.set(-46, 44, -230);
      earth.rotation.set(0.38, 2.2, 0.12); // tilt; Pacific and the Americas toward the cat
    }
    return earth;
  }

  // ---- PULL UP warning (terrain mode only; never in the normal DOM) ----
  let warnEl = null;
  function ensureWarn() {
    if (warnEl) return warnEl;
    const st = document.createElement('style');
    st.textContent = `#terrain-warn{position:absolute;left:50%;top:27%;transform:translateX(-50%);z-index:6;pointer-events:none;
      font:700 clamp(26px,5.2vw,44px)/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.18em;color:#ffd2a8;
      background:rgba(150,40,10,.72);border:2px solid #ff7a3a;padding:.28em .7em;border-radius:4px;
      text-shadow:0 0 10px #ff5a1a;box-shadow:0 0 18px rgba(255,90,30,.55);display:none}
      #terrain-warn.on{display:block;animation:twarn .32s steps(2) infinite}
      @keyframes twarn{50%{opacity:.35}}`;
    document.head.appendChild(st);
    warnEl = document.createElement('div');
    warnEl.id = 'terrain-warn';
    warnEl.textContent = 'PULL UP';
    (document.getElementById('app') || document.body).appendChild(warnEl);
    return warnEl;
  }
  function warn(on) {
    const el = on ? ensureWarn() : warnEl;
    if (el) el.classList.toggle('on', !!on);
  }

  // ---- perf counters ----
  const ring = (n) => ({ a: new Float32Array(n), i: 0, n: 0 });
  const push = (r, v) => { r.a[r.i] = v; r.i = (r.i + 1) % r.a.length; r.n = Math.min(r.a.length, r.n + 1); };
  const summ = (r) => {
    const v = Array.from(r.a.slice(0, r.n)).sort((x, y) => x - y);
    if (!v.length) return { avg: 0, p95: 0, max: 0, n: 0 };
    const avg = v.reduce((s, x) => s + x, 0) / v.length;
    return { avg: +avg.toFixed(3), p95: +v[Math.floor(v.length * 0.95)].toFixed(3), max: +v[v.length - 1].toFixed(3), n: v.length };
  };
  const perf = { terrain: ring(600), render: ring(600), frame: ring(600), lastFrame: 0, crashes: 0, clearance: 99, frameCpu: 0 };
  let tickT = 0;
  function begin() { tickT = performance.now(); }
  function end() { perf.frameCpu += performance.now() - tickT; }
  // Time the whole render call and the frame interval, only in terrain mode.
  const realRender = renderer.render.bind(renderer);
  renderer.render = (s, c) => {
    const a = performance.now();
    realRender(s, c);
    const b = performance.now();
    if (active) {
      push(perf.render, b - a);
      push(perf.terrain, perf.frameCpu);
      if (perf.lastFrame) push(perf.frame, a - perf.lastFrame);
    }
    perf.frameCpu = 0;
    perf.lastFrame = a;
  };

  // Low warm raking sun from ahead-left so crater rims and ridges read under the
  // chase camera (the stage rig's sun is high and behind). Terrain mode only.
  const rake = new THREE.DirectionalLight(0xffc49a, 0.95);
  rake.position.set(-70, 22, -140);
  rake.target.position.set(0, -10, -40);

  function build() {
    teardown();
    travel = 0;
    scene.add(rake, rake.target);
    for (let i = 0; i < CHUNKS; i++) {
      const ch = chunks[i] || (chunks[i] = buildChunk());
      fillChunk(ch, i - 1);
      scene.add(ch.mesh);
    }
    active = true;
  }
  function teardown() {
    for (const ch of chunks) scene.remove(ch.mesh);
    scene.remove(rake, rake.target);
    active = false;
    warn(false);
  }
  function advance(d) {
    if (!active) return;
    travel += d;
    let maxK = -Infinity;
    for (const ch of chunks) maxK = Math.max(maxK, ch.k);
    for (const ch of chunks) {
      const nearZ = -ch.k * CHUNK_LEN + travel;
      if (nearZ - CHUNK_LEN > 10) fillChunk(ch, ++maxK);
      else ch.mesh.position.z = nearZ;
    }
    if (earth) {
      earth.userData.globe.rotation.y += d * 0.00035;
      earth.userData.shell.rotation.y += d * 0.0006;
    }
  }

  function bench(n = 120) {
    // Synchronous: n x (one row's worth of scroll + a full render).
    const cam = scene.children.find((o) => o.isCamera);
    const out = { terrain: ring(n), render: ring(n) };
    for (let i = 0; i < n; i++) {
      const a = performance.now();
      advance(0.37);
      const b = performance.now();
      realRender(scene, cam);
      const c = performance.now();
      push(out.terrain, b - a);
      push(out.render, c - b);
    }
    return { terrain: summ(out.terrain), render: summ(out.render) };
  }

  const api = {
    MARGIN,
    heightAt,
    build,
    teardown,
    advance,
    backdrop,
    warn,
    begin,
    end,
    get active() { return active; },
    get travel() { return travel; },
    noteCrash() { perf.crashes += 1; },
    noteClearance(c) { perf.clearance = c; },
    stats() {
      return {
        bakeMs: +bakeMs.toFixed(1),
        terrainMs: summ(perf.terrain),
        renderMs: summ(perf.render),
        frameMs: summ(perf.frame),
        crashes: perf.crashes,
        clearance: +perf.clearance.toFixed(2),
        travel: +travel.toFixed(1),
        tris: CHUNKS * ROWS * (COLS - 1) * 2,
        res: [renderer.domElement.width, renderer.domElement.height],
      };
    },
    resetStats() { perf.terrain = ring(600); perf.render = ring(600); perf.frame = ring(600); perf.lastFrame = 0; },
    bench,
  };
  window.__T3D = api;
  return api;
}
