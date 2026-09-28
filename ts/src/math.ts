/**
 * Number, point and colour maths, following Flutter exactly so a port draws
 * what the Dart package draws. See "Colour maths" and "Numbers and lerp" in
 * `spec/SPEC.md`.
 *
 * @module
 */

import type { Color, Point } from "./types.js";

/** A full turn in radians. */
export const TAU = 2 * Math.PI;

/** `v` held between `lo` and `hi`. */
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** `a` when the two match, else `t` of the way from `a` to `b`. */
export function lerpNumber(a: number, b: number, t: number): number {
  return a === b ? a : a * (1 - t) + b * t;
}

/** `t` of the way from `a` to `b`, each coordinate on its own. */
export function lerpPoint(a: Point, b: Point, t: number): Point {
  return [a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t];
}

/** Every point in `a` moved toward the matching point in `b`. */
export function lerpPoints(
  a: readonly Point[],
  b: readonly Point[],
  t: number,
): Point[] {
  return a.map((p, i) => lerpPoint(p, b[i] as Point, t));
}

/** `a + b`. */
export function add(a: Point, b: Point): Point {
  return [a[0] + b[0], a[1] + b[1]];
}

/** `a - b`. */
export function sub(a: Point, b: Point): Point {
  return [a[0] - b[0], a[1] - b[1]];
}

/** `p * k`. */
export function mul(p: Point, k: number): Point {
  return [p[0] * k, p[1] * k];
}

/** How far `p` is from the origin. */
export function length(p: Point): number {
  return Math.hypot(p[0], p[1]);
}

/** `x` minus its floor, so always 0 up to 1. */
export function frac(x: number): number {
  return x - Math.floor(x);
}

/**
 * `a` modulo `b` with the answer never negative, the way Dart's `%` works.
 */
export function mod(a: number, b: number): number {
  const r = a % b;
  return r < 0 ? r + Math.abs(b) : r;
}

// ---------------------------------------------------------------------------
// Colours.
// ---------------------------------------------------------------------------

/** Each channel lerped, then held to 0..1. */
export function lerpColor(a: Color, b: Color, t: number): Color {
  return [
    clamp(a[0] * (1 - t) + b[0] * t, 0, 1),
    clamp(a[1] * (1 - t) + b[1] * t, 0, 1),
    clamp(a[2] * (1 - t) + b[2] * t, 0, 1),
    clamp(a[3] * (1 - t) + b[3] * t, 0, 1),
  ];
}

/**
 * The colour lerp that allows a missing side: both null stays null, and one
 * null fades the other in or out.
 */
export function lerpNullableColor(
  a: Color | null,
  b: Color | null,
  t: number,
): Color | null {
  if (b === null) return a === null ? null : scaleAlpha(a, 1 - t);
  if (a === null) return scaleAlpha(b, t);
  return lerpColor(a, b, t);
}

function scaleAlpha(c: Color, k: number): Color {
  return [c[0], c[1], c[2], clamp(c[3] * k, 0, 1)];
}

/** The same colour with its alpha multiplied by `k`. */
export function withAlpha(c: Color, k: number): Color {
  return [c[0], c[1], c[2], c[3] * k];
}

/** Relative luminance, 0 for black to 1 for white. */
export function luminance(c: Color): number {
  const lin = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
}

/**
 * Parses `#rgb`, `#rrggbb` or `#rrggbbaa` into a colour. Handy for building
 * your own palette.
 */
export function hexColor(hex: string): Color {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  if (h.length === 6) h += "ff";
  if (!/^[0-9a-fA-F]{8}$/.test(h)) {
    throw new RangeError(`Not a hex colour: ${hex}`);
  }
  const at = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
  return [at(0), at(2), at(4), at(6)];
}

/** A colour as `#rrggbb`, ignoring alpha. */
export function toHex(c: Color): string {
  const ch = (v: number) =>
    Math.round(clamp(v, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(c[0])}${ch(c[1])}${ch(c[2])}`;
}

/** A colour as a CSS `rgba()` string. */
export function toCss(c: Color): string {
  const ch = (v: number) => Math.round(clamp(v, 0, 1) * 255);
  const a = Math.round(clamp(c[3], 0, 1) * 10000) / 10000;
  return `rgba(${ch(c[0])},${ch(c[1])},${ch(c[2])},${a})`;
}
