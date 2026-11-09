// Level-scale moon mast: the final climb of a level. Stack from moon-mast.json `stack`
// (gaps-b3c README). Crown light uses the JSON light block (r 540); the halo sprite is
// not drawn with it. Collision is the girder ledges (one-way wood) and the crown decks;
// lattice legs are scenery. Grapple anchors from each mast tile's climb.grappleAnchors.
import { blankRows, fillRect, putTile } from '../level.js';

/** Default stack (moon-mast.json suggestedDefault), shortened to fit a climbable room:
 *  collar, mast x4 (2nd = junction), landing, mast x4, landing, mast x4, top landing, crown.
 *  Units: tiles. Mast tile is 8x4 (128x64). TX = left of the 8-tile mast canvas. */
export const MAST = Object.freeze({
  tileW: 8, tileH: 4, landingW: 10, landingH: 4, crownW: 16, crownH: 8,
  collarH: 4, cols: 30, tx: 11,
  mastsPerRun: 4, runs: 3,
  lightRadius: 540, // px; use this OR moon-crown-halo, not both
});

export function moonMast() {
  const M = MAST;
  const climbTiles = M.collarH + M.runs * (M.mastsPerRun * M.tileH + M.landingH) + M.crownH;
  const rowsN = climbTiles + 8; // floor well + headroom
  const cols = M.cols;
  const t = blankRows(cols, rowsN);
  // floor well
  fillRect(t, rowsN - 3, rowsN - 1, 0, cols - 1, '#');
  // side walls (the guard-tower shell, scenery-as-stone so she cannot walk off)
  fillRect(t, 0, rowsN - 4, 0, 1, '#');
  fillRect(t, 0, rowsN - 4, cols - 2, cols - 1, '#');
  const TX = M.tx;
  let r = rowsN - 3 - M.collarH; // collar sits on the floor well
  const pieces = [];
  const props = [];
  const rings = []; // extra anchors in tiles; parseLevel also reads 'a'
  const pushAnchors = (tileR, tileC, locals) => {
    for (const [px, py] of locals) {
      const c = tileC + px / 16;
      const rr = tileR + py / 16;
      const cc = Math.max(0, Math.min(cols - 1, Math.floor(c)));
      const rrr = Math.max(0, Math.min(rowsN - 1, Math.floor(rr)));
      if (t[rrr][cc] === '.') putTile(t, rrr, cc, 'a');
    }
  };
  const girderAnchors = [[3, 59], [124, 59], [35, 27], [91, 27]];
  const placeMast = (row, frame) => {
    pieces.push({ piece: 'moon-mast', frame, c: TX, r: row, w: M.tileW, h: M.tileH });
    // girder ledge: one-way wood on row of the girder (tile y 56 of 64 => row+3)
    const ledge = row + 3;
    fillRect(t, ledge, ledge, TX, TX + M.tileW - 1, '=');
    pushAnchors(row, TX, girderAnchors);
  };
  const placeLanding = (row, frame) => {
    const lc = TX - 1; // x = TX - 16 px
    pieces.push({ piece: 'moon-mast-landing', frame, c: lc, r: row, w: M.landingW, h: M.landingH });
    fillRect(t, row + 3, row + 3, lc, lc + M.landingW - 1, '=');
    pushAnchors(row, lc, [[16, 56], [144, 56]]);
  };

  pieces.push({ piece: 'moon-mast-collar', frame: 0, c: TX, r, w: M.tileW, h: M.collarH });
  fillRect(t, r + 3, r + 3, TX, TX + M.tileW - 1, '=');
  r -= M.tileH;
  for (let run = 0; run < M.runs; run++) {
    for (let i = 0; i < M.mastsPerRun; i++) {
      const frame = (run === 0 && i === 1) ? 2 : (i === 0 ? 1 : 0); // 2nd of first run = junction
      placeMast(r, frame);
      r -= M.tileH;
    }
    placeLanding(r, run === M.runs - 1 ? 0 : 1);
    if (run < M.runs - 1) r -= M.tileH;
  }
  // crown on the top landing: bottom row = landing deck
  const crownC = TX - 4; // x = TX - 64 px
  const crownR = Math.max(0, r - M.crownH + 4);
  pieces.push({ piece: 'moon-crown', frame: 3, c: crownC, r: crownR, w: M.crownW, h: M.crownH, relit: true });
  fillRect(t, crownR + 2, crownR + 2, crownC + 2, crownC + M.crownW - 3, '='); // spreader
  fillRect(t, crownR + 5, crownR + 5, crownC + 1, crownC + M.crownW - 2, '='); // deck
  putTile(t, crownR + 4, crownC + 8, 'E');
  putTile(t, rowsN - 4, 5, 'P');
  // battlement at collar
  pieces.push({ piece: 'moon-guard-battlement', frame: 0, c: TX - 1, r: rowsN - 3 - M.collarH - 2, w: 9, h: 2 });

  return {
    name: 'MOON MAST',
    rows: t,
    guards: [],
    searchlights: [],
    autoExit: true,
    prompts: [],
    checkpoints: [{ x: 5.5, y: rowsN - 4 }],
    pieces,
    props,
    facade: [],
    anchors: 'mixed',
    moonMast: {
      tx: TX, lightRadius: M.lightRadius, useHalo: false, // light block, not the halo
      relit: true, stack: 'suggestedDefault',
    },
  };
}
