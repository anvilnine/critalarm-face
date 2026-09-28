/**
 * Turns a ringing frame into draw ops on the 280 unit stage. See "Ringing op
 * order" and "Extra ops" in `spec/SPEC.md`.
 *
 * @module
 */

import { colors, palettes, spec } from "../data.js";
import { lerpColor, mod, withAlpha } from "../math.js";
import {
  buildFaceOps,
  circleUnionPath,
  fillOp,
  oval,
  PathBuilder,
  RESTORE,
  rotate,
  rrect,
  SAVE,
  scale,
  strokeOp,
  translate,
} from "../ops.js";
import type {
  Color,
  FaceOp,
  OpShape,
  Palette,
  PathShape,
  Point,
  RingFx,
  RingingColors,
  RingingFrame,
} from "../types.js";

/** How wide the ringing stage is, in face units. */
export const RINGING_STAGE_UNITS: number = spec.ringingStage.size;

/** Options for {@link ringingColors}. */
export interface RingingColorOptions {
  /** The head. Defaults to the palette's fill. */
  readonly fill?: Color;
  /** The head outline. Defaults to the alarm red. */
  readonly stroke?: Color;
  /** Brows, eyes and mouth. Defaults to the palette's ink. */
  readonly ink?: Color;
  /** The flush, the siren and the other red extras. Defaults to the alarm red. */
  readonly accent?: Color;
}

/** The ringing colours from `palette` (default light), any overridden. */
export function ringingColors(
  palette: Palette = palettes.light,
  options: RingingColorOptions = {},
): RingingColors {
  return {
    fill: options.fill ?? palette.fill,
    stroke: options.stroke ?? palette.crit,
    ink: options.ink ?? palette.ink,
    accent: options.accent ?? palette.crit,
  };
}

/**
 * Turns one ringing `frame` into draw ops on the 280 unit stage, painted in
 * `colors`. The face's 200 unit box sits 40 units in from each side.
 */
export function buildRingingOps(frame: RingingFrame, colors: RingingColors): FaceOp[] {
  const f = frame;
  const fill = lerpColor(colors.fill, colors.accent, f.flush * 0.8);
  const headFill = lerpColor(fill, colors.ink, f.flash);
  const ink = lerpColor(colors.ink, fill, f.flash);
  const inset = (RINGING_STAGE_UNITS - 200) / 2;
  const ops: FaceOp[] = [SAVE, translate(inset, inset)];

  for (const x of f.fx) if (!x.onHead && !x.inFront) paintFx(ops, x, ink, headFill, colors);

  ops.push(
    SAVE,
    translate(f.nudge[0] + f.face.nudge[0], f.nudge[1] + f.face.nudge[1]),
    translate(100, 100),
    rotate(f.tilt + f.face.tilt),
    scale(f.scale, f.scale),
    translate(-100, -100),
  );

  for (const x of f.fx) if (x.onHead && !x.inFront) paintFx(ops, x, ink, headFill, colors);

  ops.push(
    ...buildFaceOps(f.face, {
      fill: headFill,
      stroke: colors.stroke,
      ink,
      tongue: null,
      lookDx: 0,
      spiralRotation: f.spin,
    }),
  );
  ops.push(
    SAVE,
    translate(100, 100),
    scale(f.face.head.squashX, f.face.head.squashY),
    translate(-100, -100),
  );
  for (const x of f.fx) if (x.onHead && x.inFront) paintFx(ops, x, ink, headFill, colors);
  ops.push(RESTORE, RESTORE);

  for (const x of f.fx) if (!x.onHead && x.inFront) paintFx(ops, x, ink, headFill, colors);
  ops.push(RESTORE);
  return ops;
}

function line(a: Point, b: Point): PathShape {
  return new PathBuilder().moveTo(a).lineTo(b).build();
}

function dropPath(r: number, stretch = 1): PathShape {
  const tip: Point = [0, -r * 1.9 * stretch];
  return new PathBuilder()
    .moveTo(tip)
    .quadTo([r * 1.05, -r * 0.4], [r, r * 0.4])
    .arcToPoint([r, r * 0.4], [-r, r * 0.4], r)
    .quadTo([-r * 1.05, -r * 0.4], tip)
    .close()
    .build();
}

const steamCircles = spec.steamCircles;

function paintFx(
  ops: FaceOp[],
  fx: RingFx,
  ink: Color,
  headFill: Color,
  c: RingingColors,
): void {
  const alpha = Math.min(Math.max(fx.alpha, 0), 1);
  if (alpha <= 0 || fx.scale <= 0) return;
  const pen = withAlpha(ink, alpha);
  const a = (col: Color, k: number) => withAlpha(col, k);

  ops.push(SAVE, translate(fx.at[0], fx.at[1]), rotate(fx.rotation), scale(fx.scale, fx.scale));

  switch (fx.kind) {
    case "soundWaves":
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const p = mod(fx.phase + i / 3, 1);
          const r = 12 + p * 30;
          const arc = new PathBuilder().arc(
            [side * 84, 0],
            r,
            side < 0 ? Math.PI * 0.75 : -Math.PI * 0.25,
            Math.PI * 0.5,
          );
          ops.push(strokeOp(arc.build(), a(pen, 1 - p), 6));
        }
      }
      break;

    case "sweat":
    case "tear": {
      const colour = fx.kind === "sweat" ? colors.sweatBlue : colors.tearBlue;
      const drop = dropPath(9);
      ops.push(
        fillOp(drop, a(colour, alpha)),
        strokeOp(drop, pen, 3),
        fillOp(oval(-2.5, 3, 2.2, 2.2), a(colors.white, alpha)),
      );
      break;
    }

    case "drip": {
      const drop = dropPath(10, 1.6);
      ops.push(fillOp(drop, a(headFill, alpha)), strokeOp(drop, a(c.stroke, alpha), 4));
      break;
    }

    case "steam": {
      const cloud = circleUnionPath(steamCircles);
      ops.push(fillOp(cloud, a(colors.white, alpha * 0.95)), strokeOp(cloud, a(pen, 0.7), 3.5));
      break;
    }

    case "angerVein": {
      const vein = a(c.accent, alpha);
      const bend = new PathBuilder().moveTo([4, -16]).quadTo([4, -4], [16, -4]).build();
      for (let i = 0; i < 4; i++) {
        ops.push(SAVE, rotate((i * Math.PI) / 2), strokeOp(bend, vein, 6), RESTORE);
      }
      break;
    }

    case "question": {
      const path = new PathBuilder()
        .moveTo([-11, -12])
        .cubicTo([-11, -26], [12, -27], [12, -13])
        .cubicTo([12, -3], [0, -3], [0, 7]);
      ops.push(strokeOp(path.build(), pen, 7), fillOp(oval(0, 19, 4.5, 4.5), pen));
      break;
    }

    case "exclaim": {
      const bar = new PathBuilder()
        .moveTo([-7, -26])
        .lineTo([7, -26])
        .lineTo([3, 6])
        .lineTo([-3, 6])
        .close()
        .build();
      const dot = oval(0, 16, 5, 5);
      for (const part of [bar, dot] as OpShape[]) {
        ops.push(fillOp(part, a(c.accent, alpha)), strokeOp(part, pen, 3.5));
      }
      break;
    }

    case "star": {
      const star = new PathBuilder();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 13 : 5.5;
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        const p: Point = [r * Math.cos(ang), r * Math.sin(ang)];
        if (i === 0) star.moveTo(p);
        else star.lineTo(p);
      }
      star.close();
      const shape = star.build();
      ops.push(fillOp(shape, a(colors.starYellow, alpha)), strokeOp(shape, pen, 3));
      break;
    }

    case "bell": {
      const dome = new PathBuilder()
        .moveTo([-24, -6])
        .quadTo([-24, -36], [0, -36])
        .quadTo([24, -36], [24, -6])
        .close()
        .build();
      ops.push(
        strokeOp(line([0, 0], [0, 14]), pen, 7),
        fillOp(dome, a(colors.gold, alpha)),
        strokeOp(dome, pen, 5),
        fillOp(oval(0, -38, 4.5, 4.5), pen),
        strokeOp(line([-12, -26], [-8, -30]), a(colors.white, alpha * 0.9), 3.5),
      );
      break;
    }

    case "hammer": {
      const knob = oval(0, -44, 7, 7);
      ops.push(
        strokeOp(line([0, 0], [0, -40]), pen, 5),
        fillOp(knob, a(colors.gold, alpha)),
        strokeOp(knob, pen, 4),
      );
      break;
    }

    case "bolt": {
      const bolt = new PathBuilder()
        .moveTo([4, -24])
        .lineTo([-10, 2])
        .lineTo([0, 2])
        .lineTo([-6, 24])
        .lineTo([12, -6])
        .lineTo([2, -6])
        .lineTo([10, -24])
        .close()
        .build();
      ops.push(fillOp(bolt, a(colors.starYellow, alpha)), strokeOp(bolt, pen, 3.5));
      break;
    }

    case "siren": {
      const sweep = fx.phase * 2 * Math.PI;
      for (const offset of [0, Math.PI]) {
        const g = sweep + offset;
        const beam = new PathBuilder()
          .moveTo([0, -14])
          .lineTo([130 * Math.cos(g - 0.22), -14 + 130 * Math.sin(g - 0.22) * 0.45])
          .lineTo([130 * Math.cos(g + 0.22), -14 + 130 * Math.sin(g + 0.22) * 0.45])
          .close()
          .build();
        ops.push(fillOp(beam, a(c.accent, alpha * 0.28)));
      }
      const dome = new PathBuilder()
        .moveTo([-20, 0])
        .lineTo([-20, -14])
        .arcToPoint([-20, -14], [20, -14], 20)
        .lineTo([20, 0])
        .close()
        .build();
      const glow = 0.75 + 0.25 * Math.cos(sweep);
      ops.push(
        fillOp(rrect(-28, -2, 56, 14, 4), pen),
        fillOp(dome, a(c.accent, alpha * glow)),
        strokeOp(dome, pen, 4.5),
        strokeOp(line([-9, -18], [-9, -8]), a(colors.white, alpha * 0.9), 4),
      );
      break;
    }

    case "speedLines":
      for (const [dx, len] of [
        [-22, 18],
        [0, 28],
        [22, 18],
      ] as const) {
        ops.push(strokeOp(line([dx, 0], [dx, len]), a(pen, 0.8), 5));
      }
      break;

    case "teeth": {
      const [w, h] = fx.extent;
      const bend = fx.phase;
      const bent = (u: number) => bend * 4 * (u - 0.5) * (u - 0.5);
      const bite = new PathBuilder().moveTo([-w / 2 + 3, bent(0.05)]);
      for (let i = 1; i <= 10; i++) {
        const u = 0.05 + (0.9 * i) / 10;
        bite.lineTo([-w / 2 + w * u, bent(u)]);
      }
      ops.push(strokeOp(bite.build(), pen, 3.5));
      for (const u of [0.25, 0.5, 0.75]) {
        const x = -w / 2 + w * u;
        ops.push(strokeOp(line([x, -h / 2 + bent(u) + 2], [x, h / 2 + bent(u) - 2]), pen, 3.5));
      }
      break;
    }

    case "pulseRing":
      ops.push(strokeOp(rrect(-92, -92, 184, 184, 70), a(c.accent, alpha), 6));
      break;

    case "blush":
      for (const side of [-1, 1]) {
        ops.push(fillOp(oval(side * 48, 24, 12, 6.5), a(colors.blushPink, alpha)));
      }
      break;
  }
  ops.push(RESTORE);
}
