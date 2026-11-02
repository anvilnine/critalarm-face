/**
 * Part helpers the ringing styles build their faces from.
 *
 * @module
 */

import { add, clamp, mul, TAU } from "../../math.js";
import {
  browShape,
  eyeShape,
  lipsMouth,
  mouthShape,
  restingLid,
  sampleMouth,
} from "../../shape.js";
import type {
  BrowShape,
  EyeShape,
  FaceShape,
  HeadShape,
  MouthShape,
  Point,
  PropShape,
  RingFx,
  RingFxKind,
} from "../../types.js";
import { ringFx } from "../frame.js";
import { bump, seg } from "./timing.js";

export interface EyeOptions {
  ball?: number;
  pupil?: number;
  look?: Point;
  hollow?: boolean;
  shine?: number;
  squash?: number;
  spiral?: number;
  lid?: number;
  lidPoints?: readonly Point[];
  width?: number;
}

export function eye(centre: Point, o: EyeOptions = {}): EyeShape {
  const width = o.width ?? 10;
  return eyeShape(centre, {
    ballRadius: o.ball ?? 0,
    ballSquash: o.squash ?? 1,
    ballWidth: width,
    ballIsHead: o.hollow ?? false,
    pupilRadius: o.pupil ?? 11,
    pupilOffset: o.look ?? [0, 0],
    shineRadius: o.shine ?? 0,
    shineOffset: [-4, -4],
    spiral: o.spiral ?? 0,
    lid: o.lid ?? 0,
    lidPoints: o.lidPoints ?? restingLid(centre),
    lidWidth: width,
  });
}

export interface BrowOptions {
  by?: Point;
  width?: number;
  alpha?: number;
}

export function brow(a: Point, b: Point, c: Point, o: BrowOptions = {}): BrowShape {
  const by = o.by ?? [0, 0];
  return browShape([add(a, by), add(b, by), add(c, by)], {
    width: o.width ?? 11,
    alpha: o.alpha ?? 1,
  });
}

export function brows(a: Point, b: Point, c: Point, o: BrowOptions = {}): [BrowShape, BrowShape] {
  const m = (p: Point): Point => [200 - p[0], p[1]];
  return [brow(a, b, c, o), brow(m(c), m(b), m(a), o)];
}

export function alarmBrows(lift = 0, width = 11): [BrowShape, BrowShape] {
  return brows([50, 58], [67, 63], [84, 68], { by: [0, -lift], width });
}

export function worriedBrows(lift = 0, width = 11): [BrowShape, BrowShape] {
  return brows([48, 74], [65, 63], [86, 56], { by: [0, -lift], width });
}

export function gritMouth(centre: Point, w: number, h: number, bend = 0): Point[] {
  const at = (u: number, y: number): Point => [
    centre[0] - w / 2 + w * u,
    y + bend * 4 * (u - 0.5) * (u - 0.5),
  ];
  return lipsMouth(
    (u) => at(u, centre[1] + h / 2),
    (u) => at(u, centre[1] - h / 2),
  );
}

export function wavyOpen(
  centre: Point,
  w: number,
  h: number,
  amp: number,
  shift: number,
  waves = 2,
): Point[] {
  const env = (u: number) => Math.sqrt(clamp(Math.sin(Math.PI * u), 0, 1));
  const ripple = (u: number, off: number) =>
    amp * Math.sin(TAU * (waves * u + shift) + off);
  return lipsMouth(
    (u) => [centre[0] - w / 2 + w * u, centre[1] + (env(u) * h) / 2 + ripple(u, 0)],
    (u) => [centre[0] - w / 2 + w * u, centre[1] - (env(u) * h) / 2 + ripple(u, 1.3)],
  );
}

export function wavyLine(
  centre: Point,
  w: number,
  amp: number,
  shift: number,
  waves = 1.5,
  frown = 0,
): Point[] {
  return sampleMouth((u) => [
    centre[0] - w / 2 + w * u,
    centre[1] + amp * Math.sin(TAU * (waves * u + shift)) - frown * bump(u),
  ]);
}

export function inkMouth(points: readonly Point[], width = 11): MouthShape {
  return mouthShape(points, { width, fill: 1, fillsWithInk: true });
}

export const teethWhite = [1, 1, 1, 1] as const;

export function teethMouth(points: readonly Point[]): MouthShape {
  return mouthShape(points, { fill: 1, fillColor: teethWhite });
}

export function teeth(centre: Point, w: number, h: number, bend = 0): RingFx {
  return ringFx("teeth", { at: centre, extent: [w, h], phase: bend, onHead: true });
}

export function withParts(
  face: FaceShape,
  parts: { head?: HeadShape; props?: readonly PropShape[] },
): FaceShape {
  return { ...face, head: parts.head ?? face.head, props: parts.props ?? face.props };
}

export function flung(
  kind: RingFxKind,
  from: Point,
  velocity: Point,
  gravity: number,
  p: number,
  scale = 1,
  alpha = 1,
): RingFx {
  const at = add(add(from, mul(velocity, p)), [0, gravity * p * p]);
  const vx = velocity[0];
  const vy = velocity[1] + 2 * gravity * p;
  return ringFx(kind, {
    at,
    scale,
    rotation: Math.atan2(-vy, -vx) + Math.PI / 2,
    alpha: alpha * (1 - seg(p, 0.7, 1)) * seg(p, 0, 0.08),
  });
}

export function prop(kind: PropShape["kind"], at: Point, scale = 1, alpha = 1): PropShape {
  return { kind, at, scale, alpha };
}
