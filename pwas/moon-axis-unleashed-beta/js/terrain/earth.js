// Moon Axis Unleashed terrain-3d: Earth with continents, painted into a
// smooth canvas texture for a lit Three.js sphere (not NES dither).
// Continent outlines come from moon-axis-dev terrain-proto earth.js.
import * as THREE from 'three';

const LAND = [
  // North America (with Central America)
  [[-168, 66], [-162, 70], [-140, 70], [-120, 72], [-95, 72], [-80, 68], [-62, 60], [-56, 52], [-66, 45], [-70, 42], [-76, 35], [-81, 30], [-80, 25], [-83, 29], [-90, 30], [-97, 27], [-97, 22], [-92, 18], [-87, 21], [-84, 15], [-78, 8], [-83, 8], [-92, 14], [-105, 20], [-110, 24], [-114, 31], [-117, 33], [-124, 40], [-124, 48], [-133, 55], [-140, 60], [-152, 58], [-165, 55], [-160, 60]],
  // Greenland
  [[-55, 60], [-44, 60], [-20, 70], [-20, 82], [-60, 82], [-70, 77], [-55, 70]],
  // South America
  [[-78, 8], [-60, 10], [-50, 0], [-35, -5], [-39, -15], [-48, -26], [-58, -35], [-65, -42], [-68, -52], [-74, -52], [-73, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 0]],
  // Africa
  [[-17, 15], [-17, 21], [-10, 30], [-6, 36], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [42, -2], [40, -15], [35, -24], [27, -34], [18, -34], [12, -17], [13, -6], [9, 4], [-8, 4], [-14, 10]],
  // Madagascar
  [[44, -25], [47, -25], [50, -15], [48, -13]],
  // Eurasia
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [5, 53], [10, 58], [5, 62], [15, 69], [30, 71], [60, 70], [80, 73], [110, 77], [140, 72], [180, 68], [180, 62], [160, 60], [140, 54], [142, 46], [130, 42], [127, 35], [120, 30], [121, 23], [110, 20], [108, 12], [104, 9], [100, 13], [98, 8], [92, 22], [88, 22], [80, 13], [77, 8], [72, 20], [66, 25], [57, 26], [56, 23], [59, 22], [52, 16], [44, 12], [38, 20], [34, 28], [35, 36], [27, 36], [26, 41], [20, 40], [16, 38], [12, 44], [8, 44], [3, 43], [-1, 37]],
  // Britain
  [[-5, 50], [2, 51], [-2, 58], [-6, 57]],
  // Japan
  [[130, 31], [141, 36], [142, 44], [139, 40], [131, 34]],
  // Australia
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -25], [150, -37], [141, -38], [135, -35], [129, -32], [115, -34]],
];

const DESERT = [
  [-17, 15, 60, 32],    // Sahara + Arabia (lon0, lat0, lon1, lat1)
  [120, -32, 145, -20], // Australian interior
  [-118, 28, -103, 38], // US southwest
  [90, 38, 115, 46],    // Gobi
  [55, 25, 70, 40],     // Iran / Central Asia
];

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}


function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function valueNoise(rand, period) {
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

/** Equirectangular surface + cloud canvases. W x W/2. */
export function paintEarth(W = 256) {
  const H = W / 2;
  const surf = document.createElement('canvas');
  surf.width = W; surf.height = H;
  const clouds = document.createElement('canvas');
  clouds.width = W; clouds.height = H;
  const sc = surf.getContext('2d');
  const cc = clouds.getContext('2d');
  const si = sc.createImageData(W, H);
  const ci = cc.createImageData(W, H);
  const rand = rng(1947);
  const n1 = valueNoise(rand, 16);
  const n2 = valueNoise(rand, 32);
  const n3 = valueNoise(rand, 8);
  for (let r = 0; r < H; r++) {
    const lat = 90 - ((r + 0.5) * 180) / H;
    for (let c = 0; c < W; c++) {
      const lon = -180 + ((c + 0.5) * 360) / W;
      const u = c / W, v = r / H;
      const tex = n2(u * 32, v * 16) - 0.5;
      let col;
      const land = lat >= -66 && LAND.some((p) => inPoly(lon, lat, p));
      if (lat < -66 || (!land && lat > 80)) col = [232, 240, 246];
      else if (land) {
        const desert = DESERT.some(([a, b, cc2, d]) => lon >= a && lon <= cc2 && lat >= b && lat <= d);
        if (lat > 72 || (lon > -73 && lon < -15 && lat > 60)) col = [226, 236, 242];
        else if (desert) col = [176 + tex * 40, 138 + tex * 30, 82 + tex * 20];
        else {
          const dry = Math.abs(lat) > 30 ? 0.35 : 0;
          const k = n1(u * 16, v * 8) * 0.6 + dry;
          col = [62 + k * 70 + tex * 20, 112 + k * 30 + tex * 24, 52 + k * 18];
        }
      } else {
        const deep = 0.75 + tex * 0.5;
        col = [22 * deep, 72 * deep + 6, 140 * deep + 20];
      }
      const i = (r * W + c) * 4;
      si.data[i] = col[0]; si.data[i + 1] = col[1]; si.data[i + 2] = col[2]; si.data[i + 3] = 255;
      // Cloud wisps: banded fBm, thicker in the storm belts.
      const band = 0.55 + 0.45 * Math.cos((lat / 90) * Math.PI * 3);
      let cl = n3(u * 8 + tex, v * 4) * 0.55 + n1(u * 16, v * 8) * 0.3 + n2(u * 32, v * 16) * 0.15;
      cl = (cl - 0.52) * 3.2 * band;
      const a = Math.max(0, Math.min(1, cl));
      ci.data[i] = 250; ci.data[i + 1] = 250; ci.data[i + 2] = 252; ci.data[i + 3] = Math.round(a * 210);
    }
  }
  sc.putImageData(si, 0, 0);
  cc.putImageData(ci, 0, 0);
  return { surf, clouds };
}

/** Lit Earth for the surface sky: surface sphere, cloud shell, thin blue limb. Not fogged. */
export function earthGroup() {
  const { surf, clouds } = paintEarth(256);
  const group = new THREE.Group();
  const map = new THREE.CanvasTexture(surf);
  map.colorSpace = THREE.SRGBColorSpace;
  const cmap = new THREE.CanvasTexture(clouds);
  cmap.colorSpace = THREE.SRGBColorSpace;
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(15, 40, 28),
    new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0.05, emissive: 0x0a1c38, emissiveIntensity: 0.55, fog: false }),
  );
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(15.25, 40, 28),
    new THREE.MeshStandardMaterial({ map: cmap, transparent: true, depthWrite: false, roughness: 0.9, metalness: 0, fog: false }),
  );
  const limb = new THREE.Mesh(
    new THREE.SphereGeometry(16.6, 32, 20),
    new THREE.MeshBasicMaterial({ color: 0x4f9ae0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
  );
  group.add(globe, shell, limb);
  group.userData.globe = globe;
  group.userData.shell = shell;
  return group;
}
