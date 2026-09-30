import * as THREE from 'three';

export const COL = {
  ally: 0x7fe9ff,
  amber: 0xc9a227,
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
