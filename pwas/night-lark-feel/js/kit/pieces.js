// LAYER B: platforms and collision (Superdooperman's tower kit sheet, Oct 28 2026). The only layer
// that makes tiles: '#' stone (solid; its exposed top is a ledge), '=' wood (one-way), '.'
// nothing. A piece: { id, layer:'b', w, h, rows, props (layer-c railings it carries), note }.
// Footprint w x h in tiles (16 px). Pieces carry no anchors of their own: anchors come from
// the ASSEMBLED map (js/anchors.js), so a piece stacked on another cancels what it covers.
// The facade (layer a, js/kit/facade.js) is art only and never collides.
import { flipProp } from './props.js';

const row = (n, ch) => ch.repeat(n);
const slab = (id, w, note) => ({ id, layer: 'b', w, h: 1, rows: [row(w, '#')], props: [], note });

// B. platforms, 3 widths (Brook's kit-harbor-platforms.json: short 3, medium 5, long 8) + 1-tile end caps
export const platformShort = () => slab('platform-short', 3, 'stone slab, short (3)');
export const platformMedium = () => slab('platform-medium', 5, 'stone slab, medium (5)');
export const platformLong = () => slab('platform-long', 8, 'stone slab, long (8)');
export const endLeft = () => slab('end-left', 1, 'slab end cap, left (joins a run; collides like any slab tile)');
export const endRight = () => slab('end-right', 1, 'slab end cap, right');
export const openLedge = () => slab('open-ledge', 2, 'bare stub of stone, no railing');

/** A balcony: a stone slab with a railing row above (not solid; she walks through it). The
 *  railing is painted in the balcony art (no railing props); its end posts are the grips, at
 *  (1,3) and (W-2,3) px of the piece (Brook's kit JSON): a 'balcony-post' spanning the piece,
 *  mirrored for the right end. style 'a' plain, 'b' ornate (placeholder look only). */
function balconyOf(id, w, style, note, ends = ['L', 'R']) {
  const post = { type: 'balcony-post', c: 0, r: 0, w };
  const props = [];
  if (ends.includes('L')) props.push(post);
  if (ends.includes('R')) props.push(flipProp(post, w));
  return { id, layer: 'b', w, h: 2, rows: [row(w, '.'), row(w, '#')], props, style, note };
}
export const balconySmall = () => balconyOf('balcony-small', 3, 'a', 'small balcony, plain railing');
export const balconyMedium = () => balconyOf('balcony-medium', 5, 'a', 'medium balcony, plain railing');
export const balconyLarge = () => balconyOf('balcony-large', 8, 'b', 'large balcony, ornate railing');
/** Corner balconies wrap the tower's corner: the outer end is open (a grip post), the inner end
 *  meets the wall. 'left' sits on the tower's left side (open to the left). */
export const cornerLeft = () => balconyOf('corner-left', 4, 'b', 'corner balcony, open to the left', ['L']);
export const cornerRight = () => balconyOf('corner-right', 4, 'b', 'corner balcony, open to the right', ['R']);

/** A floor slab of any size (the room floor, a pier). */
export function wallSegment(w = 2, h = 4) {
  return { id: 'wall-segment', layer: 'b', w, h, rows: Array.from({ length: h }, () => row(w, '#')), props: [], note: 'solid masonry (floor, pier)' };
}

/** A single attachment as a piece with no tiles (layer c on its own). */
export function attachment(type, { flip = false } = {}) {
  return { id: type, layer: 'c', w: 0, h: 0, rows: [], props: [{ type, c: 0, r: 0, flip }], note: 'layer-c attachment' };
}

export const PIECES = Object.freeze({
  'platform-short': platformShort, 'platform-medium': platformMedium, 'platform-long': platformLong,
  'balcony-small': balconySmall, 'balcony-medium': balconyMedium, 'balcony-large': balconyLarge,
  'corner-left': cornerLeft, 'corner-right': cornerRight, 'open-ledge': openLedge,
  'end-left': endLeft, 'end-right': endRight,
});

/** Mirror a piece left-right (props move and flip with it). */
export function flipPiece(p) {
  return { ...p, rows: p.rows.map((r) => [...r].reverse().join('')), props: p.props.map((q) => flipProp(q, p.w)), flipped: !p.flipped };
}
