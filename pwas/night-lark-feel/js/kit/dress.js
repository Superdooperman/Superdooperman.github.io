// Dress a generated tile room with the harbor kit: facade blocks behind stone, railings
// and statues as extra grapple points on uncovered ledges, hanging lanterns at L tiles.
// Does not rewrite collision tiles (the validator path stays). Anchors become 'mixed' so
// uncovered ledges are grappleable (ARCH).
import { createRng, hashSeed } from '../gen/rng.js';
import { TOWER, dressFacade } from './facade.js';

const RAIL = ['railing-a', 'railing-b'];
const DECO = ['statue', 'flagpole-short', 'banner-deco', 'gargoyle', 'small-hook'];

/** True if the tile at (c,r) is a solid with open air above (an uncovered ledge). */
function ledgeTop(rows, c, r) {
  const ch = rows[r]?.[c];
  if (!(ch === '#' || ch === 's' || ch === '=' || ch === '~')) return false;
  if (r === 0) return true;
  const up = rows[r - 1]?.[c];
  return !up || up === '.' || up === 'a' || up === 'm' || up === 'L' || up === 'E' || up === 'P';
}

export function dressGenerated(def, seed = 1, { keepAnchors = false } = {}) {
  if (!def || def.facade) return def;
  const rows = def.rows;
  const cols = rows[0].length;
  const nR = rows.length;
  const rng = createRng(hashSeed(seed, def.gen?.floor || 0, def.gen?.index || 0, 'dress'));
  // facade: cover the room in TOWER-sized blocks, art only
  const bc = Math.ceil(cols / TOWER.blockW);
  const br = Math.ceil(nR / TOWER.blockH);
  const blocks = [];
  for (let r = 0; r < br; r++) for (let c = 0; c < bc; c++) {
    const type = (c === 0 || c === bc - 1) ? 'corner' : rng.chance(0.7) ? 'plain-wall' : rng.pick(['window-narrow', 'window-large', 'broken-wall', 'banner-wall', 'recessed-wall']);
    blocks.push({ type, bc: c, br: r, c: c * TOWER.blockW, r: r * TOWER.blockH, w: TOWER.blockW, h: TOWER.blockH });
  }
  def.facade = dressFacade(blocks, hashSeed(seed, 'facade'));
  def.pieces = def.pieces || [];
  def.props = def.props ? def.props.slice() : [];
  // railings along uncovered stone ledges; statues / hooks as extra grips
  for (let r = 0; r < nR; r++) for (let c = 0; c < cols; c++) {
    if (!ledgeTop(rows, c, r)) continue;
    if (c > 1 && c < cols - 2 && rng.chance(0.45)) def.props.push({ type: rng.pick(RAIL), c, r: r - 1, deco: rng.chance(0.4) });
    if (rng.chance(0.12) && r >= 2) def.props.push({ type: rng.pick(DECO), c, r: r - 2, flip: c > cols / 2 });
  }
  if (!keepAnchors) def.anchors = def.anchors || 'mixed';
  return def;
}

/** Place a few mini-towers on uncovered ledges of a room (seeded). */
export function placeMiniTowers(def, rng, n = 1) {
  const rows = def.rows;
  const cols = rows[0].length;
  const spots = [];
  for (let r = 4; r < rows.length - 2; r++) for (let c = 3; c < cols - 4; c++) {
    if (ledgeTop(rows, c, r) && ledgeTop(rows, c + 1, r) && rows[r - 1][c] === '.') spots.push({ c, r });
  }
  const shuffled = rng.shuffle(spots);
  def.miniTowers = def.miniTowers || [];
  for (let i = 0; i < n && shuffled.length; i++) {
    const s = shuffled.pop();
    def.miniTowers.push({ id: `mt-${def.gen?.floor || 0}-${def.gen?.index || 0}-${i}`, c: s.c, r: s.r, stack: rng.chance(0.5) ? 'tall' : 'low', relit: false });
  }
  return def;
}
