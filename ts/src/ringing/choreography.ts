/**
 * Where each ringing face is at moment `t` of its loop. A line by line port
 * of `dart/lib/src/ringing/ringing_choreography.dart`.
 *
 * `t` runs 0 to 1 over one loop and wraps. The same style and `t` always
 * give the same frame.
 *
 * @module
 */

import { faceFor } from "../data.js";
import { add, clamp, frac, lerpPoints, mul, TAU } from "../math.js";
import {
  browShape,
  eyeShape,
  faceShape,
  headShape,
  lerpBrow,
  lerpFace,
  lerpMouth,
  lineMouth,
  lipsMouth,
  mouthShape,
  ovalMouth,
  quadAt,
  restingLid,
  sampleMouth,
} from "../shape.js";
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
  RingingFrame,
  RingingStyleName,
} from "../types.js";
import { fadedFx, ringFx, ringingFrame } from "./frame.js";

/** The frame `style` shows at point `t` of its loop. `t` wraps. */
export function ringingFrameFor(style: RingingStyleName, t: number): RingingFrame {
  const at = frac(t);
  switch (style) {
    case "classic":
      return classic(at);
    case "panic":
      return panic(at);
    case "rage":
      return rage(at);
    case "confused":
      return confused(at);
    case "dizzy":
      return dizzy(at);
    case "sobbing":
      return sobbing(at);
    case "scream":
      return scream(at);
    case "bellHead":
      return bellHead(at);
    case "eyesPop":
      return eyesPop(at);
    case "annoyed":
      return annoyed(at);
    case "startled":
      return startled(at);
    case "hyperventilating":
      return hyperventilating(at);
    case "zapped":
      return zapped(at);
    case "bouncing":
      return bouncing(at);
    case "terrified":
      return terrified(at);
    case "siren":
      return siren(at);
    case "meltdown":
      return meltdown(at);
    case "spinOut":
      return spinOut(at);
    default:
      throw new RangeError(`Unknown ringing style: ${String(style)}`);
  }
}

// ---------------------------------------------------------------------------
// Timing helpers.
// ---------------------------------------------------------------------------

function wave(t: number, cycles: number, phase = 0): number {
  return Math.sin(TAU * (t * cycles + phase));
}

function pulse(t: number, cycles: number, phase = 0): number {
  return 0.5 + 0.5 * wave(t, cycles, phase);
}

function seg(t: number, a: number, b: number): number {
  return clamp((t - a) / (b - a), 0, 1);
}

function ease(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function elastic(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return Math.pow(2, -10 * x) * Math.sin(((x - 0.075) * TAU) / 0.3) + 1;
}

function bump(x: number): number {
  return Math.sin(Math.PI * clamp(x, 0, 1));
}

function snap(v: number, k = 4): number {
  const e = Math.exp(2 * k * v);
  return (e - 1) / (e + 1);
}

function deg(d: number): number {
  return (d * Math.PI) / 180;
}

// ---------------------------------------------------------------------------
// Part helpers.
// ---------------------------------------------------------------------------

interface EyeOptions {
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

function eye(centre: Point, o: EyeOptions = {}): EyeShape {
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

interface BrowOptions {
  by?: Point;
  width?: number;
  alpha?: number;
}

function brow(a: Point, b: Point, c: Point, o: BrowOptions = {}): BrowShape {
  const by = o.by ?? [0, 0];
  return browShape([add(a, by), add(b, by), add(c, by)], {
    width: o.width ?? 11,
    alpha: o.alpha ?? 1,
  });
}

function brows(a: Point, b: Point, c: Point, o: BrowOptions = {}): [BrowShape, BrowShape] {
  const m = (p: Point): Point => [200 - p[0], p[1]];
  return [brow(a, b, c, o), brow(m(c), m(b), m(a), o)];
}

function alarmBrows(lift = 0, width = 11): [BrowShape, BrowShape] {
  return brows([50, 58], [67, 63], [84, 68], { by: [0, -lift], width });
}

function worriedBrows(lift = 0, width = 11): [BrowShape, BrowShape] {
  return brows([48, 74], [65, 63], [86, 56], { by: [0, -lift], width });
}

function gritMouth(centre: Point, w: number, h: number, bend = 0): Point[] {
  const at = (u: number, y: number): Point => [
    centre[0] - w / 2 + w * u,
    y + bend * 4 * (u - 0.5) * (u - 0.5),
  ];
  return lipsMouth(
    (u) => at(u, centre[1] + h / 2),
    (u) => at(u, centre[1] - h / 2),
  );
}

function wavyOpen(
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

function wavyLine(
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

function inkMouth(points: readonly Point[], width = 11): MouthShape {
  return mouthShape(points, { width, fill: 1, fillsWithInk: true });
}

const teethWhite = [1, 1, 1, 1] as const;

function teethMouth(points: readonly Point[]): MouthShape {
  return mouthShape(points, { fill: 1, fillColor: teethWhite });
}

function teeth(centre: Point, w: number, h: number, bend = 0): RingFx {
  return ringFx("teeth", { at: centre, extent: [w, h], phase: bend, onHead: true });
}

function withParts(
  face: FaceShape,
  parts: { head?: HeadShape; props?: readonly PropShape[] },
): FaceShape {
  return { ...face, head: parts.head ?? face.head, props: parts.props ?? face.props };
}

function flung(
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

function prop(kind: PropShape["kind"], at: Point, scale = 1, alpha = 1): PropShape {
  return { kind, at, scale, alpha };
}

// ---------------------------------------------------------------------------
// The styles.
// ---------------------------------------------------------------------------

function classic(t: number): RingingFrame {
  const shout = pulse(t, 3);
  const jitter: Point = [wave(t, 12) * 1.2, wave(t, 9, 0.25)];
  const [lb, rb] = alarmBrows(4 * shout);
  const e = (c: Point) =>
    eye(c, { ball: 17 + 2 * shout, pupil: 6, hollow: true, width: 11, look: jitter });
  return ringingFrame(
    faceShape({
      leftEye: e([70, 94]),
      rightEye: e([130, 94]),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(ovalMouth([100, 142], 14 + 5 * shout, 14 + 10 * shout)),
      head: headShape({ strokeWidth: 12 }),
    }),
    {
      tilt: deg(4) * wave(t, 6),
      scale: 1 + 0.03 * shout,
      fx: [ringFx("soundWaves", { phase: frac(t * 2) })],
    },
  );
}

function panic(t: number): RingingFrame {
  const dart = snap(wave(t, 4));
  const look: Point = [dart * 9, 2 * wave(t, 8)];
  const scream = pulse(t, 4);
  const [lb, rb] = worriedBrows(3 * pulse(t, 8));
  const e = (c: Point) => eye(c, { ball: 21, pupil: 8, shine: 3, look });
  const fx: RingFx[] = [];
  for (let i = 0; i < 4; i++) {
    const even = i % 2 === 0;
    fx.push(
      flung(
        "sweat",
        [even ? 34 : 166, 58 + Math.trunc(i / 2) * 14],
        [even ? -46 : 46, -40],
        110,
        frac(t * 2 + i / 4),
        0.9,
      ),
    );
  }
  fx.push(
    ringFx("exclaim", {
      at: [100, -14],
      scale: 0.9 + 0.2 * pulse(t, 4),
      rotation: deg(10) * wave(t, 2),
    }),
  );
  return ringingFrame(
    faceShape({
      leftEye: e([68, 96]),
      rightEye: e([132, 96]),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(wavyOpen([100, 147], 56, 18 + 6 * scream, 2.5, t * 3), 10),
      head: headShape({ strokeWidth: 11 }),
    }),
    {
      tilt: deg(2.5) * wave(t, 5),
      nudge: [wave(t, 10) * 2.5, wave(t, 7, 0.3) * 1.5],
      fx,
    },
  );
}

function rage(t: number): RingingFrame {
  const throb = pulse(t, 4);
  const [lb, rb] = brows([46, 68], [66, 77], [88, 88], { by: [0, 2 * throb], width: 13 });
  const mouthAt: Point = [100, 147];
  const fx: RingFx[] = [
    teeth(mouthAt, 60, 20, 6),
    ringFx("angerVein", { at: [150, 42], scale: 0.75 + 0.35 * throb, onHead: true }),
  ];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const p = frac(t * 2 + i / 2 + (side > 0 ? 0.25 : 0));
      fx.push(
        ringFx("steam", {
          at: [100 + side * (86 + 34 * p), 52 - 44 * p],
          scale: 0.5 + 0.9 * p,
          alpha: (1 - p) * seg(p, 0, 0.1),
        }),
      );
    }
  }
  return ringingFrame(
    faceShape({
      leftEye: eye([70, 100], { ball: 15, squash: 0.72, pupil: 8, look: [4, 0] }),
      rightEye: eye([130, 100], { ball: 15, squash: 0.72, pupil: 8, look: [-4, 0] }),
      leftBrow: lb,
      rightBrow: rb,
      mouth: teethMouth(gritMouth(mouthAt, 60, 20, 6)),
      head: headShape({ strokeWidth: 13 }),
    }),
    {
      nudge: [wave(t, 14) * 2.2, wave(t, 11, 0.2) * 0.8],
      scale: 1 + 0.025 * throb,
      flush: 0.45 + 0.4 * throb,
      fx,
    },
  );
}

function confused(t: number): RingingFrame {
  const sway = wave(t, 1);
  const k = 0.5 + 0.5 * sway;
  const leftHigh: Point[] = [
    [48, 64],
    [66, 50],
    [86, 58],
  ];
  const leftLow: Point[] = [
    [50, 72],
    [68, 72],
    [86, 74],
  ];
  const rightHigh: Point[] = [
    [114, 58],
    [134, 50],
    [152, 64],
  ];
  const rightLow: Point[] = [
    [114, 74],
    [132, 72],
    [150, 72],
  ];
  const look: Point = [sway * 5, -6];
  const spots: Point[] = [
    [34, 0],
    [166, -6],
    [100, -26],
  ];
  const fx: RingFx[] = [];
  for (let i = 0; i < 3; i++) {
    const p = frac(t + i / 3);
    fx.push(
      ringFx("question", {
        at: add(spots[i] as Point, [0, -12 * p]),
        scale: elastic(seg(p, 0, 0.3)) * (1 - seg(p, 0.8, 1)),
        rotation: deg(14) * Math.sin(TAU * (t * 2 + i / 3)),
      }),
    );
  }
  return ringingFrame(
    faceShape({
      leftEye: eye([68, 96], { ball: 16 + 5 * k, pupil: 7 + 2 * k, shine: 3, look }),
      rightEye: eye([132, 97], { ball: 21 - 5 * k, pupil: 9 - 2 * k, shine: 3, look }),
      leftBrow: browShape(lerpPoints(leftLow, leftHigh, k)),
      rightBrow: browShape(lerpPoints(rightHigh, rightLow, k)),
      mouth: mouthShape(
        sampleMouth((u) => [
          80 + 42 * u,
          143 + 5 * Math.sin(TAU * (1.5 * u + t)) + 8 * (u - 0.5) * sway,
        ]),
      ),
    }),
    { tilt: deg(12) * sway, nudge: [sway * 6, 0], fx },
  );
}

function dizzy(t: number): RingingFrame {
  const [lb, rb] = worriedBrows(-4 + 3 * wave(t, 2), 10);
  const fx: RingFx[] = [];
  for (let i = 0; i < 3; i++) {
    const a = TAU * (t * 2 + i / 3);
    fx.push(
      ringFx("star", {
        at: [100 + 76 * Math.cos(a), 6 + 16 * Math.sin(a)],
        scale: 0.75 + 0.25 * Math.sin(a),
        rotation: a * 2,
        inFront: Math.sin(a) > 0,
        onHead: true,
      }),
    );
  }
  return ringingFrame(
    faceShape({
      leftEye: eye([70, 94], { pupil: 17, spiral: 1 }),
      rightEye: eye([130, 94], { pupil: 17, spiral: 1 }),
      leftBrow: lb,
      rightBrow: rb,
      mouth: mouthShape(wavyOpen([100, 146], 50, 12, 3.5, t * 2, 1.5), {
        width: 9,
        fill: 1,
      }),
    }),
    {
      spin: -TAU * t * 2,
      tilt: deg(9) * wave(t, 1, 0.25),
      nudge: [Math.cos(TAU * t) * 7, Math.sin(TAU * t) * 4],
      fx,
    },
  );
}

function sobbing(t: number): RingingFrame {
  const sob = Math.pow(pulse(t, 3), 2);
  const [lb, rb] = worriedBrows(3 * sob);
  const fx: RingFx[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      fx.push(
        flung(
          "tear",
          [100 + side * 44, 92],
          [side * 56, -34],
          130,
          frac(t * 2 + i / 4 + (side > 0 ? 0.125 : 0)),
          0.8,
        ),
      );
    }
  }
  for (const side of [-1, 1]) {
    const p = frac(t * 3 + (side > 0 ? 0.5 : 0));
    fx.push(
      ringFx("tear", {
        at: [100 + side * 34, 104 + 42 * p],
        scale: 0.6,
        alpha: (1 - p) * seg(p, 0, 0.1),
        onHead: true,
      }),
    );
  }
  return ringingFrame(
    faceShape({
      leftEye: eye([70, 92], {
        lid: 1,
        lidPoints: [
          [54, 90],
          [70, 97],
          [86, 88],
        ],
      }),
      rightEye: eye([130, 92], {
        lid: 1,
        lidPoints: [
          [114, 88],
          [130, 97],
          [146, 90],
        ],
      }),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(
        lipsMouth(
          (u) => quadAt([68, 158], [100, 166 + 4 * sob], [132, 158], u),
          (u) => quadAt([68, 158], [100, 124 - 8 * sob], [132, 158], u),
        ),
        10,
      ),
      head: headShape({ squashX: 1 + 0.03 * sob, squashY: 1 - 0.04 * sob }),
    }),
    { nudge: [0, 4 * sob], fx },
  );
}

function scream(t: number): RingingFrame {
  const shriek = pulse(t, 2);
  const tremble: Point = [wave(t, 16) * 1.6, wave(t, 13, 0.3) * 1.2];
  const [lb, rb] = brows([48, 56], [68, 44], [88, 52], { by: [0, -3 * shriek] });
  const e = (c: Point) => eye(c, { ball: 22, pupil: 3.5, width: 9, look: mul(tremble, 0.8) });
  const fx: RingFx[] = [];
  for (let i = 0; i < 2; i++) {
    const p = frac(t * 2 + i / 2);
    fx.push(
      ringFx("pulseRing", {
        scale: 1 + 0.45 * p,
        alpha: (1 - p) * seg(p, 0, 0.15) * 0.6,
        inFront: false,
      }),
    );
  }
  fx.push(
    ringFx("soundWaves", { phase: frac(t * 3) }),
    ringFx("exclaim", { at: [154, -12], scale: 0.8 + 0.2 * shriek, rotation: deg(12) }),
    ringFx("exclaim", { at: [178, 2], scale: 0.7 + 0.2 * (1 - shriek), rotation: deg(24) }),
  );
  return ringingFrame(
    faceShape({
      leftEye: e([70, 88]),
      rightEye: e([130, 88]),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(ovalMouth([100, 147], 16 + 2 * shriek, 28 + 6 * shriek), 10),
      head: headShape({ squashX: 0.9, squashY: 1.1 + 0.03 * shriek, strokeWidth: 12 }),
    }),
    { tilt: deg(1.5) * wave(t, 10), nudge: tremble, fx },
  );
}

function bellHead(t: number): RingingFrame {
  const swing = wave(t, 2);
  const hit = Math.pow(Math.abs(swing), 6);
  const side = Math.sign(swing);
  const open = ovalMouth([100, 144], 16, 20);
  const grit = gritMouth([100, 144], 50, 16, 4);
  const [lb, rb] = alarmBrows(-4 * hit);
  const wince = (c: Point, struck: boolean) =>
    eye(c, {
      ball: 17,
      pupil: 6,
      hollow: true,
      width: 11,
      lid: hit * (struck ? 0.9 : 0.3),
      lidPoints: [add(c, [-14, 2]), c, add(c, [14, 2])],
    });
  return ringingFrame(
    faceShape({
      leftEye: wince([70, 96], side < 0),
      rightEye: wince([130, 96], side > 0),
      leftBrow: lb,
      rightBrow: rb,
      mouth: lerpMouth(inkMouth(open), teethMouth(grit), hit),
      head: headShape({ strokeWidth: 12 }),
    }),
    {
      tilt: -side * deg(5) * hit,
      nudge: [-side * 3 * hit, 3 * hit],
      fx: [
        ringFx("bell", {
          at: [56, 2],
          rotation: deg(-28) + (side < 0 ? deg(-10) * hit : 0),
          onHead: true,
          inFront: false,
        }),
        ringFx("bell", {
          at: [144, 2],
          rotation: deg(28) + (side > 0 ? deg(10) * hit : 0),
          onHead: true,
          inFront: false,
        }),
        ringFx("hammer", {
          at: [100, 14],
          rotation: deg(45) * swing,
          onHead: true,
          inFront: false,
        }),
        fadedFx(teeth([100, 144], 50, 16, 4), hit),
        ringFx("star", {
          at: [100 + side * 70, -26],
          scale: 0.9 * hit,
          alpha: hit,
          rotation: t * TAU,
        }),
        ringFx("soundWaves", { phase: frac(t * 2), alpha: 0.4 + 0.6 * hit }),
      ],
    },
  );
}

function eyesPop(t: number): RingingFrame {
  const pop = elastic(seg(t, 0.06, 0.4)) * (1 - ease(seg(t, 0.72, 0.94)));
  const brace = bump(seg(t, 0, 0.06));
  const [lb, rb] = brows([52, 70], [68, 64], [84, 68], {
    by: [0, -28 * pop + 4 * brace],
    alpha: 1 - 0.3 * clamp(pop, 0, 1),
  });
  const e = (c: Point) =>
    eye(c, { ball: 16 + 16 * pop, pupil: Math.max(3, 9 - 5 * pop), shine: 3, width: 9 });
  return ringingFrame(
    faceShape({
      leftEye: e([70 - 8 * pop, 94 - 8 * pop]),
      rightEye: e([130 + 8 * pop, 94 - 8 * pop]),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(
        ovalMouth([100, 142 + 20 * pop], 12 + 7 * pop, Math.max(4, 5 + 30 * pop)),
        10,
      ),
      head: headShape({
        squashX: 1 - 0.05 * pop - 0.03 * brace,
        squashY: 1 + 0.12 * pop - 0.05 * brace,
      }),
      props: [prop("popLines", [100, 100], clamp(pop, 0, 1.2), clamp(pop, 0, 1))],
    }),
    {
      tilt: deg(3) * wave(t, 6) * pop,
      fx: [
        ringFx("exclaim", {
          at: [100, -34],
          scale: clamp(pop, 0, 1.3),
          alpha: clamp(pop, 0, 1),
        }),
      ],
    },
  );
}

function annoyed(t: number): RingingFrame {
  const env = bump(seg(t, 0.08, 0.62));
  const a = Math.PI + Math.PI * ease(seg(t, 0.12, 0.56));
  const look = mul([Math.cos(a), Math.sin(a)], 9 * env);
  const sigh = bump(seg(t, 0.6, 0.94));
  const [lb, rb] = brows([52, 82], [70, 81], [88, 83], { width: 12 });
  const e = (c: Point) => eye(c, { ball: 17, squash: 0.55, pupil: 8, look });
  return ringingFrame(
    faceShape({
      leftEye: e([70, 98]),
      rightEye: e([130, 98]),
      leftBrow: lb,
      rightBrow: lerpBrow(rb, brow([112, 70], [130, 62], [148, 68], { width: 12 }), env),
      mouth: lerpMouth(
        mouthShape(lineMouth([84, 142], [118, 138])),
        inkMouth(ovalMouth([110, 142], 7, 6), 9),
        sigh,
      ),
      head: headShape({ squashY: 1 - 0.04 * sigh, squashX: 1 + 0.02 * sigh }),
      props: [prop("puff", [144 + 22 * seg(t, 0.6, 0.94), 150], sigh * 1.2, sigh)],
    }),
    {
      tilt: -deg(7) * env,
      nudge: [0, -2 * env + 3 * sigh],
      fx: [ringFx("soundWaves", { phase: frac(t * 3), alpha: 0.45 })],
    },
  );
}

function startled(t: number): RingingFrame {
  const awake = ease(seg(t, 0.4, 0.45)) * (1 - ease(seg(t, 0.8, 0.98)));
  const air = seg(t, 0.42, 0.72);
  const height = 4 * air * (1 - air);
  const land = bump(seg(t, 0.72, 0.8));
  const breathe = wave(t, 2) * (1 - awake);
  const squashY = 1 - 0.12 * land + 0.06 * height + 0.015 * breathe;
  const blended = lerpFace(faceFor("dozing"), faceFor("shocked"), awake);
  const zzz = prop(
    "zzz",
    [150 + 4 * wave(t, 2), 34 - 6 * pulse(t, 2)],
    (1 - awake) * (0.9 + 0.1 * pulse(t, 2)),
    1 - awake,
  );
  const fx: RingFx[] = [
    ringFx("exclaim", {
      at: [100, -30],
      scale: elastic(seg(t, 0.44, 0.56)) * 1.1 * (1 - seg(t, 0.72, 0.8)),
      alpha: seg(t, 0.44, 0.46) * (1 - seg(t, 0.72, 0.8)),
      onHead: true,
    }),
    ringFx("speedLines", {
      at: [100, 214 - 48 * height],
      alpha: seg(t, 0.43, 0.47) * (1 - seg(t, 0.52, 0.57)),
    }),
    ringFx("soundWaves", { phase: frac(t * 4), alpha: awake }),
  ];
  for (const side of [-1, 1]) {
    fx.push(
      ringFx("steam", {
        at: [100 + side * (70 + 26 * land), 188],
        scale: 0.4 + 0.4 * land,
        alpha: land,
      }),
    );
  }
  return ringingFrame(
    withParts(blended, {
      head: headShape({
        squashX: 1 + 0.1 * land - 0.03 * height,
        squashY,
        strokeWidth: 10 + 2 * awake,
      }),
      props: [zzz],
    }),
    {
      tilt: deg(4) * wave(t, 20) * height + 0.06 * (1 - awake),
      nudge: [0, -48 * height + 88 * (1 - squashY)],
      fx,
    },
  );
}

function hyperventilating(t: number): RingingFrame {
  const breath = pulse(t, 3);
  const out = 1 - breath;
  const [lb, rb] = worriedBrows(3 * breath);
  const look: Point = [wave(t, 9) * 1.5, 0];
  const e = (c: Point) => eye(c, { ball: 20, pupil: 6, shine: 2.5, look });
  const fx: RingFx[] = [ringFx("blush", { alpha: 0.55, onHead: true })];
  for (let i = 0; i < 2; i++) {
    const p = frac(t * 2 + i / 2);
    fx.push(
      ringFx("sweat", {
        at: [i === 0 ? 156 : 44, 46 + 34 * p],
        scale: 0.75,
        alpha: (1 - p) * seg(p, 0, 0.1),
        onHead: true,
      }),
    );
  }
  return ringingFrame(
    faceShape({
      leftEye: e([70, 94]),
      rightEye: e([130, 94]),
      leftBrow: lb,
      rightBrow: rb,
      mouth: lerpMouth(
        inkMouth(ovalMouth([106, 146], 5, 4), 9),
        inkMouth(ovalMouth([100, 146], 10, 12), 9),
        breath,
      ),
      head: headShape({ squashX: 1 + 0.07 * out, squashY: 1 + 0.03 * breath }),
      props: [prop("puff", [142 + 16 * out, 152], out, out * out)],
    }),
    { nudge: [0, -2.5 * breath], fx },
  );
}

function zapped(t: number): RingingFrame {
  const zap = seg(t, 0, 0.04) * (1 - seg(t, 0.52, 0.6));
  const flicker = wave(t, 18) > 0 ? 1 : 0;
  const jolt = mul([wave(t, 23) * 3, wave(t, 19, 0.3) * 3], zap);
  const mouthAt: Point = [100, 146];

  const shocked = faceShape({
    leftEye: eye([68, 94], { ball: 22, pupil: 3, width: 9, look: mul(jolt, 0.6) }),
    rightEye: eye([132, 94], { ball: 22, pupil: 3, width: 9, look: mul(jolt, 0.6) }),
    leftBrow: brow([46, 58], [66, 46], [88, 56]),
    rightBrow: brow([112, 56], [134, 46], [154, 58]),
    mouth: teethMouth(gritMouth(mouthAt, 66, 22, -5)),
    head: headShape({ strokeWidth: 13 }),
  });
  const dazed = faceShape({
    leftEye: eye([70, 96], { ball: 15, squash: 0.6, pupil: 7, look: [5, 1] }),
    rightEye: eye([130, 96], { ball: 15, squash: 0.6, pupil: 7, look: [-5, -1] }),
    leftBrow: brow([54, 78], [70, 76], [86, 78]),
    rightBrow: brow([114, 78], [130, 76], [146, 78]),
    mouth: mouthShape(wavyLine([100, 144], 44, 4, t * 2)),
  });
  const bolts: [Point, number][] = [
    [[14, 30], -0.5],
    [[186, 24], 0.6],
    [[4, 150], -2.2],
    [[196, 146], 2.4],
    [[100, -22], 0.1],
  ];
  const fx: RingFx[] = [fadedFx(teeth(mouthAt, 66, 22, -5), zap)];
  bolts.forEach(([at, rotation], i) => {
    fx.push(
      ringFx("bolt", {
        at,
        rotation,
        scale: 0.9 + 0.2 * pulse(t, 7, i / 5),
        alpha: zap * (wave(t, 12, i / 5) > -0.2 ? 1 : 0),
      }),
    );
  });
  for (let i = 0; i < 3; i++) {
    const p = frac(t * 2 + i / 3);
    fx.push(
      ringFx("steam", {
        at: [70 + i * 30 + 10 * Math.sin(TAU * p), 8 - 40 * p],
        scale: 0.5 + 0.7 * p,
        alpha: (1 - zap) * (1 - p) * seg(p, 0, 0.15) * 0.9,
      }),
    );
  }
  return ringingFrame(lerpFace(dazed, shocked, zap), {
    nudge: jolt,
    tilt: deg(3) * wave(t, 13) * zap,
    flash: 0.9 * flicker * zap,
    fx,
  });
}

function bouncing(t: number): RingingFrame {
  const height = 4 * t * (1 - t);
  const ground = Math.min(t, 1 - t);
  const land = Math.pow(1 - clamp(ground / 0.12, 0, 1), 2);
  const squashY = 1 + 0.06 * height * (1 - land) - 0.16 * land;
  const squashX = 1 - 0.04 * height + 0.14 * land;
  const [lb, rb] = alarmBrows(8 * height);
  const look: Point = [0, -4 * wave(t, 1, 0.25)];
  const e = (c: Point) => eye(c, { ball: 17, pupil: 6, hollow: true, width: 11, look });
  const fx: RingFx[] = [
    ringFx("speedLines", {
      at: [100, 212 - 40 * height],
      alpha: seg(t, 0.06, 0.14) * (1 - seg(t, 0.3, 0.45)),
    }),
  ];
  for (const side of [-1, 1]) {
    fx.push(
      ringFx("steam", {
        at: [100 + side * (78 + 16 * land), 186],
        scale: 0.35 + 0.35 * land,
        alpha: land,
      }),
    );
  }
  fx.push(ringFx("soundWaves", { alpha: 0.7 }));
  return ringingFrame(
    faceShape({
      leftEye: e([70, 94]),
      rightEye: e([130, 94]),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(ovalMouth([100, 144], 13 + 5 * height, 6 + 16 * height)),
      head: headShape({ squashX, squashY, strokeWidth: 12 }),
    }),
    {
      nudge: [0, -40 * height + 88 * (1 - squashY)],
      tilt: deg(4) * wave(t, 1),
      fx,
    },
  );
}

function terrified(t: number): RingingFrame {
  const tremble: Point = [wave(t, 15) * 2.4, wave(t, 17, 0.2) * 1.4];
  const chatter = pulse(t, 10);
  const look = add([snap(wave(t, 2), 3) * 7, -5], mul(tremble, 0.5));
  const [lb, rb] = brows([46, 78], [63, 64], [84, 54], { width: 10 });
  const mouthH = 6 + 9 * chatter;
  const mouthAt: Point = [100, 147];
  const e = (c: Point) => eye(c, { ball: 20, pupil: 7, shine: 3, look });
  const fx: RingFx[] = [teeth(mouthAt, 50, mouthH, 4)];
  for (let i = 0; i < 2; i++) {
    const p = frac(t + i / 2);
    fx.push(
      ringFx("sweat", {
        at: [i === 0 ? 40 : 160, 54 + 30 * p],
        scale: 0.8,
        alpha: (1 - p) * seg(p, 0, 0.1),
        onHead: true,
      }),
    );
  }
  return ringingFrame(
    faceShape({
      leftEye: e([68, 96]),
      rightEye: e([132, 96]),
      leftBrow: lb,
      rightBrow: rb,
      mouth: teethMouth(gritMouth(mouthAt, 50, mouthH, 4)),
    }),
    {
      scale: 0.86,
      nudge: add(tremble, [0, 8]),
      tilt: deg(2) * wave(t, 11),
      fx,
    },
  );
}

function siren(t: number): RingingFrame {
  const wee = pulse(t, 2);
  const [lb, rb] = brows([52, 62], [68, 56], [86, 60], { by: [0, -7 * wee] });
  const look: Point = [0, -3 * wee];
  const e = (c: Point) => eye(c, { ball: 17, pupil: 6, hollow: true, width: 11, look });
  return ringingFrame(
    faceShape({
      leftEye: e([70, 96]),
      rightEye: e([130, 96]),
      leftBrow: lb,
      rightBrow: rb,
      mouth: lerpMouth(
        inkMouth(ovalMouth([100, 146], 11, 17)),
        inkMouth(ovalMouth([100, 143], 27, 9)),
        wee,
      ),
      head: headShape({ strokeWidth: 12 }),
    }),
    {
      scale: 1 + 0.04 * wee,
      flush: 0.35 * wee,
      fx: [
        ringFx("pulseRing", { scale: 1.05 + 0.25 * wee, alpha: 0.5 * wee, inFront: false }),
        ringFx("siren", { at: [100, 4], phase: frac(t * 2), onHead: true, inFront: false }),
        ringFx("soundWaves", { phase: frac(t * 2) }),
      ],
    },
  );
}

function meltdown(t: number): RingingFrame {
  const down = ease(seg(t, 0.05, 0.6));
  const back = elastic(seg(t, 0.76, 1));
  const m = down * (1 - back);
  const squashY = 1 - 0.3 * m;
  const squashX = 1 + 0.2 * m;
  const [lb, rb] = brows([52, 66], [68, 62], [86, 60], { by: [0, 12 * m] });
  const fx: RingFx[] = [];
  const dripXs = [48, 86, 124, 158];
  dripXs.forEach((x, i) => {
    const p = frac(t * 2 + i * 0.27);
    fx.push(
      ringFx("drip", {
        at: [100 + (x - 100) * squashX, 184 + 34 * p * p],
        scale: 0.7 + 0.4 * m,
        alpha: seg(m, 0.15, 0.5) * (1 - p),
      }),
    );
  });
  fx.push(
    ringFx("sweat", {
      at: [150, 44 + 20 * frac(t * 2)],
      scale: 0.8,
      alpha: clamp(m, 0, 1) * (1 - frac(t * 2)),
      onHead: true,
    }),
  );
  const e = (c: Point) =>
    eye(c, { ball: 17, squash: 1 - 0.4 * m, pupil: 7, shine: 2.5, look: [0, 5 * m] });
  return ringingFrame(
    faceShape({
      leftEye: e([66 - 6 * m, 94 + 10 * m]),
      rightEye: e([134 + 6 * m, 94 + 10 * m]),
      leftBrow: lb,
      rightBrow: rb,
      mouth: mouthShape(wavyLine([100, 144 + 8 * m], 48 + 12 * m, 3 * m, t * 4, 2, 8)),
      head: headShape({ squashX, squashY }),
    }),
    {
      nudge: [0, 88 * (1 - squashY)],
      tilt: deg(2) * wave(t, 6) * m,
      flush: 0.5 * clamp(m, 0, 1),
      fx,
    },
  );
}

function spinOut(t: number): RingingFrame {
  const spinP = ease(seg(t, 0, 0.45));
  const w = seg(t, 0.45, 1);
  const wobble = Math.sin(TAU * 3 * w) * (1 - w);
  const swirl = seg(t, 0, 0.1) * (1 - seg(t, 0.72, 0.95));
  const [lb, rb] = alarmBrows(-2 * swirl);
  const e = (c: Point) =>
    eye(c, { ball: 17, pupil: 6 + 10 * swirl, hollow: true, width: 11, spiral: swirl });
  const stars = seg(t, 0.4, 0.5) * (1 - seg(t, 0.85, 1));
  const fx: RingFx[] = [
    ringFx("speedLines", {
      at: [-6, 100],
      rotation: Math.PI / 2,
      alpha: bump(seg(t, 0.05, 0.42)),
    }),
    ringFx("speedLines", {
      at: [206, 100],
      rotation: -Math.PI / 2,
      alpha: bump(seg(t, 0.05, 0.42)),
    }),
  ];
  for (let i = 0; i < 3; i++) {
    const a = TAU * (t * 2 + i / 3);
    fx.push(
      ringFx("star", {
        at: [100 + 70 * Math.cos(a), 4 + 14 * Math.sin(a)],
        scale: (0.7 + 0.2 * Math.sin(a)) * stars,
        alpha: stars,
        rotation: a,
        inFront: Math.sin(a) > 0,
      }),
    );
  }
  return ringingFrame(
    faceShape({
      leftEye: e([70, 94]),
      rightEye: e([130, 94]),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(wavyOpen([100, 145], 34, 10 + 10 * swirl, 2, t * 3), 10),
      head: headShape({ strokeWidth: 12 }),
    }),
    {
      spin: TAU * t * 3,
      tilt: TAU * spinP + deg(14) * wobble,
      nudge: [6 * wobble, 0],
      fx,
    },
  );
}
