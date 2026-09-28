/**
 * Ringing frames: building extras, blending two frames, and picking the
 * next style in a shuffle.
 *
 * @module
 */

import { ringingStyles } from "../data.js";
import { lerpNumber, lerpPoint } from "../math.js";
import type { RandomSource } from "../random.js";
import { lerpFace } from "../shape.js";
import type {
  FaceShape,
  RingFx,
  RingFxKind,
  RingingFrame,
  RingingStyleName,
} from "../types.js";

type Writable<T> = { -readonly [K in keyof T]?: T[K] };

/** A ringing extra of `kind`, every other field at its default. */
export function ringFx(kind: RingFxKind, fields: Omit<Writable<RingFx>, "kind"> = {}): RingFx {
  return {
    kind,
    at: [100, 100],
    scale: 1,
    rotation: 0,
    alpha: 1,
    onHead: false,
    inFront: true,
    phase: 0,
    extent: [0, 0],
    ...fields,
  };
}

/** The same extra, `by` times as visible. */
export function fadedFx(fx: RingFx, by: number): RingFx {
  return { ...fx, alpha: fx.alpha * by };
}

/** A ringing frame showing `face`, every other field at its default. */
export function ringingFrame(
  face: FaceShape,
  fields: Omit<Writable<RingingFrame>, "face"> = {},
): RingingFrame {
  return {
    face,
    tilt: 0,
    nudge: [0, 0],
    scale: 1,
    flush: 0,
    flash: 0,
    spin: 0,
    fx: [],
    ...fields,
  };
}

/**
 * Blends frame `a` `t` of the way to frame `b`. The extras do not move
 * between the two: `a`'s fade out while `b`'s fade in.
 */
export function lerpRingingFrame(
  a: RingingFrame,
  b: RingingFrame,
  t: number,
): RingingFrame {
  return {
    face: lerpFace(a.face, b.face, t),
    tilt: lerpNumber(a.tilt, b.tilt, t),
    nudge: lerpPoint(a.nudge, b.nudge, t),
    scale: lerpNumber(a.scale, b.scale, t),
    flush: lerpNumber(a.flush, b.flush, t),
    flash: lerpNumber(a.flash, b.flash, t),
    spin: lerpNumber(a.spin, b.spin, t),
    fx: [
      ...a.fx.map((fx) => fadedFx(fx, 1 - t)),
      ...b.fx.map((fx) => fadedFx(fx, t)),
    ],
  };
}

/**
 * A random style other than `current`, so a shuffle never picks the one
 * already showing. Draws from `random` exactly once.
 */
export function nextRingingStyle(
  current: RingingStyleName,
  random: RandomSource,
): RingingStyleName {
  const index = ringingStyles.indexOf(current);
  const pick = random.nextInt(ringingStyles.length - 1);
  return ringingStyles[pick >= index ? pick + 1 : pick] as RingingStyleName;
}
