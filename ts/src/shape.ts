/**
 * Building faces and blending one into another. See "A face" and "Blending
 * two faces" in `spec/SPEC.md`.
 *
 * @module
 */

import {
  clamp,
  lerpNullableColor,
  lerpNumber,
  lerpPoint,
  lerpPoints,
} from "./math.js";
import type {
  BrowShape,
  EyeShape,
  FaceShape,
  HeadShape,
  MouthShape,
  Point,
  PropShape,
} from "./types.js";

// ---------------------------------------------------------------------------
// Building parts with defaults.
// ---------------------------------------------------------------------------

type Writable<T> = { -readonly [K in keyof T]?: T[K] };

/** An eye at `centre`, with every other field at its default. */
export function eyeShape(
  centre: Point,
  fields: Omit<Writable<EyeShape>, "centre"> = {},
): EyeShape {
  return {
    centre,
    ballRadius: 0,
    ballSquash: 1,
    ballWidth: 7,
    ballIsHead: false,
    pupilRadius: 11,
    pupilOffset: [0, 0],
    shineRadius: 0,
    shineOffset: [0, 0],
    spiral: 0,
    lid: 0,
    lidPoints: [
      [0, 0],
      [0, 0],
      [0, 0],
    ],
    lidWidth: 10,
    ...fields,
  };
}

/** A brow through three `points`. */
export function browShape(
  points: readonly Point[],
  fields: Omit<Writable<BrowShape>, "points"> = {},
): BrowShape {
  return { points, width: 10, alpha: 1, ...fields };
}

/** A mouth through 13 `points`. */
export function mouthShape(
  points: readonly Point[],
  fields: Omit<Writable<MouthShape>, "points"> = {},
): MouthShape {
  return {
    points,
    width: 10,
    fill: 0,
    fillColor: null,
    fillsWithInk: false,
    ...fields,
  };
}

/** A head, normal size with a 10 unit outline unless told otherwise. */
export function headShape(fields: Writable<HeadShape> = {}): HeadShape {
  return { squashX: 1, squashY: 1, strokeWidth: 10, ...fields };
}

/** The invisible brow a face without one rests with, on the left. */
export const restingLeftBrow: BrowShape = browShape(
  [
    [56, 70],
    [71, 70],
    [86, 70],
  ],
  { alpha: 0 },
);

/** The same, on the right. */
export const restingRightBrow: BrowShape = browShape(
  [
    [114, 70],
    [129, 70],
    [144, 70],
  ],
  { alpha: 0 },
);

/** A face from its parts. Brows, head and the rest default to resting. */
export function faceShape(
  fields: Pick<FaceShape, "leftEye" | "rightEye" | "mouth"> &
    Writable<FaceShape>,
): FaceShape {
  return {
    leftBrow: restingLeftBrow,
    rightBrow: restingRightBrow,
    head: headShape(),
    props: [],
    tilt: 0,
    nudge: [0, 0],
    ...fields,
  };
}

// ---------------------------------------------------------------------------
// Mouths.
// ---------------------------------------------------------------------------

/**
 * A mouth from a lower and an upper lip, both traced left (t = 0) to right
 * (t = 1). Always 13 points.
 */
export function lipsMouth(
  lower: (t: number) => Point,
  upper: (t: number) => Point,
): Point[] {
  const out: Point[] = [lower(0)];
  for (let i = 1; i <= 5; i++) out.push(lower(i / 6));
  out.push(lower(1));
  for (let i = 5; i >= 1; i--) out.push(upper(i / 6));
  out.push(upper(0));
  return out;
}

/** A closed mouth along one curve. */
export function sampleMouth(at: (t: number) => Point): Point[] {
  return lipsMouth(at, at);
}

/** A closed mouth along a straight line. */
export function lineMouth(a: Point, b: Point): Point[] {
  return sampleMouth((t) => lerpPoint(a, b, t));
}

/** A point `t` of the way along the curve from `p0` through `p1` to `p2`. */
export function quadAt(p0: Point, p1: Point, p2: Point, t: number): Point {
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return [p0[0] * a + p1[0] * b + p2[0] * c, p0[1] * a + p1[1] * b + p2[1] * c];
}

/** A closed mouth that bends from `a` through `control` to `b`. */
export function curveMouth(a: Point, control: Point, b: Point): Point[] {
  return sampleMouth((t) => quadAt(a, control, b, t));
}

/** An open oval mouth `rx` by `ry` around `centre`. */
export function ovalMouth(centre: Point, rx: number, ry: number): Point[] {
  const on = (angle: number): Point => [
    centre[0] + rx * Math.cos(angle),
    centre[1] + ry * Math.sin(angle),
  ];
  return lipsMouth(
    (t) => on(Math.PI - Math.PI * t),
    (t) => on(Math.PI + Math.PI * t),
  );
}

/** An open wedge: flat upper lip, lower lip dropping to `tip`. */
export function wedgeMouth(left: Point, tip: Point, right: Point): Point[] {
  return lipsMouth(
    (t) =>
      t <= 0.5 ? lerpPoint(left, tip, t * 2) : lerpPoint(tip, right, (t - 0.5) * 2),
    (t) => lerpPoint(left, right, t),
  );
}

/** A shut lid arching gently over an eye centred on `centre`. */
export function restingLid(centre: Point): Point[] {
  return [
    [centre[0] - 13, centre[1]],
    [centre[0], centre[1] - 4],
    [centre[0] + 13, centre[1]],
  ];
}

// ---------------------------------------------------------------------------
// Worked-out eye values.
// ---------------------------------------------------------------------------

/** How far out the white goes: the ball, or the pupil's edge on a dot eye. */
export function eyeBall(eye: EyeShape): number {
  return eye.ballRadius > 0 ? eye.ballRadius : eye.pupilRadius;
}

/** How much white shows, 0 to 1. */
export function whiteShowing(eye: EyeShape): number {
  return clamp((eyeBall(eye) - eye.pupilRadius) / 5, 0, 1);
}

/** The lid points, laid flat across the eye when the eye has none. */
export function resolvedLidPoints(eye: EyeShape): readonly Point[] {
  const p = eye.lidPoints;
  const flat = p.every((q) => q[0] === 0 && q[1] === 0);
  if (!flat) return p;
  const c = eye.centre;
  return [[c[0] - 16, c[1]], c, [c[0] + 16, c[1]]];
}

// ---------------------------------------------------------------------------
// Blending.
// ---------------------------------------------------------------------------

/** Every part of the eye moved `t` of the way from `a` to `b`. */
export function lerpEye(a: EyeShape, b: EyeShape, t: number): EyeShape {
  return {
    centre: lerpPoint(a.centre, b.centre, t),
    ballRadius: lerpNumber(eyeBall(a), eyeBall(b), t),
    ballSquash: lerpNumber(a.ballSquash, b.ballSquash, t),
    ballWidth: lerpNumber(a.ballWidth, b.ballWidth, t),
    ballIsHead: t < 0.5 ? a.ballIsHead : b.ballIsHead,
    pupilRadius: lerpNumber(a.pupilRadius, b.pupilRadius, t),
    pupilOffset: lerpPoint(a.pupilOffset, b.pupilOffset, t),
    shineRadius: lerpNumber(a.shineRadius, b.shineRadius, t),
    shineOffset: lerpPoint(a.shineOffset, b.shineOffset, t),
    spiral: lerpNumber(a.spiral, b.spiral, t),
    lid: lerpNumber(a.lid, b.lid, t),
    lidPoints: lerpPoints(resolvedLidPoints(a), resolvedLidPoints(b), t),
    lidWidth: lerpNumber(a.lidWidth, b.lidWidth, t),
  };
}

/** A brow moved `t` of the way from `a` to `b`. */
export function lerpBrow(a: BrowShape, b: BrowShape, t: number): BrowShape {
  return {
    points: lerpPoints(a.points, b.points, t),
    width: lerpNumber(a.width, b.width, t),
    alpha: lerpNumber(a.alpha, b.alpha, t),
  };
}

/** A mouth moved `t` of the way from `a` to `b`. */
export function lerpMouth(a: MouthShape, b: MouthShape, t: number): MouthShape {
  return {
    points: lerpPoints(a.points, b.points, t),
    width: lerpNumber(a.width, b.width, t),
    fill: lerpNumber(a.fill, b.fill, t),
    fillColor: lerpNullableColor(a.fillColor, b.fillColor, t),
    fillsWithInk: t < 0.5 ? a.fillsWithInk : b.fillsWithInk,
  };
}

/** A head moved `t` of the way from `a` to `b`. */
export function lerpHead(a: HeadShape, b: HeadShape, t: number): HeadShape {
  return {
    squashX: lerpNumber(a.squashX, b.squashX, t),
    squashY: lerpNumber(a.squashY, b.squashY, t),
    strokeWidth: lerpNumber(a.strokeWidth, b.strokeWidth, t),
  };
}

function lerpProp(a: PropShape, b: PropShape, t: number): PropShape {
  return {
    kind: a.kind,
    at: lerpPoint(a.at, b.at, t),
    scale: lerpNumber(a.scale, b.scale, t),
    alpha: lerpNumber(a.alpha, b.alpha, t),
  };
}

function hidden(p: PropShape): PropShape {
  return { kind: p.kind, at: p.at, scale: 0, alpha: 0 };
}

function lerpProps(
  a: readonly PropShape[],
  b: readonly PropShape[],
  t: number,
): PropShape[] {
  const out: PropShape[] = [];
  for (const from of a) {
    const to = b.find((p) => p.kind === from.kind);
    out.push(lerpProp(from, to ?? hidden(from), t));
  }
  for (const to of b) {
    if (a.some((p) => p.kind === to.kind)) continue;
    out.push(lerpProp(hidden(to), to, t));
  }
  return out;
}

/**
 * Blends every part of face `a` `t` of the way to face `b`. `t` 0 gives
 * `a`, 1 gives `b`. Props pair up by kind; one only a single face has grows
 * in or fades out.
 */
export function lerpFace(a: FaceShape, b: FaceShape, t: number): FaceShape {
  return {
    leftEye: lerpEye(a.leftEye, b.leftEye, t),
    rightEye: lerpEye(a.rightEye, b.rightEye, t),
    leftBrow: lerpBrow(a.leftBrow, b.leftBrow, t),
    rightBrow: lerpBrow(a.rightBrow, b.rightBrow, t),
    mouth: lerpMouth(a.mouth, b.mouth, t),
    head: lerpHead(a.head, b.head, t),
    props: lerpProps(a.props, b.props, t),
    tilt: lerpNumber(a.tilt, b.tilt, t),
    nudge: lerpPoint(a.nudge, b.nudge, t),
  };
}

/** The same face with both eyes shut, which is all a blink is. */
export function blinking(face: FaceShape): FaceShape {
  const shut = (eye: EyeShape): EyeShape =>
    lerpEye(
      eye,
      eyeShape(eye.centre, {
        ballRadius: eye.ballRadius,
        ballSquash: eye.ballSquash,
        pupilRadius: eye.pupilRadius,
        pupilOffset: eye.pupilOffset,
        lid: 1,
        lidPoints: resolvedLidPoints(eye),
        lidWidth: eye.lidWidth,
      }),
      1,
    );
  return { ...face, leftEye: shut(face.leftEye), rightEye: shut(face.rightEye) };
}
