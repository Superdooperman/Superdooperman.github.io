// Room assembly from kit pieces (js/kit/pieces.js). place(): stamp a piece at a tile position,
// or snap it to a placed piece (on top of it, under it, or beside either face). Solid wins: a
// later piece's open tiles never erase earlier stone; wood never overwrites stone. Then every
// anchor is derived from the finished map (js/anchors.js), so a covered top is no ledge.
import { parseLevel } from '../level.js';
import { archAnchors } from '../anchors.js';
import { flipPiece } from './pieces.js';

export function createAssembly(cols, rows) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill('.'));
  const placed = new Map();
  const props = [];
  const marks = [];
  const at = (spec) => {
    if (Array.isArray(spec)) return { c: spec[0], r: spec[1] };
    const b = placed.get(spec.to);
    if (!b) throw new Error(`snap to unknown piece ${spec.to}`);
    return spec;
  };
  const A = {
    cols, rows, grid, placed, props,
    /** piece: from pieces.js. where: [c, r] (top-left) or { to: id, snap: 'on'|'under'|'left'|'right', dx, dy, align }. */
    place(id, piece, where, { flip = false } = {}) {
      const p = flip ? flipPiece(piece) : piece;
      let c, r;
      if (Array.isArray(where)) [c, r] = where;
      else {
        at(where);
        const b = placed.get(where.to);
        const dx = where.dx || 0; const dy = where.dy || 0;
        if (where.snap === 'on') { c = b.c + dx; r = b.r - p.h + dy; }
        else if (where.snap === 'under') { c = b.c + dx; r = b.r + b.h + dy; }
        else if (where.snap === 'left') { c = b.c - p.w + dx; r = (where.align === 'bottom' ? b.r + b.h - p.h : b.r) + dy; }
        else if (where.snap === 'right') { c = b.c + b.w + dx; r = (where.align === 'bottom' ? b.r + b.h - p.h : b.r) + dy; }
        else throw new Error(`unknown snap ${where.snap}`);
      }
      for (let y = 0; y < (p.rows ? p.rows.length : 0); y++) for (let x = 0; x < p.w; x++) {
        const ch = p.rows[y][x];
        const gc = c + x; const gr = r + y;
        if (ch === '.' || gc < 0 || gc >= cols || gr < 0 || gr >= rows) continue;
        const cur = grid[gr][gc];
        if (cur === '#' || cur === 's') continue; // solid wins
        if (ch === 'L' && cur !== '.') continue;
        grid[gr][gc] = ch;
      }
      for (const q of p.props) props.push({ ...q, c: q.c + c, r: q.r + r, piece: id });
      placed.set(id, { id, piece: p.id, c, r, w: p.w, h: p.h, flip });
      return A;
    },
    /** A single marker tile ('P' spawn, 'E' exit, 'L' lamp, items). */
    mark(ch, c, r) { marks.push([ch, c, r]); grid[r][c] = ch; return A; },
    rows() { return grid.map((r) => r.join('')); },
    /** The level def bits: rows + props + anchors 'arch'. */
    def(extra = {}) { return { anchors: 'arch', ...extra, rows: A.rows(), props: props.map((q) => ({ ...q })) }; },
    /** Hang a layer-c attachment at a tile position (mounted on the facade behind). */
    attach(type, c, r, { flip = false, piece = null, deco = false } = {}) { props.push(deco ? { type, c, r, flip, piece, deco } : { type, c, r, flip, piece }); return A; },
    /** Anchors of the finished map (what a room built from this gets). */
    anchors() { return archAnchors(parseLevel({ name: 'kit', rows: A.rows() }), props); },
    layout() { return [...placed.values()]; },
  };
  return A;
}

/** Where a piece's anchors sit when it stands alone (padded by open air on every side, the
 *  wall side kept solid with wallSide). For docs, the art list and tests. */
export function pieceSockets(piece, { wallSide = null } = {}) {
  const pad = 4;
  const A = createAssembly(piece.w + pad * 2, piece.h + pad * 2);
  if (wallSide === 'left') for (let r = 0; r < piece.h + pad * 2; r++) A.grid[r][pad - 1] = '#';
  if (wallSide === 'right') for (let r = 0; r < piece.h + pad * 2; r++) A.grid[r][pad + piece.w] = '#';
  A.place('p', piece, [pad, pad]);
  return A.anchors().map((a) => ({ kind: a.kind, prop: a.prop, x: +(a.x - pad).toFixed(2), y: +(a.y - pad).toFixed(2) }));
}
