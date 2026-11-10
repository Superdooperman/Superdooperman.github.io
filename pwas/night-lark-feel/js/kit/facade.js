// LAYER A: the facade (Superdooperman's tower kit sheet, Oct 28 2026). Seamless wall blocks on a fixed
// tower grid, art only: they never collide and never give a grapple point (collision is layer
// b, grips are layer b ledges + layer c attachments). Every block's top and bottom edge is the
// same masonry course, so any block stacks on any other with no visible seam; the climbing
// route (layers b and c) is randomized over the column independently of the blocks behind it.
import { createRng } from '../gen/rng.js';

export const TOWER = Object.freeze({ blockW: 4, blockH: 6, cols: 7, rows: 8 }); // 28 x 48 tiles

export const FACADE_BLOCKS = Object.freeze({
  'plain-wall': { weight: 6, note: 'plain ashlar' },
  'window-narrow': { weight: 2, note: 'window A, narrow lancet' },
  'window-large': { weight: 1, note: 'window B, large pointed arch' },
  archway: { weight: 1, note: 'dark arched doorway (lit inside)' },
  'broken-wall': { weight: 1, note: 'cracked, missing stones' },
  'banner-wall': { weight: 1, note: 'hanging banner painted on the wall' },
  'recessed-wall': { weight: 1, note: 'recessed panel with bars' },
  'vertical-beam': { weight: 1, note: 'timber post set into the wall (variation)' },
  drainpipe: { weight: 1, note: 'iron drainpipe down the wall' },
  corner: { weight: 0, note: 'tower corner quoins; only in the outer columns (mirrored on the right)' },
});
export const FACADE_IDS = Object.freeze(Object.keys(FACADE_BLOCKS));

/** Fill the tower grid with blocks: weighted random, no non-plain block directly over the same
 *  kind, at most one archway per block row. rng: createRng(). */
export function facadeColumn(rng, { cols = TOWER.cols, rows = TOWER.rows } = {}) {
  const total = FACADE_IDS.reduce((s, k) => s + FACADE_BLOCKS[k].weight, 0);
  const roll = () => { let x = rng.next() * total; for (const k of FACADE_IDS) { x -= FACADE_BLOCKS[k].weight; if (x < 0) return k; } return 'plain-wall'; };
  const grid = [];
  for (let br = 0; br < rows; br++) {
    const line = [];
    for (let bc = 0; bc < cols; bc++) {
      if (bc === 0 || bc === cols - 1) { line.push('corner'); continue; } // the tower's corners
      let t = roll();
      for (let k = 0; k < 4 && t !== 'plain-wall' && ((grid[br - 1] && grid[br - 1][bc] === t) || (t === 'archway' && line.includes('archway'))); k++) t = roll();
      if (t !== 'plain-wall' && grid[br - 1] && grid[br - 1][bc] === t) t = 'plain-wall';
      line.push(t);
    }
    grid.push(line);
  }
  return grid.flatMap((line, br) => line.map((type, bc) => ({ type, bc, br, c: bc * TOWER.blockW, r: br * TOWER.blockH, w: TOWER.blockW, h: TOWER.blockH })));
}

/** Art dressing on a filled column (its own seeded stream, so it never moves the route):
 *  plain-wall blocks get one of Brook's three plain variants (b.art), and every screen-high band
 *  (LIT.bandRows block rows = 288 px, the 270 px view) gets 1-2 lit windows (b.lit: drawn from the
 *  `-lit` cell, codeId = the base window). A band with too few windows turns plain blocks into
 *  narrow windows first. Same seed, same lights. */
export const LIT = Object.freeze({ bandRows: 3, min: 1, max: 2 });
export const PLAIN_VARIANTS = Object.freeze(['plain-wall', 'plain-wall-v2', 'plain-wall-v3']);
export function dressFacade(blocks, seed) {
  const rng = createRng(seed);
  for (const b of blocks) if (b.type === 'plain-wall') b.art = rng.pick(PLAIN_VARIANTS);
  const bands = Math.max(...blocks.map((b) => b.br)) + 1;
  for (let k = 0; k * LIT.bandRows < bands; k++) {
    const inBand = blocks.filter((b) => Math.floor(b.br / LIT.bandRows) === k);
    const n = rng.int(LIT.min, LIT.max);
    const isWin = (b) => b.type === 'window-narrow' || b.type === 'window-large';
    let wins = inBand.filter(isWin);
    const plain = inBand.filter((b) => b.type === 'plain-wall');
    while (wins.length < n && plain.length) {
      const b = plain.splice(rng.int(0, plain.length - 1), 1)[0];
      b.type = 'window-narrow'; delete b.art; wins = inBand.filter(isWin);
    }
    const pool = [...wins];
    for (let i = 0; i < n && pool.length; i++) pool.splice(rng.int(0, pool.length - 1), 1)[0].lit = true;
  }
  return blocks;
}
