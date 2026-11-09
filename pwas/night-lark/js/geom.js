// Small angle helpers shared by sight, targeting and the generator. The expressions are the ones
// the call sites used to write by hand, moved verbatim, so results are bit-identical.

/** An angle wrapped into (-PI, PI], via atan2 of its sine and cosine. */
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** acos of a cosine clamped to [-1, 1] (float error can push a normalised dot product past 1). */
export const acosClamped = (cos) => Math.acos(Math.max(-1, Math.min(1, cos)));
