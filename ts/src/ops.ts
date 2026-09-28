/**
 * Turns a face into draw ops. See "Draw ops" and "Face op order" in
 * `spec/SPEC.md`. The ops are the parity contract: for the same face and
 * style this builds the same list as the Dart package.
 *
 * @module
 */

import { colors, faceStateInfo, palettes, spec, strokeFor } from "./data.js";
import {
  add,
  clamp,
  length,
  lerpColor,
  lerpPoint,
  luminance,
  mod,
  mul,
  sub,
  TAU,
  withAlpha,
} from "./math.js";
import { eyeBall, resolvedLidPoints, whiteShowing } from "./shape.js";
import type {
  BrowShape,
  Color,
  EyeShape,
  FaceOp,
  FaceShape,
  FaceState,
  FaceStyle,
  MouthShape,
  OpShape,
  OvalShape,
  Palette,
  PathCommand,
  PathShape,
  Point,
  PropShape,
  RRectShape,
} from "./types.js";

// ---------------------------------------------------------------------------
// Op helpers.
// ---------------------------------------------------------------------------

/** A save op. */
export const SAVE: FaceOp = { op: "save" };

/** A restore op. */
export const RESTORE: FaceOp = { op: "restore" };

/** A translate op. */
export function translate(dx: number, dy: number): FaceOp {
  return { op: "translate", dx, dy };
}

/** A rotate op. */
export function rotate(radians: number): FaceOp {
  return { op: "rotate", radians };
}

/** A scale op. */
export function scale(sx: number, sy: number): FaceOp {
  return { op: "scale", sx, sy };
}

/** A fill op. */
export function fillOp(shape: OpShape, color: Color): FaceOp {
  return { op: "fill", shape, color };
}

/** A stroke op with round caps and joins. */
export function strokeOp(shape: OpShape, color: Color, width: number): FaceOp {
  return { op: "stroke", shape, color, width, cap: "round", join: "round" };
}

/** An oval shape. */
export function oval(cx: number, cy: number, rx: number, ry: number): OvalShape {
  return { type: "oval", cx, cy, rx, ry };
}

/** A rounded rectangle shape. */
export function rrect(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): RRectShape {
  return { type: "rrect", x, y, width, height, radius };
}

/** Collects path commands one call at a time, the way a canvas path is built. */
export class PathBuilder {
  readonly #commands: PathCommand[] = [];

  /** Starts a new piece at `p`. */
  moveTo(p: Point): this {
    this.#commands.push(["M", p[0], p[1]]);
    return this;
  }

  /** A straight line to `p`. */
  lineTo(p: Point): this {
    this.#commands.push(["L", p[0], p[1]]);
    return this;
  }

  /** A quadratic curve bending toward `control`, ending at `end`. */
  quadTo(control: Point, end: Point): this {
    this.#commands.push(["Q", control[0], control[1], end[0], end[1]]);
    return this;
  }

  /** A cubic curve through two control points, ending at `end`. */
  cubicTo(c1: Point, c2: Point, end: Point): this {
    this.#commands.push(["C", c1[0], c1[1], c2[0], c2[1], end[0], end[1]]);
    return this;
  }

  /** Part of a circle round `centre`, from `start` for `sweep` radians. */
  arc(centre: Point, radius: number, start: number, sweep: number): this {
    this.#commands.push(["A", centre[0], centre[1], radius, start, sweep]);
    return this;
  }

  /**
   * A circular arc from `from` to `to` with `radius`, the short way round,
   * clockwise on screen unless `clockwise` is false. Stored as an `A` round
   * the centre it works out.
   */
  arcToPoint(from: Point, to: Point, radius: number, clockwise = true): this {
    const mid = mul(add(from, to), 0.5);
    const chord = sub(to, from);
    const half = length(chord) / 2;
    const r = Math.max(radius, half);
    const along = Math.sqrt(Math.max(0, r * r - half * half));
    const normal: Point =
      half === 0 ? [0, 0] : [-chord[1] / (half * 2), chord[0] / (half * 2)];
    const centre = add(mid, mul(normal, clockwise ? along : -along));
    const start = Math.atan2(from[1] - centre[1], from[0] - centre[0]);
    const end = Math.atan2(to[1] - centre[1], to[0] - centre[0]);
    let sweep = end - start;
    if (clockwise) {
      while (sweep <= 0) sweep += TAU;
    } else {
      while (sweep >= 0) sweep -= TAU;
    }
    return this.arc(centre, r, start, sweep);
  }

  /** Joins back to the start of the current piece. */
  close(): this {
    this.#commands.push(["Z"]);
    return this;
  }

  /** The path so far. */
  build(): PathShape {
    return { type: "path", commands: [...this.#commands] };
  }
}

/** A circle: its middle and radius. */
export interface Circle {
  readonly at: Point;
  readonly radius: number;
}

interface Arc {
  readonly centre: Point;
  readonly radius: number;
  readonly start: number;
  readonly sweep: number;
}

function arcPoint(a: Arc, angle: number): Point {
  return [
    a.centre[0] + Math.cos(angle) * a.radius,
    a.centre[1] + Math.sin(angle) * a.radius,
  ];
}

/**
 * The outline of overlapping circles merged into one shape, made only of
 * arcs, so neither the fill nor the outline shows where they overlap. See
 * "Cloud outlines" in `spec/SPEC.md`.
 */
export function circleUnionPath(circles: readonly Circle[]): PathShape {
  const arcs: Arc[] = [];
  for (let i = 0; i < circles.length; i++) {
    const { at: ci, radius: ri } = circles[i] as Circle;
    if (ri <= 0) continue;
    const covered: [number, number][] = [];
    let hidden = false;
    for (let j = 0; j < circles.length; j++) {
      if (i === j) continue;
      const { at: cj, radius: rj } = circles[j] as Circle;
      if (rj <= 0) continue;
      const d = length(sub(cj, ci));
      if (d >= ri + rj) continue;
      if (d + ri <= rj && (d + ri < rj || j < i)) {
        hidden = true;
        break;
      }
      if (d + rj <= ri) continue;
      const toward = Math.atan2(cj[1] - ci[1], cj[0] - ci[0]);
      const spread = Math.acos(
        clamp((ri * ri + d * d - rj * rj) / (2 * ri * d), -1, 1),
      );
      covered.push([toward - spread, toward + spread]);
    }
    if (hidden) continue;
    if (covered.length === 0) {
      arcs.push({ centre: ci, radius: ri, start: 0, sweep: TAU });
      continue;
    }
    const spans: [number, number][] = [];
    for (const [a, b] of covered) {
      const s = mod(a, TAU);
      const e = s + (b - a);
      if (e > TAU) {
        spans.push([s, TAU], [0, e - TAU]);
      } else {
        spans.push([s, e]);
      }
    }
    spans.sort((x, y) => x[0] - y[0]);
    const merged: [number, number][] = [];
    for (const span of spans) {
      const last = merged[merged.length - 1];
      if (last !== undefined && span[0] <= last[1]) {
        last[1] = Math.max(last[1], span[1]);
      } else {
        merged.push([span[0], span[1]]);
      }
    }
    for (let k = 0; k < merged.length; k++) {
      const from = (merged[k] as [number, number])[1];
      const to =
        k + 1 < merged.length
          ? (merged[k + 1] as [number, number])[0]
          : (merged[0] as [number, number])[0] + TAU;
      if (to - from > 1e-9) {
        arcs.push({ centre: ci, radius: ri, start: from, sweep: to - from });
      }
    }
  }

  const path = new PathBuilder();
  const left = [...arcs];
  while (left.length > 0) {
    let arc = left.shift() as Arc;
    path.moveTo(arcPoint(arc, arc.start));
    path.arc(arc.centre, arc.radius, arc.start, arc.sweep);
    while (left.length > 0) {
      const end = arcPoint(arc, arc.start + arc.sweep);
      let best = 0;
      let bestGap = Infinity;
      for (let k = 0; k < left.length; k++) {
        const c = left[k] as Arc;
        const gap = length(sub(arcPoint(c, c.start), end));
        if (gap < bestGap) {
          bestGap = gap;
          best = k;
        }
      }
      if (bestGap > 1e-3) break;
      arc = left.splice(best, 1)[0] as Arc;
      path.arc(arc.centre, arc.radius, arc.start, arc.sweep);
    }
    path.close();
  }
  return path.build();
}

// ---------------------------------------------------------------------------
// Styles.
// ---------------------------------------------------------------------------

/** Options for {@link faceStyle}. */
export interface FaceStyleOptions {
  /** Which state's outline colour to use. Default `calm` (the plain stroke). */
  readonly state?: FaceState;
  /** The head. Overrides the palette. */
  readonly fill?: Color;
  /** The head outline. Overrides the palette and the per-state outline. */
  readonly stroke?: Color;
  /** Brows, pupils, lids and mouths. Overrides the palette. */
  readonly ink?: Color;
  /** An open mouth that names no colour of its own. Default coral. */
  readonly tongue?: Color | null;
  /** Slides both pupils sideways, in box units. */
  readonly lookDx?: number;
  /** Turns the swirl in a spiral eye, in radians. */
  readonly spiralRotation?: number;
}

/**
 * The style a face is painted with: `palette` (default light), with the
 * outline `state` gets, and any colour overridden.
 */
export function faceStyle(
  palette: Palette = palettes.light,
  options: FaceStyleOptions = {},
): FaceStyle {
  return {
    fill: options.fill ?? palette.fill,
    stroke: options.stroke ?? strokeFor(palette, options.state ?? "calm"),
    ink: options.ink ?? palette.ink,
    tongue: options.tongue ?? null,
    lookDx: options.lookDx ?? 0,
    spiralRotation: options.spiralRotation ?? 0,
  };
}

/** The head tilt `state` rests at, in radians. Confused leans -8 degrees. */
export function defaultTilt(state: FaceState): number {
  return faceStateInfo(state).defaultTilt;
}

/** A dark pupil on a white eye when the ink is light, so it still shows. */
export function pupilOnWhite(ink: Color): Color {
  return luminance(ink) > 0.5 ? colors.darkInk : ink;
}

// ---------------------------------------------------------------------------
// buildFaceOps.
// ---------------------------------------------------------------------------

const head = rrect(
  spec.box.head.x,
  spec.box.head.y,
  spec.box.head.width,
  spec.box.head.height,
  spec.box.head.radius,
);

/**
 * Turns `shape` into draw ops in the 200 unit box, painted in `style`.
 *
 * The list starts with a save and ends with the matching restore. It does
 * not apply the face's `tilt` or `nudge`: the host does both, so it decides
 * how big the face is and how it moves.
 */
export function buildFaceOps(shape: FaceShape, style: FaceStyle): FaceOp[] {
  const ops: FaceOp[] = [SAVE];
  if (shape.head.squashX !== 1 || shape.head.squashY !== 1) {
    ops.push(
      translate(100, 100),
      scale(shape.head.squashX, shape.head.squashY),
      translate(-100, -100),
    );
  }
  ops.push(fillOp(head, style.fill));
  ops.push(strokeOp(head, style.stroke, shape.head.strokeWidth));
  for (const brow of [shape.leftBrow, shape.rightBrow]) pushBrow(ops, brow, style);
  for (const eye of [shape.leftEye, shape.rightEye]) pushEye(ops, eye, style);
  pushMouth(ops, shape.mouth, style);
  for (const prop of shape.props) pushProp(ops, prop, style);
  ops.push(RESTORE);
  return ops;
}

/** A curve through three points, where the middle one sits on the curve. */
function through(p: readonly Point[]): PathShape {
  const [p0, p1, p2] = p as [Point, Point, Point];
  const control: Point = [
    p1[0] * 2 - (p0[0] + p2[0]) / 2,
    p1[1] * 2 - (p0[1] + p2[1]) / 2,
  ];
  return new PathBuilder().moveTo(p0).quadTo(control, p2).build();
}

function pushBrow(ops: FaceOp[], brow: BrowShape, style: FaceStyle): void {
  const a = clamp(brow.alpha, 0, 1);
  if (a <= 0) return;
  ops.push(strokeOp(through(brow.points), withAlpha(style.ink, a), brow.width));
}

function pushEye(ops: FaceOp[], eye: EyeShape, style: FaceStyle): void {
  const open = clamp(1 - eye.lid, 0, 1);
  const shut = clamp(eye.lid, 0, 1);
  const ink = style.ink;
  const lids = resolvedLidPoints(eye);

  if (open > 0) {
    const centre = lerpPoint(eye.centre, lids[1] as Point, shut);
    const ball = eyeBall(eye);
    const ballOval = oval(centre[0], centre[1], ball, ball * eye.ballSquash * open);
    const pupil: Point = [
      centre[0] + eye.pupilOffset[0] + style.lookDx,
      centre[1] + eye.pupilOffset[1] * open,
    ];
    const white = whiteShowing(eye);

    if (white > 0) {
      const inside = eye.ballIsHead ? style.fill : colors.white;
      ops.push(fillOp(ballOval, withAlpha(inside, white)));
      ops.push(SAVE);
      ops.push({ op: "clipOval", cx: ballOval.cx, cy: ballOval.cy, rx: ballOval.rx, ry: ballOval.ry });
    }

    const pupilColor = eye.ballIsHead ? ink : lerpColor(ink, pupilOnWhite(ink), white);
    if (eye.spiral > 0) {
      pushSpiral(ops, pupil, eye.pupilRadius, eye.spiral, pupilColor, style);
    } else if (eye.pupilRadius > 0) {
      ops.push(
        fillOp(oval(pupil[0], pupil[1], eye.pupilRadius, eye.pupilRadius * open), pupilColor),
      );
    }
    if (eye.shineRadius > 0) {
      const at: Point = [
        pupil[0] + eye.shineOffset[0],
        pupil[1] + eye.shineOffset[1] * open,
      ];
      ops.push(
        fillOp(oval(at[0], at[1], eye.shineRadius, eye.shineRadius * open), colors.white),
      );
    }

    if (white > 0) {
      ops.push(RESTORE);
      ops.push(strokeOp(ballOval, withAlpha(ink, white), eye.ballWidth));
    }
  }

  if (shut > 0) {
    ops.push(strokeOp(through(lids), withAlpha(ink, shut), eye.lidWidth));
  }
}

function pushSpiral(
  ops: FaceOp[],
  centre: Point,
  radius: number,
  alpha: number,
  color: Color,
  style: FaceStyle,
): void {
  const path = new PathBuilder().moveTo(centre);
  const steps = 48;
  const turns = 2.5;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const angle = style.spiralRotation + t * turns * 2 * Math.PI;
    const r = radius * t;
    path.lineTo([centre[0] + r * Math.cos(angle), centre[1] + r * Math.sin(angle)]);
  }
  ops.push(strokeOp(path.build(), withAlpha(color, alpha), 4));
}

function traceMouth(path: PathBuilder, m: readonly Point[]): void {
  path.moveTo(m[0] as Point);
  for (let i = 1; i < m.length - 1; i++) {
    const p = m[i] as Point;
    path.quadTo(p, lerpPoint(p, m[i + 1] as Point, 0.5));
  }
  path.lineTo(m[m.length - 1] as Point);
}

function pushMouth(ops: FaceOp[], mouth: MouthShape, style: FaceStyle): void {
  const fill = clamp(mouth.fill, 0, 1);
  if (fill > 0) {
    const inside = new PathBuilder();
    traceMouth(inside, mouth.points);
    inside.close();
    const colour =
      mouth.fillColor ??
      (mouth.fillsWithInk ? style.ink : (style.tongue ?? colors.mouthCoral));
    ops.push(fillOp(inside.build(), withAlpha(colour, fill)));
  }
  if (mouth.width > 0) {
    const line = new PathBuilder();
    traceMouth(line, mouth.points);
    ops.push(strokeOp(line.build(), style.ink, mouth.width));
  }
}

const puffCircles: readonly Circle[] = spec.puffCircles;

function pushProp(ops: FaceOp[], prop: PropShape, style: FaceStyle): void {
  const alpha = clamp(prop.alpha, 0, 1);
  if (alpha <= 0 || prop.scale <= 0) return;
  const ink = withAlpha(style.ink, alpha);
  const s = prop.scale;
  const at = prop.at;

  switch (prop.kind) {
    case "popLines":
      for (const degrees of [-120, -90, -60]) {
        const angle = (degrees * Math.PI) / 180;
        const dir: Point = [Math.cos(angle), Math.sin(angle)];
        const line = new PathBuilder()
          .moveTo(add(at, mul(dir, 110)))
          .lineTo(add(at, mul(dir, 110 + 16 * s)));
        ops.push(strokeOp(line.build(), ink, 8));
      }
      break;

    case "zzz":
      for (let i = 0; i < 3; i++) {
        const size = (16 - i * 4) * s;
        const p = add(at, mul([i * 13, -i * 15], s));
        const z = new PathBuilder()
          .moveTo(p)
          .lineTo([p[0] + size, p[1]])
          .lineTo([p[0], p[1] + size])
          .lineTo([p[0] + size, p[1] + size]);
        ops.push(strokeOp(z.build(), ink, 4 * s));
      }
      break;

    case "puff": {
      const cloud = circleUnionPath(
        puffCircles.map((c) => ({ at: add(at, mul(c.at, s)), radius: c.radius * s })),
      );
      ops.push(fillOp(cloud, withAlpha(colors.white, alpha)));
      ops.push(strokeOp(cloud, ink, 4.5 * s));
      break;
    }

    case "heart": {
      const [x, y] = at;
      const heart = new PathBuilder()
        .moveTo([x, y + 13 * s])
        .cubicTo([x - 16 * s, y + 1 * s], [x - 9 * s, y - 12 * s], [x, y - 4 * s])
        .cubicTo([x + 9 * s, y - 12 * s], [x + 16 * s, y + 1 * s], [x, y + 13 * s])
        .close();
      ops.push(fillOp(heart.build(), withAlpha(colors.heart, alpha)));
      break;
    }

    case "motionArcs":
      for (const side of [-1, 1]) {
        for (const spread of [0, 1]) {
          const r = (14 + spread * 9) * s;
          const arc = new PathBuilder().arc(
            add(at, [side * 96, 0]),
            r,
            side < 0 ? Math.PI * 0.72 : -Math.PI * 0.28,
            Math.PI * 0.56,
          );
          ops.push(strokeOp(arc.build(), ink, 5 * s));
        }
      }
      break;
  }
}
