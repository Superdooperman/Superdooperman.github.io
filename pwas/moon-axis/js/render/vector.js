import * as THREE from 'three';

export const COL = {
  ally: 0x7fe9ff,
  amber: 0xc9a227,
  orange: 0xff6a12,
  axis: 0xff3366,
  magenta: 0xff44aa,
  terrain: 0x3d8f5a,
  white: 0xffffff,
  dim: 0x224466,
};

export function lineMat(color, opacity = 0.95) {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function pointFlare(color, size, opacity) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
  const mat = new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: false,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

/** Bright bolt: pixel-sized flare (readable on phones) + long additive tracer. Twin = Hispano-X pair. */
export function tracerBolt(dir, { ally = true, twin = false } = {}) {
  const group = new THREE.Group();
  const len = ally ? 10 : 6.2;
  const coreCol = ally ? 0xffffff : 0xfff3c0;
  const glowCol = ally ? COL.ally : COL.axis;
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  else right.normalize();

  const addBolt = (offset) => {
    const g = new THREE.Group();
    const tip = dir.clone().multiplyScalar(len);
    const mid = dir.clone().multiplyScalar(len * 0.68);
    g.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), tip]),
      lineMat(glowCol, 0.55),
    ));
    g.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), mid]),
      lineMat(coreCol, 1),
    ));
    g.add(pointFlare(glowCol, ally ? 30 : 20, 0.55));
    g.add(pointFlare(coreCol, ally ? 13 : 10, 1));
    g.position.copy(right).multiplyScalar(offset);
    group.add(g);
  };

  if (twin) {
    addBolt(-0.64);
    addBolt(0.64);
  } else {
    addBolt(0);
  }
  return group;
}

export function tracerTrail(color) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(geo, lineMat(color, 0.4));
  line.frustumCulled = false;
  return line;
}

export function updateTrail(line, hist) {
  if (hist.length < 2) return;
  line.geometry.setFromPoints(hist);
}

export function linesFromPaths(paths, material) {
  const group = new THREE.Group();
  for (const path of paths) {
    if (path.length < 2) continue;
    const pts = path.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(geo, material));
  }
  return group;
}

export function ring(radius, n = 12, axis = 'z') {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a) * radius;
    const s = Math.sin(a) * radius;
    if (axis === 'z') pts.push([c, s, 0]);
    else if (axis === 'y') pts.push([c, 0, s]);
    else pts.push([0, c, s]);
  }
  return pts;
}

export function starfield(count = 900) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 220;
    positions[i * 3 + 2] = -Math.random() * 420;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xaadfff,
    size: 0.7,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

export function shatterBurst(color = COL.axis) {
  const group = new THREE.Group();
  const mat = lineMat(color, 1);
  const shards = [];
  for (let i = 0; i < 14; i++) {
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    const len = 0.4 + Math.random() * 1.1;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      dir.clone().multiplyScalar(len),
    ]);
    const line = new THREE.Line(geo, mat);
    group.add(line);
    shards.push({ dir, speed: 8 + Math.random() * 18 });
  }
  group.userData.shards = shards;
  group.userData.life = 0.55;
  group.userData.maxLife = 0.55;
  return group;
}

export function updateShatter(group, dt) {
  group.userData.life -= dt;
  const t = 1 - group.userData.life / group.userData.maxLife;
  group.userData.shards.forEach((s, i) => {
    const line = group.children[i];
    line.position.addScaledVector(s.dir, s.speed * dt);
  });
  const mat = group.children[0] && group.children[0].material;
  if (mat) mat.opacity = Math.max(0, 1 - t);
  return group.userData.life > 0;
}

export function moonWire() {
  const mat = lineMat(COL.terrain, 0.55);
  const paths = [];
  const R = 90;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    const ringPts = [];
    for (let j = 0; j <= 24; j++) {
      const b = (j / 24) * Math.PI * 2;
      const x = Math.cos(b) * Math.sin(a) * R;
      const y = Math.cos(a) * R;
      const z = Math.sin(b) * Math.sin(a) * R;
      ringPts.push([x, y, z]);
    }
    paths.push(ringPts);
  }
  for (let i = 0; i < 6; i++) {
    const lon = (i / 6) * Math.PI;
    const mer = [];
    for (let j = 0; j <= 16; j++) {
      const lat = (j / 16) * Math.PI;
      mer.push([
        Math.sin(lat) * Math.cos(lon) * R,
        Math.cos(lat) * R,
        Math.sin(lat) * Math.sin(lon) * R,
      ]);
    }
    paths.push(mer);
  }
  const g = linesFromPaths(paths, mat);
  g.position.set(0, -110, -80);
  return g;
}

export function trenchFrame(width = 18, height = 12, depth = 8) {
  const hw = width / 2;
  const hh = height / 2;
  const mat = lineMat(COL.terrain, 0.7);
  const paths = [
    [[-hw, -hh, 0], [hw, -hh, 0], [hw, hh, 0], [-hw, hh, 0], [-hw, -hh, 0]],
    [[-hw, -hh, -depth], [hw, -hh, -depth], [hw, hh, -depth], [-hw, hh, -depth], [-hw, -hh, -depth]],
    [[-hw, -hh, 0], [-hw, -hh, -depth]],
    [[hw, -hh, 0], [hw, -hh, -depth]],
    [[-hw, hh, 0], [-hw, hh, -depth]],
    [[hw, hh, 0], [hw, hh, -depth]],
  ];
  return linesFromPaths(paths, mat);
}

export function flakTower() {
  const mat = lineMat(COL.magenta, 0.9);
  const paths = [
    [[-1.2, 0, -1.2], [1.2, 0, -1.2], [1.2, 0, 1.2], [-1.2, 0, 1.2], [-1.2, 0, -1.2]],
    [[-0.7, 0, -0.7], [0.7, 0, -0.7], [0.7, 0, 0.7], [-0.7, 0, 0.7], [-0.7, 0, -0.7]],
    [[-1.2, 0, -1.2], [-0.4, 4.5, -0.4]],
    [[1.2, 0, -1.2], [0.4, 4.5, -0.4]],
    [[1.2, 0, 1.2], [0.4, 4.5, 0.4]],
    [[-1.2, 0, 1.2], [-0.4, 4.5, 0.4]],
    [[-0.4, 4.5, -0.4], [0.4, 4.5, -0.4], [0.4, 4.5, 0.4], [-0.4, 4.5, 0.4], [-0.4, 4.5, -0.4]],
    [[0, 4.5, 0], [0, 6.2, 0]],
    [[-0.8, 6.2, 0], [0.8, 6.2, 0]],
  ];
  return linesFromPaths(paths, mat);
}

/** Double-pyramid pylon for void / trench lane. Turrets at both tips. */
export function diamondPylon() {
  const mat = lineMat(COL.magenta, 0.9);
  const paths = [
    [[0, 3.6, 0], [1.3, 0, 1.3], [0, -3.6, 0], [-1.3, 0, 1.3], [0, 3.6, 0]],
    [[0, 3.6, 0], [1.3, 0, -1.3], [0, -3.6, 0], [-1.3, 0, -1.3], [0, 3.6, 0]],
    [[1.3, 0, 1.3], [1.3, 0, -1.3], [-1.3, 0, -1.3], [-1.3, 0, 1.3], [1.3, 0, 1.3]],
    [[-0.7, 3.6, 0], [0.7, 3.6, 0]],
    [[-0.7, -3.6, 0], [0.7, -3.6, 0]],
    [[0, 3.6, 0], [0, 4.4, 0]],
    [[0, -3.6, 0], [0, -4.4, 0]],
  ];
  return linesFromPaths(paths, mat);
}

/** Wire crater apron the stage-2 battery sits on. Local y = 0 is the deck. */
export function craterFloor() {
  const mat = lineMat(COL.terrain, 0.48);
  const paths = [];
  for (const r of [10, 18, 28, 40, 54]) {
    paths.push(ring(r, 28, 'y'));
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    paths.push([[Math.cos(a) * 8, 0, Math.sin(a) * 8], [Math.cos(a) * 54, 0, Math.sin(a) * 54]]);
  }
  paths.push([[-40, 0, -8], [40, 0, -8], [40, 0, 8], [-40, 0, 8], [-40, 0, -8]]);
  return linesFromPaths(paths, mat);
}

export function laserBolt(dir, { heavy = false } = {}) {
  const group = new THREE.Group();
  const len = heavy ? 6.4 : 4.6;
  const glowCol = heavy ? COL.magenta : COL.axis;
  // Head at origin (leading edge, traveling toward the cockpit). Tail goes
  // BACK toward the gun so the streak reads as incoming, not as your own
  // Hispano tracers flying out with you.
  const tail = dir.clone().multiplyScalar(-len);
  const core = dir.clone().multiplyScalar(-len * 0.42);
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), tail]),
    lineMat(glowCol, 0.9),
  ));
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), core]),
    lineMat(0xffe8f0, 1),
  ));
  const up = new THREE.Vector3(0, 1, 0);
  if (Math.abs(dir.dot(up)) > 0.92) up.set(1, 0, 0);
  const side = new THREE.Vector3().crossVectors(dir, up).normalize().multiplyScalar(heavy ? 0.7 : 0.46);
  const lift = new THREE.Vector3().crossVectors(side, dir).normalize().multiplyScalar(heavy ? 0.55 : 0.36);
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([side.clone().negate(), side]),
    lineMat(glowCol, 0.95),
  ));
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([lift.clone().negate(), lift]),
    lineMat(0xffffff, 0.85),
  ));
  const ringPts = ring(heavy ? 0.72 : 0.5, 10, 'z').map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const face = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), lineMat(glowCol, 0.8));
  group.add(face);
  const halo = pointFlare(glowCol, heavy ? 26 : 18, 0.9);
  const spark = pointFlare(0xffffff, heavy ? 12 : 8, 1);
  group.add(halo, spark);
  group.userData.halo = halo;
  group.userData.core = spark;
  group.userData.face = face;
  group.userData.heavy = heavy;
  group.userData.laser = true;
  return group;
}

export function updateLaser(group, dist) {
  const t = 1 - Math.min(1, Math.max(0, dist / 64));
  const h = group.userData.heavy;
  if (group.userData.halo) group.userData.halo.material.size = (h ? 18 : 12) + t * (h ? 86 : 74);
  if (group.userData.core) group.userData.core.material.size = (h ? 9 : 6) + t * (h ? 34 : 28);
  if (group.userData.face) group.userData.face.material.opacity = 0.35 + t * 0.65;
}

// Period 48 so the tiled rail wrap (env.z += 48 → 0) stays phase-continuous.
const SNAKE_PERIOD = 48;
const SNAKE_K1 = (Math.PI * 2) / SNAKE_PERIOD;
const SNAKE_K2 = (Math.PI * 4) / SNAKE_PERIOD;
const SNAKE_W1 = 0.72;
const SNAKE_W2 = 0.33;
const SNAKE_A1 = 5.8;
const SNAKE_A2 = 1.6;

/** World-X of the Stabzug snake at depth z, time t. */
export function snakeX(z, t) {
  return Math.sin(z * SNAKE_K1 + t * SNAKE_W1) * SNAKE_A1
    + Math.sin(z * SNAKE_K2 - t * SNAKE_W2) * SNAKE_A2;
}

/** dX/dZ of the snake — yaw/bank the consist along the tangent. */
export function snakeDX(z, t) {
  return Math.cos(z * SNAKE_K1 + t * SNAKE_W1) * SNAKE_A1 * SNAKE_K1
    + Math.cos(z * SNAKE_K2 - t * SNAKE_W2) * SNAKE_A2 * SNAKE_K2;
}

function makeRailLine(n, mat) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const line = new THREE.Line(geo, mat);
  line.frustumCulled = false;
  return line;
}

/** Twin rails + ties, sampled as a slithering sine (updated each frame). */
export function railTrack() {
  const mat = lineMat(COL.amber, 0.55);
  const step = 1.2;
  const z0 = -24;
  const z1 = 24;
  const n = Math.floor((z1 - z0) / step) + 1;
  const group = new THREE.Group();
  const left = makeRailLine(n, mat);
  const right = makeRailLine(n, mat);
  group.add(left, right);
  const ties = [];
  for (let i = 0; i < n; i += 2) {
    const tie = makeRailLine(4, mat);
    group.add(tie);
    ties.push(tie);
  }
  group.userData.rail = { n, step, z0, gauge: 3.2, left, right, ties };
  return group;
}

export function updateRailTrack(group, t, envZ) {
  const d = group.userData.rail;
  if (!d) return;
  const { n, step, z0, gauge, left, right, ties } = d;
  const lp = left.geometry.attributes.position.array;
  const rp = right.geometry.attributes.position.array;
  const baseZ = envZ + group.position.z;
  for (let i = 0; i < n; i++) {
    const lz = z0 + i * step;
    const wz = baseZ + lz;
    const x = snakeX(wz, t);
    const dx = snakeDX(wz, t);
    const len = Math.hypot(dx, 1) || 1;
    const nx = -1 / len;
    const nz = dx / len;
    const i3 = i * 3;
    lp[i3] = x + nx * gauge;
    lp[i3 + 1] = 0;
    lp[i3 + 2] = lz + nz * gauge;
    rp[i3] = x - nx * gauge;
    rp[i3 + 1] = 0;
    rp[i3 + 2] = lz - nz * gauge;
  }
  left.geometry.attributes.position.needsUpdate = true;
  right.geometry.attributes.position.needsUpdate = true;
  left.geometry.computeBoundingSphere();
  right.geometry.computeBoundingSphere();
  for (let k = 0; k < ties.length; k++) {
    const i = Math.min(n - 1, k * 2);
    const arr = ties[k].geometry.attributes.position.array;
    const lx = lp[i * 3];
    const lz = lp[i * 3 + 2];
    const rx = rp[i * 3];
    const rz = rp[i * 3 + 2];
    const dx = rx - lx;
    const dz = rz - lz;
    arr[0] = lx - dx * 0.08;
    arr[1] = -0.4;
    arr[2] = lz - dz * 0.08;
    arr[3] = lx;
    arr[4] = 0;
    arr[5] = lz;
    arr[6] = rx;
    arr[7] = 0;
    arr[8] = rz;
    arr[9] = rx + dx * 0.08;
    arr[10] = -0.4;
    arr[11] = rz + dz * 0.08;
    ties[k].geometry.attributes.position.needsUpdate = true;
  }
}

export function trainSpine(count) {
  const mat = lineMat(COL.magenta, 0.7);
  const line = makeRailLine(Math.max(2, count), mat);
  line.userData.spineN = Math.max(2, count);
  return line;
}

export function updateTrainSpine(line, points) {
  if (!line || !points.length) {
    if (line) line.visible = false;
    return;
  }
  line.visible = true;
  const n = line.userData.spineN || points.length;
  const arr = line.geometry.attributes.position.array;
  for (let i = 0; i < n; i++) {
    const p = points[Math.min(i, points.length - 1)];
    arr[i * 3] = p.x;
    arr[i * 3 + 1] = p.y;
    arr[i * 3 + 2] = p.z;
  }
  line.geometry.attributes.position.needsUpdate = true;
  line.geometry.computeBoundingSphere();
}

/** Interior ribs of the Staff. Amber foundry light. */
export function staffRibs(width = 16, height = 12, depth = 10) {
  const hw = width / 2;
  const hh = height / 2;
  const mat = lineMat(COL.amber, 0.72);
  const paths = [
    [[-hw, -hh, 0], [hw, -hh, 0], [hw, hh, 0], [-hw, hh, 0], [-hw, -hh, 0]],
    [[-hw, -hh, -depth], [hw, -hh, -depth], [hw, hh, -depth], [-hw, hh, -depth], [-hw, -hh, -depth]],
    [[-hw, -hh, 0], [-hw, -hh, -depth]],
    [[hw, -hh, 0], [hw, -hh, -depth]],
    [[-hw, hh, 0], [-hw, hh, -depth]],
    [[hw, hh, 0], [hw, hh, -depth]],
    [[-hw, -hh, 0], [0, hh, -depth * 0.5], [hw, -hh, -depth]],
    [[hw, -hh, 0], [0, hh, -depth * 0.5], [-hw, -hh, -depth]],
  ];
  return linesFromPaths(paths, mat);
}

/** Hanging rod / bell in the foundry well. */
export function foundryCore() {
  const mat = lineMat(COL.amber, 0.95);
  const paths = [
    ring(2.4, 16, 'y').map((p) => [p[0], 3.2, p[2]]),
    ring(1.6, 14, 'y').map((p) => [p[0], 1.2, p[2]]),
    ring(0.9, 12, 'y').map((p) => [p[0], -0.4, p[2]]),
    ring(1.8, 14, 'y').map((p) => [p[0], -2.2, p[2]]),
    [[0, 4.6, 0], [0, -2.8, 0]],
    [[-2.4, 3.2, 0], [-0.9, -0.4, 0], [-1.8, -2.2, 0]],
    [[2.4, 3.2, 0], [0.9, -0.4, 0], [1.8, -2.2, 0]],
    [[0, 3.2, -2.4], [0, -0.4, -0.9], [0, -2.2, -1.8]],
    [[0, 3.2, 2.4], [0, -0.4, 0.9], [0, -2.2, 1.8]],
  ];
  return linesFromPaths(paths, mat);
}

/** Small turret orb that rings the foundry core. */
export function turretOrb() {
  const mat = lineMat(COL.magenta, 0.95);
  const paths = [
    [[0, 1.1, 0], [0.85, 0, 0.85], [0, -1.1, 0], [-0.85, 0, 0.85], [0, 1.1, 0]],
    [[0, 1.1, 0], [0.85, 0, -0.85], [0, -1.1, 0], [-0.85, 0, -0.85], [0, 1.1, 0]],
    [[0.85, 0, 0.85], [0.85, 0, -0.85], [-0.85, 0, -0.85], [-0.85, 0, 0.85], [0.85, 0, 0.85]],
    ring(0.45, 10, 'y'),
  ];
  return linesFromPaths(paths, mat);
}

/** Escape scatter — big, hot panels so they read against the well. */
export function debrisChunk() {
  const mat = lineMat(COL.orange, 0.98);
  const s = 2.1 + Math.random() * 2.4;
  const paths = [
    [[-s, -s * 0.4, 0], [s, -s * 0.3, 0], [s, s * 0.45, 0], [-s, s * 0.35, 0], [-s, -s * 0.4, 0]],
    [[-s, -s * 0.4, 0], [s, s * 0.45, 0]],
    [[s, -s * 0.3, 0], [-s, s * 0.35, 0]],
    [[0, -s * 0.2, -s * 0.3], [0, s * 0.2, s * 0.3]],
  ];
  const g = linesFromPaths(paths, mat);
  g.add(pointFlare(COL.orange, 24, 0.95));
  g.add(pointFlare(0xffffff, 10, 1));
  return g;
}

/** Falling bulkhead — fat orange plate, reads as a wall not a fighter. */
export function fallingPanel() {
  const mat = lineMat(COL.orange, 1);
  const w = 2.6 + Math.random() * 2.0;
  const h = 1.6 + Math.random() * 1.4;
  const paths = [
    [[-w, -h, 0], [w, -h, 0], [w, h, 0], [-w, h, 0], [-w, -h, 0]],
    [[-w, -h, 0], [w, h, 0]],
    [[w, -h, 0], [-w, h, 0]],
    [[-w * 0.55, 0, 0], [w * 0.55, 0, 0]],
    [[0, -h * 0.55, 0], [0, h * 0.55, 0]],
    ring(Math.min(w, h) * 0.28, 10, 'z'),
  ];
  const g = linesFromPaths(paths, mat);
  g.add(pointFlare(COL.orange, 28, 1));
  g.add(pointFlare(0xffffff, 12, 1));
  return g;
}
