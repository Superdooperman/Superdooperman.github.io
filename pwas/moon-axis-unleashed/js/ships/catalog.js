import * as THREE from 'three';

const GEO = new Map();

function g(key, build) {
  let geo = GEO.get(key);
  if (!geo) {
    geo = build();
    GEO.set(key, geo);
  }
  return geo;
}

function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.42,
    metalness: opts.metalness ?? 0.62,
    emissive: new THREE.Color(opts.emissive ?? 0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
}

function basic(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });
}

function mesh(geo, material, x = 0, y = 0, z = 0, rot = null) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

const boxG = (w, h, d) => g(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
const cylG = (rt, rb, h, seg = 10) => g(`cyl:${rt}:${rb}:${h}:${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
const sphG = (r, s = 10) => g(`sph:${r}:${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, s - 2)));
const coneG = (r, h) => g(`cone:${r}:${h}`, () => new THREE.ConeGeometry(r, h, 8));

function engine(x, y, z, color, scale = 1) {
  const m = mesh(sphG(0.16 * scale, 8), basic(color), x, y, z);
  m.userData.engine = true;
  const halo = mesh(sphG(0.32 * scale, 8), basic(color, 0.35), x, y, z);
  halo.userData.engine = true;
  return [m, halo];
}

/** F6F-V Voidcat — fat Hellcat, cyan fusion ring, tailhook. Nose is +Z. */
export function voidcat() {
  const root = new THREE.Group();
  const skin = 0x2a4d62;
  const metal = 0x8aa4b0;
  const glass = 0x9fe7ff;
  root.add(mesh(cylG(0.34, 0.28, 1.7, 12), std(skin, { metalness: 0.7 }), 0, 0.05, 0.15, [Math.PI / 2, 0, 0]));
  root.add(mesh(cylG(0.4, 0.36, 0.42, 12), std(metal, { metalness: 0.85, roughness: 0.28 }), 0, 0.05, 1.05, [Math.PI / 2, 0, 0]));
  root.add(mesh(coneG(0.18, 0.28), std(0xc9d6dc, { metalness: 0.9 }), 0, 0.05, 1.38, [Math.PI / 2, 0, 0]));
  const ring = mesh(g('torus:0.46', () => new THREE.TorusGeometry(0.46, 0.045, 8, 18)), basic(0x7fe9ff), 0, 0.05, 0.72, [Math.PI / 2, 0, 0]);
  ring.userData.engine = true;
  root.add(ring);
  root.add(mesh(sphG(0.28, 10), std(glass, { roughness: 0.12, metalness: 0.2, emissive: 0x123844, emissiveIntensity: 0.6 }), 0, 0.32, 0.28));
  root.add(mesh(boxG(1.35, 0.08, 0.72), std(skin), 1.05, 0.08, 0.12));
  root.add(mesh(boxG(1.35, 0.08, 0.72), std(skin), -1.05, 0.08, 0.12));
  root.add(mesh(boxG(0.08, 0.08, 0.55), std(0xd7e4ea, { metalness: 0.8 }), 1.15, 0.12, 0.55));
  root.add(mesh(boxG(0.08, 0.08, 0.55), std(0xd7e4ea, { metalness: 0.8 }), -1.15, 0.12, 0.55));
  root.add(mesh(boxG(0.08, 0.72, 0.42), std(skin), 0, 0.42, -1.22));
  root.add(mesh(boxG(1.15, 0.06, 0.32), std(skin), 0, 0.18, -1.28));
  root.add(mesh(boxG(0.05, 0.22, 0.28), std(0xc9a227, { metalness: 0.7 }), 0, -0.22, -1.15));
  root.add(...engine(1.55, 0.08, -0.05, 0x7fe9ff, 0.8));
  root.add(...engine(-1.55, 0.08, -0.05, 0x7fe9ff, 0.8));
  root.add(...engine(0, 0.02, -0.55, 0xfff2c4, 1.1));
  root.userData.color = 0x7fe9ff;
  return root;
}

/** P-38 Starfork — twin boom, cyan helmet mark. */
export function starfork() {
  const root = new THREE.Group();
  const skin = 0x3d6d78;
  root.add(mesh(boxG(0.55, 0.28, 1.15), std(skin), 0, 0.16, 0.15));
  root.add(mesh(sphG(0.2, 8), std(0x9fe7ff, { roughness: 0.15, emissive: 0x14586a }), 0, 0.32, 0.35));
  root.add(mesh(cylG(0.16, 0.14, 2.15, 8), std(skin, { metalness: 0.75 }), -0.85, 0.08, -0.05, [Math.PI / 2, 0, 0]));
  root.add(mesh(cylG(0.16, 0.14, 2.15, 8), std(skin, { metalness: 0.75 }), 0.85, 0.08, -0.05, [Math.PI / 2, 0, 0]));
  root.add(mesh(boxG(1.9, 0.07, 0.42), std(skin), 0, 0.12, 0.15));
  root.add(mesh(boxG(1.85, 0.06, 0.28), std(skin), 0, 0.22, -1.15));
  root.add(mesh(boxG(0.06, 0.48, 0.28), std(0x7fe9ff, { emissive: 0x1a6a80, emissiveIntensity: 0.8 }), -0.85, 0.42, -1.15));
  root.add(mesh(boxG(0.06, 0.48, 0.28), std(0x7fe9ff, { emissive: 0x1a6a80, emissiveIntensity: 0.8 }), 0.85, 0.42, -1.15));
  root.add(...engine(-0.85, 0.08, 1.05, 0xffe7b0, 0.7));
  root.add(...engine(0.85, 0.08, 1.05, 0xffe7b0, 0.7));
  root.userData.color = 0x7fe9ff;
  return root;
}

/** Bf 109 Nachtschwalbe — skinny dart, bat vanes. */
export function nachtschwalbe() {
  const root = new THREE.Group();
  const skin = 0x4a2030;
  root.add(mesh(cylG(0.12, 0.16, 2.5, 8), std(skin, { metalness: 0.55 }), 0, 0.05, 0.1, [Math.PI / 2, 0, 0]));
  root.add(mesh(coneG(0.1, 0.55), std(0xd8dde2, { metalness: 0.8 }), 0, 0.05, 1.45, [Math.PI / 2, 0, 0]));
  root.add(mesh(boxG(1.35, 0.05, 0.55), std(skin), 0.85, 0.12, 0.05, [0, 0, -0.28]));
  root.add(mesh(boxG(1.35, 0.05, 0.55), std(skin), -0.85, 0.12, 0.05, [0, 0, 0.28]));
  root.add(mesh(boxG(0.42, 0.28, 0.08), std(0x2a1218), 0.55, 0.32, -0.05, [0, 0, 0.4]));
  root.add(mesh(boxG(0.42, 0.28, 0.08), std(0x2a1218), -0.55, 0.32, -0.05, [0, 0, -0.4]));
  root.add(mesh(boxG(0.06, 0.48, 0.32), std(skin), 0, 0.38, -1.25));
  root.add(...engine(0, 0.02, -1.15, 0xff3355, 0.7));
  root.userData.color = 0xff3366;
  return root;
}

/** Fw 190 Würger-X — fat radial, blunt wings. */
export function wuerger() {
  const root = new THREE.Group();
  const skin = 0x6a2430;
  root.add(mesh(cylG(0.42, 0.34, 1.55, 12), std(skin, { metalness: 0.6 }), 0, 0.06, 0.15, [Math.PI / 2, 0, 0]));
  root.add(mesh(cylG(0.48, 0.46, 0.36, 12), std(0x1a1c22, { metalness: 0.8, roughness: 0.35 }), 0, 0.06, 0.95, [Math.PI / 2, 0, 0]));
  root.add(mesh(boxG(1.55, 0.1, 0.7), std(skin), 1.05, 0.08, 0.05));
  root.add(mesh(boxG(1.55, 0.1, 0.7), std(skin), -1.05, 0.08, 0.05));
  root.add(mesh(boxG(0.08, 0.62, 0.38), std(skin), 0, 0.48, -0.85));
  root.add(mesh(sphG(0.16, 8), std(0xff8899, { roughness: 0.2, emissive: 0x551122 }), 0, 0.28, 0.45));
  root.add(...engine(0, 0.02, -0.7, 0xff5533, 1));
  root.userData.color = 0xff3366;
  return root;
}

/** Ju 87 Stuka-Selene — inverted gull, siren pods. */
export function stuka() {
  const root = new THREE.Group();
  const skin = 0x5a2458;
  root.add(mesh(cylG(0.16, 0.2, 2.2, 8), std(skin), 0, 0.12, 0.05, [Math.PI / 2, 0, 0]));
  root.add(mesh(boxG(0.7, 0.06, 0.4), std(skin), 0.55, -0.05, 0.1, [0, 0, 0.45]));
  root.add(mesh(boxG(0.7, 0.06, 0.4), std(skin), -0.55, -0.05, 0.1, [0, 0, -0.45]));
  root.add(mesh(boxG(0.85, 0.06, 0.42), std(skin), 1.25, 0.18, 0.12, [0, 0, -0.15]));
  root.add(mesh(boxG(0.85, 0.06, 0.42), std(skin), -1.25, 0.18, 0.12, [0, 0, 0.15]));
  root.add(mesh(cylG(0.12, 0.12, 0.4, 8), std(0xff44aa, { emissive: 0x661144, emissiveIntensity: 0.8 }), 0.55, -0.28, 0.15, [Math.PI / 2, 0, 0]));
  root.add(mesh(cylG(0.12, 0.12, 0.4, 8), std(0xff44aa, { emissive: 0x661144, emissiveIntensity: 0.8 }), -0.55, -0.28, 0.15, [Math.PI / 2, 0, 0]));
  root.add(mesh(boxG(0.06, 0.55, 0.32), std(skin), 0, 0.48, -1.15));
  root.add(...engine(0, 0.05, -1.05, 0xff66cc, 0.8));
  root.userData.color = 0xff44aa;
  return root;
}

/** Me 262 Silbergeist — swept twin-nacelle. */
export function silbergeist() {
  const root = new THREE.Group();
  const skin = 0xc5ccd4;
  root.add(mesh(cylG(0.14, 0.18, 2.35, 8), std(skin, { metalness: 0.82, roughness: 0.22 }), 0, 0.08, 0.05, [Math.PI / 2, 0, 0]));
  root.add(mesh(boxG(1.15, 0.06, 0.7), std(skin, { metalness: 0.8 }), 0.85, 0.1, -0.15, [0, 0.5, 0]));
  root.add(mesh(boxG(1.15, 0.06, 0.7), std(skin, { metalness: 0.8 }), -0.85, 0.1, -0.15, [0, -0.5, 0]));
  root.add(mesh(cylG(0.16, 0.18, 0.95, 8), std(0x8e98a4, { metalness: 0.85 }), 0.7, -0.12, 0.05, [Math.PI / 2, 0, 0]));
  root.add(mesh(cylG(0.16, 0.18, 0.95, 8), std(0x8e98a4, { metalness: 0.85 }), -0.7, -0.12, 0.05, [Math.PI / 2, 0, 0]));
  root.add(mesh(boxG(0.05, 0.42, 0.28), std(skin, { metalness: 0.8 }), 0, 0.38, -1.15));
  root.add(...engine(0.7, -0.12, -0.48, 0xb9fff2, 0.85));
  root.add(...engine(-0.7, -0.12, -0.48, 0xb9fff2, 0.85));
  root.userData.color = 0xff3366;
  return root;
}

/** Horten Mondsichel — wide flying wing, red crescent. */
export function mondsichel() {
  const root = new THREE.Group();
  const skin = 0x3a1830;
  root.add(mesh(boxG(6.4, 0.16, 2.4), std(skin, { metalness: 0.58 }), 0, 0.08, -0.2));
  root.add(mesh(boxG(3.4, 0.22, 1.5), std(0x4a2040), 0, 0.16, 0.35));
  root.add(mesh(sphG(0.32, 10), std(0xff88aa, { roughness: 0.18, emissive: 0x661133, emissiveIntensity: 0.7 }), 0, 0.36, 0.7));
  const crescent = mesh(g('torus:crescent', () => new THREE.TorusGeometry(0.55, 0.06, 6, 16, Math.PI * 1.15)), basic(0xff3355), 0, 0.2, 0.15, [0, 0, Math.PI]);
  root.add(crescent);
  root.add(mesh(boxG(0.35, 0.22, 0.7), std(0x1a1016), -2.4, 0.12, -0.85, [0, 0.4, 0.15]));
  root.add(mesh(boxG(0.35, 0.22, 0.7), std(0x1a1016), 2.4, 0.12, -0.85, [0, -0.4, -0.15]));
  root.add(...engine(-1.35, -0.02, -1.15, 0xff4466, 1.1));
  root.add(...engine(1.35, -0.02, -1.15, 0xff4466, 1.1));
  root.userData.color = 0xff44aa;
  return root;
}

/** TBF Moonhog — fat belly escort bomber. */
export function moonhog() {
  const root = new THREE.Group();
  const skin = 0x6a5830;
  root.add(mesh(cylG(0.42, 0.36, 2.4, 10), std(skin, { metalness: 0.45, roughness: 0.55 }), 0, 0.05, 0, [Math.PI / 2, 0, 0]));
  root.add(mesh(sphG(0.38, 10), std(0x3a3220, { roughness: 0.7 }), 0, -0.22, 0.1));
  root.add(mesh(boxG(1.7, 0.08, 0.7), std(skin), 1.15, 0.08, 0.1));
  root.add(mesh(boxG(1.7, 0.08, 0.7), std(skin), -1.15, 0.08, 0.1));
  root.add(mesh(boxG(0.08, 0.55, 0.4), std(0xc9a227, { emissive: 0x5a4010, emissiveIntensity: 0.4 }), 0, 0.48, -1.25));
  root.add(mesh(sphG(0.22, 8), std(0xffe7a8, { roughness: 0.15, emissive: 0x665522 }), 0, 0.38, 0.45));
  root.add(...engine(0, -0.05, -1.2, 0xffcc66, 1));
  root.userData.color = 0xc9a227;
  return root;
}

/** Stabzug flatcar — meteor-iron bed, AA posts. */
export function stabzugCar() {
  const root = new THREE.Group();
  const iron = 0x4a3a48;
  root.add(mesh(boxG(4.2, 0.35, 2.6), std(iron, { metalness: 0.72, roughness: 0.48 }), 0, 0.2, 0));
  root.add(mesh(boxG(3.6, 0.18, 2.1), std(0x6a3058, { emissive: 0x220814, emissiveIntensity: 0.4 }), 0, 0.46, 0));
  root.add(mesh(cylG(0.08, 0.08, 1.3, 6), std(0xd0c8d4, { metalness: 0.8 }), -1.5, 1.1, 0));
  root.add(mesh(cylG(0.08, 0.08, 1.3, 6), std(0xd0c8d4, { metalness: 0.8 }), 1.5, 1.1, 0));
  root.add(mesh(boxG(0.7, 0.08, 0.08), std(0xff6688, { emissive: 0xff2244, emissiveIntensity: 0.6 }), -1.5, 1.7, 0));
  root.add(mesh(boxG(0.7, 0.08, 0.08), std(0xff6688, { emissive: 0xff2244, emissiveIntensity: 0.6 }), 1.5, 1.7, 0));
  root.userData.color = 0xff44aa;
  return root;
}

/** Eisenwurm tail — longer cradle, guns high and low. */
export function eisenwurm() {
  const root = new THREE.Group();
  const iron = 0x3a2438;
  root.add(mesh(boxG(4.8, 0.45, 4.4), std(iron, { metalness: 0.75, roughness: 0.4 }), 0, 0.25, 0));
  root.add(mesh(boxG(2.2, 0.7, 1.6), std(0x5a2848, { emissive: 0x330816, emissiveIntensity: 0.45 }), 0, 0.85, -0.4));
  root.add(mesh(boxG(0.16, 1.5, 0.16), std(0xe8e0ea, { metalness: 0.85 }), 0, 1.7, -1.2));
  root.add(mesh(boxG(1.4, 0.12, 0.12), std(0xff4466, { emissive: 0xff2244, emissiveIntensity: 0.7 }), 0, 2.4, -1.2));
  root.add(mesh(boxG(0.16, 1.4, 0.16), std(0xe8e0ea, { metalness: 0.85 }), 0, 1.5, 1.6));
  root.add(mesh(boxG(1.6, 0.12, 0.12), std(0xff4466, { emissive: 0xff2244, emissiveIntensity: 0.7 }), 0, 2.15, 1.6));
  root.add(mesh(boxG(0.12, 1.5, 0.4), std(iron), -2.3, 0.9, 0));
  root.add(mesh(boxG(0.12, 1.5, 0.4), std(iron), 2.3, 0.9, 0));
  root.add(...engine(0, 0.55, 2.15, 0xff66aa, 1.3));
  root.userData.color = 0xff44aa;
  return root;
}

export const BUILDERS = {
  voidcat,
  starfork,
  nachtschwalbe,
  wuerger,
  stuka,
  silbergeist,
  mondsichel,
  moonhog,
  stabzugCar,
  eisenwurm,
};
