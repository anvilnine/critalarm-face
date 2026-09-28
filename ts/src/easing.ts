/**
 * Easing curves, evaluated the way Flutter's `Cubic` does so blends land on
 * the same numbers as the Dart package.
 *
 * @module
 */

import { spec } from "./data.js";

/** An easing function: 0 maps to 0, 1 maps to 1. */
export type Easing = (t: number) => number;

/**
 * A cubic Bezier easing from (0, 0) to (1, 1) with control points (a, b)
 * and (c, d), the same as CSS `cubic-bezier(a, b, c, d)`. It uses Flutter's
 * bisection with an error bound of 0.001 rather than an exact solve.
 */
export function cubicBezier(a: number, b: number, c: number, d: number): Easing {
  const at = (p: number, q: number, m: number) =>
    3 * p * (1 - m) * (1 - m) * m + 3 * q * (1 - m) * m * m + m * m * m;
  return (t: number) => {
    if (t === 0 || t === 1) return t;
    let lo = 0;
    let hi = 1;
    for (;;) {
      const m = (lo + hi) / 2;
      const x = at(a, c, m);
      if (Math.abs(t - x) < 0.001) return at(b, d, m);
      if (x < t) lo = m;
      else hi = m;
    }
  };
}

const curves = spec.motion.easing;

/**
 * Eases in and out, `cubic-bezier(0.42, 0, 0.58, 1)`. The live face
 * animations and the ringing shuffle use it.
 */
export const easeInOut: Easing = cubicBezier(...curves.easeInOut.cubicBezier);

/**
 * A softer ease in and out, `cubic-bezier(0.645, 0.045, 0.355, 1)`. The idle
 * face blends use it.
 */
export const easeInOutCubic: Easing = cubicBezier(
  ...curves.easeInOutCubic.cubicBezier,
);

/**
 * How far the watching face's pupils have drifted at point `t` (0 to 1) of
 * its look-around loop, in box units: 0 until 0.4, easing to -18 by 0.5,
 * held, and easing back from 0.9 to 1.
 */
export function watchingLookDx(t: number): number {
  if (t < 0.4) return 0;
  if (t < 0.5) return -18 * easeInOut((t - 0.4) / 0.1);
  if (t < 0.9) return -18;
  return -18 * (1 - easeInOut((t - 0.9) / 0.1));
}
