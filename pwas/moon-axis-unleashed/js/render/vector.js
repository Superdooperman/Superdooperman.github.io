import * as THREE from 'three';

export const COL = {
  ally: 0x7fe9ff,
  amber: 0xc9a227,
  orange: 0xff6a12,
  axis: 0xff3366,
  magenta: 0xff44aa,
  terrain: 0x8a7a68,
  white: 0xffffff,
  dim: 0x224466,
};

const GEO = new Map();
function geo(key, build) {
  let g = GEO.get(key);
  if (!g) {
    g = build();
    GEO.set(key, g);
  }
  return g;
}

export function lineMat(color, opacity = 0.95) {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.72,
    metalness: opts.metalness ?? 0.18,
    emissive: new THREE.Color(opts.emissive ?? 0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    side: opts.side || THREE.FrontSide,
  });
}

function basic(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    blending: opacity < 1 ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

function orientYTo(mesh, dir) {
  const n = dir.clone().normalize();
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  return mesh;
}

function pointFlare(color, size, opacity) {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3()]);
  const mat = new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: false,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Points(g, mat);
}

function streak(dir, len, color, radius, opacity = 0.95) {
  const mesh = new THREE.Mesh(
    geo(`streak:${radius}:${len}`, () => new THREE.CylinderGeometry(radius, radius * 0.25, len, 6)),
    basic(color, opacity),
  );
  orientYTo(mesh, dir);
  mesh.position.copy(dir).multiplyScalar(len * 0.5);
  return mesh;
}

/** Bright bolt. Twin = Hispano-X pair. */
export function tracerBolt(dir, { ally = true, twin = false } = {}) {
  const group = new THREE.Group();
  const len = ally ? 9 : 5.6;
  const coreCol = ally ? 0xfff6d8 : 0xfff3c0;
  const glowCol = ally ? COL.ally : COL.axis;
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  else right.normalize();
  const addBolt = (offset) => {
    const g = new THREE.Group();
    g.add(streak(dir, len, glowCol, ally ? 0.09 : 0.07, 0.55));
    g.add(streak(dir, len * 0.72, coreCol, ally ? 0.045 : 0.035, 1));
    g.add(pointFlare(glowCol, ally ? 22 : 16, 0.7));
    g.position.copy(right).multiplyScalar(offset);
    group.add(g);
  };
  if (twin) {
    addBolt(-0.55);
    addBolt(0.55);
  } else addBolt(0);
  return group;
}

export function tracerTrail(color) {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(g, lineMat(color, 0.55));
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
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material));
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
  const colors = new Float32Array(count * 3);
  const palette = [
    [0.75, 0.85, 1],
    [1, 0.92, 0.75],
    [1, 0.75, 0.62],
    [0.7, 0.95, 1],
  ];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 520;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 280;
    positions[i * 3 + 2] = -Math.random() * 520;
    const c = palette[(Math.random() * palette.length) | 0];
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.15,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.92,
    vertexColors: true,
    depthWrite: false,
  });
  return new THREE.Points(g, mat);
}

export function shatterBurst(color = COL.axis) {
  const group = new THREE.Group();
  const fire = new THREE.Mesh(
    geo('burst:fire', () => new THREE.SphereGeometry(0.55, 10, 8)),
    basic(0xfff3c4, 1),
  );
  const glow = new THREE.Mesh(
    geo('burst:glow', () => new THREE.SphereGeometry(1.15, 10, 8)),
    basic(color, 0.45),
  );
  group.add(fire, glow);
  const pieces = [];
  for (let i = 0; i < 14; i++) {
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    const shard = new THREE.Mesh(
      geo('burst:shard', () => new THREE.BoxGeometry(0.28, 0.08, 0.08)),
      basic(i % 3 === 0 ? 0xfff1c8 : color, 1),
    );
    shard.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    group.add(shard);
    pieces.push({ mesh: shard, dir, speed: 7 + Math.random() * 16 });
  }
  const light = new THREE.PointLight(color, 6, 16, 2);
  group.add(light);
  group.userData.pieces = pieces;
  group.userData.fire = fire;
  group.userData.glow = glow;
  group.userData.light = light;
  group.userData.life = 0.62;
  group.userData.maxLife = 0.62;
  return group;
}

export function updateShatter(group, dt) {
  group.userData.life -= dt;
  const t = 1 - group.userData.life / group.userData.maxLife;
  for (const s of group.userData.pieces || []) {
    s.mesh.position.addScaledVector(s.dir, s.speed * dt);
    if (s.mesh.material) s.mesh.material.opacity = Math.max(0, 1 - t);
  }
  if (group.userData.fire) {
    group.userData.fire.scale.setScalar(1 + t * 3.4);
    group.userData.fire.material.opacity = Math.max(0, 1 - t * 1.25);
  }
  if (group.userData.glow) {
    group.userData.glow.scale.setScalar(1 + t * 4.6);
    group.userData.glow.material.opacity = Math.max(0, 0.5 * (1 - t));
  }
  if (group.userData.light) group.userData.light.intensity = Math.max(0, 7 * (1 - t));
  return group.userData.life > 0;
}

function displacedSphere(radius, seg, color, emissive) {
  const g = new THREE.SphereGeometry(radius, seg, Math.max(8, seg - 6));
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = Math.sin(x * 0.37) * Math.cos(z * 0.29) * Math.sin(y * 0.21);
    const k = 1 + n * 0.045;
    pos.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, std(color, { roughness: 0.92, metalness: 0.05, emissive, emissiveIntensity: 0.35 }));
}

/** Distant moon for the cislunar scramble. */
export function distantMoon() {
  const group = new THREE.Group();
  const moon = displacedSphere(38, 28, 0xb7aa98, 0x3a3028);
  moon.position.set(26, 18, -210);
  group.add(moon);
  const earth = new THREE.Mesh(
    geo('earth', () => new THREE.SphereGeometry(16, 20, 14)),
    std(0x1d4e86, { emissive: 0x0a2a55, emissiveIntensity: 0.8, roughness: 0.55, metalness: 0.15 }),
  );
  earth.position.set(-70, -28, -240);
  group.add(earth);
  const wash = new THREE.Mesh(
    geo('earthglow', () => new THREE.SphereGeometry(18.5, 16, 12)),
    basic(0x3d7ec4, 0.18),
  );
  wash.position.copy(earth.position);
  group.add(wash);
  return group;
}

/** Regolith body under the surface sorties. Sits low so the deck reads above it. */
export function moonWire() {
  const moon = displacedSphere(78, 32, 0x9a8d7c, 0x2a241c);
  moon.position.set(8, -96, -70);
  return moon;
}

export function rigLights(kind = 'space') {
  const g = new THREE.Group();
  const hemi = new THREE.HemisphereLight(
    kind === 'staff' || kind === 'escape' ? 0xffc48a : 0xc5d7ff,
    kind === 'surface' || kind === 'yard' ? 0x3a2a22 : 0x10141e,
    kind === 'staff' ? 0.55 : 0.72,
  );
  g.add(hemi);
  const sun = new THREE.DirectionalLight(kind === 'escape' ? 0xffb080 : 0xfff1d2, kind === 'staff' ? 0.85 : 1.45);
  sun.position.set(30, 48, 18);
  g.add(sun);
  const fill = new THREE.DirectionalLight(kind === 'staff' ? 0xff8844 : 0x6a88c8, 0.45);
  fill.position.set(-24, 8, -12);
  g.add(fill);
  if (kind === 'surface' || kind === 'yard' || kind === 'space') {
    const dust = new THREE.PointLight(0xffe2b0, 1.4, 90, 2);
    dust.position.set(0, 6, -24);
    g.add(dust);
  }
  if (kind === 'trench' || kind === 'staff' || kind === 'escape') {
    const throat = new THREE.PointLight(kind === 'escape' ? 0xff5522 : 0xffaa55, 2.2, 70, 2);
    throat.position.set(0, 2, -30);
    g.add(throat);
  }
  if (kind === 'rail') {
    const lamp = new THREE.PointLight(0xffcc88, 1.6, 60, 2);
    lamp.position.set(0, 2, -36);
    g.add(lamp);
  }
  return g;
}

export function dustField(count = 240, color = 0xd8cbb4) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 46;
    positions[i * 3 + 1] = -2 + Math.random() * 14;
    positions[i * 3 + 2] = -Math.random() * 220;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({
    color,
    size: 0.28,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  }));
}

/** A rib of the Festung trench: solid walls, lit floor, warning lamps. */
export function trenchFrame(width = 22, height = 14, depth = 12) {
  const group = new THREE.Group();
  const hw = width / 2;
  const hh = height / 2;
  const wallMat = std(0x6d6258, { roughness: 0.88, metalness: 0.08, emissive: 0x1a140e, emissiveIntensity: 0.25 });
  const floorMat = std(0x3e3834, { roughness: 0.9, metalness: 0.12 });
  const left = new THREE.Mesh(geo(`trenchW:${depth}`, () => new THREE.BoxGeometry(1.4, height, depth)), wallMat);
  left.position.set(-hw, 0, -depth / 2);
  const right = left.clone();
  right.position.x = hw;
  const floor = new THREE.Mesh(geo(`trenchF:${width}:${depth}`, () => new THREE.BoxGeometry(width, 0.45, depth)), floorMat);
  floor.position.set(0, -hh, -depth / 2);
  const lip = new THREE.Mesh(geo('trenchLip', () => new THREE.BoxGeometry(width * 0.92, 0.18, 0.35)), std(0xc9a227, { emissive: 0x5a3a08, emissiveIntensity: 0.55, metalness: 0.4 }));
  lip.position.set(0, -hh + 0.4, -0.2);
  group.add(left, right, floor, lip);
  const lampGeo = geo('lamp', () => new THREE.SphereGeometry(0.22, 8, 6));
  for (const x of [-hw + 0.9, hw - 0.9]) {
    const lamp = new THREE.Mesh(lampGeo, basic(0xff5533, 0.9));
    lamp.position.set(x, hh * 0.35, -depth * 0.5);
    group.add(lamp);
  }
  return group;
}

export function flakTower() {
  const group = new THREE.Group();
  const concrete = std(0x8a7568, { roughness: 0.86, metalness: 0.08 });
  const iron = std(0x2a2428, { metalness: 0.7, roughness: 0.35 });
  group.add(new THREE.Mesh(geo('towerBase', () => new THREE.CylinderGeometry(1.35, 1.7, 0.6, 8)), concrete));
  const shaft = new THREE.Mesh(geo('towerShaft', () => new THREE.CylinderGeometry(0.55, 1.05, 4.6, 7)), concrete);
  shaft.position.y = 2.5;
  group.add(shaft);
  const head = new THREE.Mesh(geo('towerHead', () => new THREE.BoxGeometry(1.5, 0.55, 1.5)), iron);
  head.position.y = 5.05;
  group.add(head);
  const gun = new THREE.Mesh(geo('towerGun', () => new THREE.CylinderGeometry(0.12, 0.16, 1.5, 6)), std(0xd0c8cc, { metalness: 0.8 }));
  gun.position.set(0, 5.35, 0.4);
  gun.rotation.x = Math.PI / 2.4;
  group.add(gun);
  const lamp = new THREE.Mesh(geo('towerLamp', () => new THREE.SphereGeometry(0.2, 8, 6)), basic(0xff3355));
  lamp.position.y = 5.7;
  group.add(lamp);
  return group;
}

export function diamondPylon() {
  const group = new THREE.Group();
  const crystal = std(0x7a3058, { roughness: 0.25, metalness: 0.45, emissive: 0x441028, emissiveIntensity: 0.7 });
  const top = new THREE.Mesh(geo('diaTop', () => new THREE.OctahedronGeometry(1.7, 0)), crystal);
  top.scale.set(1, 2.1, 1);
  group.add(top);
  const core = new THREE.Mesh(geo('diaCore', () => new THREE.OctahedronGeometry(0.55, 0)), basic(0xff88aa, 0.85));
  group.add(core);
  const tip = new THREE.Mesh(geo('diaTip', () => new THREE.SphereGeometry(0.16, 6, 6)), basic(0xffffff, 0.9));
  tip.position.y = 3.4;
  const tip2 = tip.clone();
  tip2.position.y = -3.4;
  group.add(tip, tip2);
  return group;
}

/** Crater apron. Local y = 0 is the deck the towers sit on. */
export function craterFloor() {
  const group = new THREE.Group();
  const g = geo('craterDeck', () => {
    const plane = new THREE.PlaneGeometry(96, 70, 18, 12);
    plane.rotateX(-Math.PI / 2);
    const pos = plane.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const bowl = Math.exp(-(x * x + z * z) / 900) * -1.6;
      const rip = Math.sin(x * 0.35) * Math.cos(z * 0.28) * 0.35;
      pos.setY(i, bowl + rip);
    }
    plane.computeVertexNormals();
    return plane;
  });
  const deck = new THREE.Mesh(g, std(0x8d8172, { roughness: 0.95, metalness: 0.04, emissive: 0x1c1814, emissiveIntensity: 0.2 }));
  group.add(deck);
  const rim = new THREE.Mesh(
    geo('craterRim', () => new THREE.TorusGeometry(22, 1.1, 6, 28)),
    std(0xb7a898, { roughness: 0.9 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.2;
  group.add(rim);
  return group;
}

export function laserBolt(dir, { heavy = false } = {}) {
  const group = new THREE.Group();
  const len = heavy ? 6.2 : 4.4;
  const glowCol = heavy ? COL.magenta : COL.axis;
  const back = dir.clone().multiplyScalar(-1);
  group.add(streak(back, len, glowCol, heavy ? 0.12 : 0.08, 0.8));
  group.add(streak(back, len * 0.45, 0xffe8f0, heavy ? 0.05 : 0.035, 1));
  const halo = pointFlare(glowCol, heavy ? 20 : 14, 0.9);
  const spark = pointFlare(0xffffff, heavy ? 10 : 7, 1);
  group.add(halo, spark);
  group.userData.halo = halo;
  group.userData.core = spark;
  group.userData.heavy = heavy;
  group.userData.laser = true;
  return group;
}

export function updateLaser(group, dist) {
  const t = 1 - Math.min(1, Math.max(0, dist / 64));
  const h = group.userData.heavy;
  if (group.userData.halo) group.userData.halo.material.size = (h ? 16 : 11) + t * (h ? 40 : 32);
  if (group.userData.core) group.userData.core.material.size = (h ? 8 : 5) + t * (h ? 18 : 14);
}

const SNAKE_PERIOD = 48;
const SNAKE_K1 = (Math.PI * 2) / SNAKE_PERIOD;
const SNAKE_K2 = (Math.PI * 4) / SNAKE_PERIOD;
const SNAKE_W1 = 0.72;
const SNAKE_W2 = 0.33;
const SNAKE_A1 = 5.8;
const SNAKE_A2 = 1.6;

export function snakeX(z, t) {
  return Math.sin(z * SNAKE_K1 + t * SNAKE_W1) * SNAKE_A1
    + Math.sin(z * SNAKE_K2 - t * SNAKE_W2) * SNAKE_A2;
}

export function snakeDX(z, t) {
  return Math.cos(z * SNAKE_K1 + t * SNAKE_W1) * SNAKE_A1 * SNAKE_K1
    + Math.cos(z * SNAKE_K2 - t * SNAKE_W2) * SNAKE_A2 * SNAKE_K2;
}

function ribbon(n, color, opacity) {
  const geoRibbon = new THREE.BufferGeometry();
  geoRibbon.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3));
  const idx = [];
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geoRibbon.setIndex(idx);
  const mesh = new THREE.Mesh(geoRibbon, new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity,
  }));
  mesh.frustumCulled = false;
  return mesh;
}

export function railTrack() {
  const step = 1.2;
  const z0 = -24;
  const z1 = 24;
  const n = Math.floor((z1 - z0) / step) + 1;
  const group = new THREE.Group();
  const bed = new THREE.Mesh(
    geo('railbed', () => new THREE.BoxGeometry(14, 0.35, 48)),
    std(0x2c2826, { roughness: 0.92, metalness: 0.08 }),
  );
  bed.position.y = -0.55;
  group.add(bed);
  const left = ribbon(n, 0xe2c27a, 0.95);
  const right = ribbon(n, 0xe2c27a, 0.95);
  group.add(left, right);
  const ties = ribbon(Math.ceil(n / 2), 0x6a5340, 0.9);
  group.add(ties);
  group.userData.rail = { n, step, z0, gauge: 1.55, half: 0.08, left, right, ties };
  return group;
}

function writeRibbon(mesh, samples) {
  const arr = mesh.geometry.attributes.position.array;
  const n = samples.length;
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    const i6 = i * 6;
    arr[i6] = s.x1;
    arr[i6 + 1] = s.y1;
    arr[i6 + 2] = s.z1;
    arr[i6 + 3] = s.x2;
    arr[i6 + 4] = s.y2;
    arr[i6 + 5] = s.z2;
  }
  mesh.geometry.attributes.position.needsUpdate = true;
  mesh.geometry.computeBoundingSphere();
}

export function updateRailTrack(group, t, envZ) {
  const d = group.userData.rail;
  if (!d) return;
  const { n, step, z0, gauge, half, left, right, ties } = d;
  const baseZ = envZ + group.position.z;
  const leftS = [];
  const rightS = [];
  const tieS = [];
  for (let i = 0; i < n; i++) {
    const lz = z0 + i * step;
    const wz = baseZ + lz;
    const x = snakeX(wz, t);
    const dx = snakeDX(wz, t);
    const len = Math.hypot(dx, 1) || 1;
    const nx = -1 / len;
    const nz = dx / len;
    leftS.push({
      x1: x + nx * (gauge - half), y1: 0.05, z1: lz + nz * (gauge - half),
      x2: x + nx * (gauge + half), y2: 0.22, z2: lz + nz * (gauge + half),
    });
    rightS.push({
      x1: x - nx * (gauge - half), y1: 0.05, z1: lz - nz * (gauge - half),
      x2: x - nx * (gauge + half), y2: 0.22, z2: lz - nz * (gauge + half),
    });
    if (i % 2 === 0) {
      tieS.push({
        x1: x + nx * gauge, y1: -0.05, z1: lz + nz * gauge,
        x2: x - nx * gauge, y2: 0.08, z2: lz - nz * gauge,
      });
    }
  }
  writeRibbon(left, leftS);
  writeRibbon(right, rightS);
  writeRibbon(ties, tieS);
}

export function trainSpine(count) {
  const n = Math.max(2, count);
  const mesh = ribbon(n, COL.magenta, 0.8);
  mesh.userData.spineN = n;
  return mesh;
}

export function updateTrainSpine(line, points) {
  if (!line) return;
  if (!points.length) {
    line.visible = false;
    return;
  }
  line.visible = true;
  const n = line.userData.spineN || points.length;
  const samples = [];
  for (let i = 0; i < n; i++) {
    const p = points[Math.min(i, points.length - 1)];
    samples.push({
      x1: p.x - 0.35, y1: p.y + 0.4, z1: p.z,
      x2: p.x + 0.35, y2: p.y + 1.1, z2: p.z,
    });
  }
  writeRibbon(line, samples);
}

/** Interior of the Staff: arched ribs, amber foundry glass. */
export function staffRibs(width = 18, height = 14, depth = 12) {
  const group = new THREE.Group();
  const hw = width / 2;
  const hh = height / 2;
  const rib = new THREE.Mesh(
    geo('staffArch', () => new THREE.TorusGeometry(hh * 0.92, 0.28, 8, 18, Math.PI)),
    std(0x6a5038, { metalness: 0.45, roughness: 0.5, emissive: 0x3a220c, emissiveIntensity: 0.45 }),
  );
  rib.rotation.z = Math.PI;
  rib.rotation.y = Math.PI / 2;
  rib.position.set(0, -hh * 0.15, -depth * 0.5);
  group.add(rib);
  const deck = new THREE.Mesh(
    geo(`staffDeck:${width}:${depth}`, () => new THREE.BoxGeometry(width * 0.86, 0.4, depth)),
    std(0x2a221c, { roughness: 0.85, emissive: 0x1a1008, emissiveIntensity: 0.3 }),
  );
  deck.position.set(0, -hh + 0.3, -depth / 2);
  group.add(deck);
  const glass = new THREE.Mesh(
    geo('staffGlass', () => new THREE.BoxGeometry(1.2, 2.2, 0.12)),
    basic(0xffb25a, 0.45),
  );
  glass.position.set(-hw + 1.1, 0.4, -depth * 0.45);
  const glass2 = glass.clone();
  glass2.position.x = hw - 1.1;
  group.add(glass, glass2);
  return group;
}

export function foundryCore() {
  const group = new THREE.Group();
  const bell = new THREE.Mesh(
    geo('coreBell', () => new THREE.SphereGeometry(1.7, 16, 12)),
    std(0xe6b15a, { metalness: 0.55, roughness: 0.28, emissive: 0xff8818, emissiveIntensity: 0.85 }),
  );
  bell.scale.set(1, 1.35, 1);
  group.add(bell);
  const ringTop = new THREE.Mesh(geo('coreRing', () => new THREE.TorusGeometry(2.3, 0.12, 8, 24)), basic(0xffd27a, 0.8));
  ringTop.rotation.x = Math.PI / 2;
  ringTop.position.y = 2.4;
  const ringMid = ringTop.clone();
  ringMid.scale.setScalar(0.72);
  ringMid.position.y = 0.2;
  group.add(ringTop, ringMid);
  const spike = new THREE.Mesh(geo('coreSpike', () => new THREE.CylinderGeometry(0.08, 0.08, 6.2, 6)), std(0xd8c8a8, { metalness: 0.8 }));
  group.add(spike);
  const light = new THREE.PointLight(0xffaa44, 3.5, 22, 2);
  group.add(light);
  return group;
}

export function turretOrb() {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(
    geo('orbBody', () => new THREE.IcosahedronGeometry(0.85, 0)),
    std(0xff4466, { metalness: 0.4, roughness: 0.3, emissive: 0x661122, emissiveIntensity: 0.8 }),
  ));
  const ringM = new THREE.Mesh(geo('orbRing', () => new THREE.TorusGeometry(1.15, 0.06, 6, 16)), basic(0xffd0e0, 0.8));
  ringM.rotation.x = Math.PI / 2.4;
  group.add(ringM);
  return group;
}

export function debrisChunk() {
  const group = new THREE.Group();
  const s = 1.4 + Math.random() * 1.1;
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(s * 1.6, s * 0.35, s * 0.9),
    std(0x8a4030, { roughness: 0.6, emissive: 0x552208, emissiveIntensity: 0.55 }),
  );
  plate.rotation.set(Math.random(), Math.random(), Math.random());
  group.add(plate);
  group.add(pointFlare(COL.orange, 18, 0.8));
  return group;
}

export function fallingPanel() {
  const group = new THREE.Group();
  const w = 2.4 + Math.random() * 1.6;
  const h = 1.5 + Math.random() * 1.2;
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, 0.18),
    std(0xc4552a, { roughness: 0.5, metalness: 0.25, emissive: 0x662208, emissiveIntensity: 0.45 }),
  );
  group.add(plate);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.7, 0.12, 0.22),
    basic(0xffe2a0, 0.9),
  );
  group.add(stripe);
  group.add(pointFlare(COL.orange, 16, 0.7));
  return group;
}
