// LAYER C: attachments (Azzato's tower kit sheet, Oct 28 2026). Hook points and decoration
// mounted on the facade behind the play plane (or on a platform). Never solid: collision is
// only ever the platform layer's tiles. Each type: art box w x h in tiles (16 px), grip = the
// hook point in tiles from the box's top-left, protrudes = it sticks out from its mount, so it
// keeps its grip when another piece is stacked against that face. A placed prop with deco:true
// is art only (a railing's middle spans): no anchor.
//   mount: 'wall' (on the facade), 'under' (hangs from the slab or bracket above), 'top'
//   (stands on a platform's top).
const T = (w, h, grip, protrudes, mount, note) => Object.freeze({ w, h, grip: grip && Object.freeze(grip), protrudes, mount, note });
const DECO = (w, h, mount, note) => Object.freeze({ w, h, grip: null, protrudes: false, mount, note, deco: true });
// Sizes and grips match Brook's kit-harbor-props.json (module px / 16; test/tower-kit.test.mjs
// checks every one to 1 px). Grips sit at the tip/top ring: what she would hook.
// Names and groups follow Azzato's moonlit tower kit sheet (art-ref/tower-kit-moonlit-ref-
// azzato-2026-10-28.png): C railings, D grapple attachments, E decorative extras; plus the
// platform underside art (bracket, support) from group B, which never collides.
export const PROP_TYPES = Object.freeze({
  // D. grapple attachments (layer 3)
  'flagpole-tall': T(1, 4, [8 / 16, 2 / 16], true, 'wall', 'upright pole with a narrow pennant (small torn PX1 or poster); grip at the finial'),
  'flagpole-short': T(3, 2, [45 / 16, 3 / 16], true, 'wall', 'short pole out from the wall, small banner; grip at the tip'),
  'hanging-lantern': T(1, 2, [8 / 16, 2 / 16], true, 'under', 'hanging lantern = danger light (lights her); grip at the top ring'),
  cage: T(1, 2, [8 / 16, 2 / 16], true, 'under', 'hanging iron cage; grip at its top ring'),
  'beam-rope': T(3, 3, [40 / 16, 6 / 16], true, 'wall', 'wood beam out from the wall with a rope; grip at the beam tip'),
  'chain-ring': T(1, 3, [8 / 16, 42 / 16], true, 'under', 'chain down from a staple, ring at the bottom; grip at the ring'),
  'grapple-hook': T(1, 2, [8 / 16, 2 / 16], true, 'under', 'big iron grapple hook on a short chain; grip at the top ring'),
  'banner-bracket': T(2, 2, [29 / 16, 4 / 16], true, 'wall', 'bracket arm with a short banner; grip at the arm tip'),
  'small-hook': T(1, 1, [8 / 16, 8 / 16], true, 'wall', 'small iron hook in the wall'),
  // C. railings (end posts are grips; middle spans are placed deco:true)
  'railing-a': T(1, 1, [8 / 16, 3 / 16], true, 'top', 'railing A, plain; repeat cell'),
  'railing-b': T(1, 1, [8 / 16, 3 / 16], true, 'top', 'railing B, ornate; repeat cell'),
  // extras from Azzato's first ask ("statues or railings to grapple to"), not on the moonlit sheet
  statue: T(1, 2, [12 / 16, 2 / 16], false, 'top', 'statue on a platform; raised arm is a grip (flush: a stacked piece buries it)'),
  gargoyle: T(2, 1, [27 / 16, 7 / 16], true, 'wall', 'gargoyle snout jutting out'),
  // a balcony's end post: grip only (the post and railing are painted in the balcony art, Brook's
  // kit-harbor-platforms.json: posts at (1,3) and (W-2,3) px). Placed by pieces.js with w = the
  // balcony width, so propGrip mirrors it exactly onto the other end.
  'balcony-post': T(1, 1, [1 / 16, 3 / 16], true, 'top', 'balcony end post (art in the balcony piece)'),
  // B. platform underside art (no collision, no grip)
  bracket: DECO(1, 1, 'under', 'stone/iron bracket (corbel) under a slab end'),
  support: DECO(1, 2, 'under', 'timber support strut under a slab'),
  // E. decorative extras (no grip)
  'banner-deco': DECO(1, 3, 'wall', 'hanging banner: Company (GD2 field, PX3 crest) or, now and then, a small torn PX1 one'),
  'cloth-drape': DECO(3, 2, 'wall', 'cloth drape strung between pegs'),
  vines: DECO(2, 2, 'wall', 'vines / plants hanging over a ledge'),
  'pots-crates': DECO(2, 1, 'top', 'pots and crates on a platform'),
  'bird-perch': DECO(1, 1, 'top', 'a bird on a perch'),
  'misc-details': DECO(2, 1, 'top', 'barrels, sacks, misc'),
});
export const ATTACHMENTS = Object.freeze(Object.keys(PROP_TYPES).filter((k) => !PROP_TYPES[k].deco));
export const DECOR = Object.freeze(['banner-deco', 'cloth-drape', 'vines', 'pots-crates', 'bird-perch', 'misc-details']);
/** The ones the route generator may hang in a gap as the next hook. */
export const HOOK_ATTACHMENTS = Object.freeze(['flagpole-short', 'hanging-lantern', 'cage', 'beam-rope', 'chain-ring', 'grapple-hook', 'banner-bracket', 'small-hook', 'gargoyle']);

/** Brook's kit JSON aliases (his ids -> ours). */
export const KIT_ALIASES = Object.freeze({ lantern: 'hanging-lantern', hook: 'small-hook', 'corner-balcony-left': 'corner-left', 'corner-balcony-right': 'corner-right' });

/** A placed prop's box width: its own w (a balcony post spans its balcony) or the type's. */
export const propW = (p) => p.w ?? PROP_TYPES[p.type].w;

/** Mirror a prop box left-right inside a piece of width pw (tiles). */
export function flipProp(p, pw) {
  return { ...p, c: pw - p.c - propW(p), flip: !p.flip };
}

/** Absolute grip point (tiles) of a placed prop { type, c, r, flip }. */
export function propGrip(p) {
  const t = PROP_TYPES[p.type];
  if (!t) throw new Error(`unknown prop ${p.type}`);
  if (!t.grip) return null; // decoration
  // grips are pixel indices (module px / 16): pixel i mirrors to pixel W-1-i
  const gx = p.flip ? propW(p) - t.grip[0] - 1 / 16 : t.grip[0];
  return { x: p.c + gx, y: p.r + t.grip[1] };
}
