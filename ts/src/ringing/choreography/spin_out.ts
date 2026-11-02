/**
 * The `spinOut` ringing style. A full spin, then wobbling to a stop with
 * swirling eyes.
 *
 * @module
 */

import { easeInOutPoly } from "../../easing.js";
import { TAU } from "../../math.js";
import { faceShape, headShape } from "../../shape.js";
import type { Point, RingFx, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { alarmBrows, eye, inkMouth, wavyOpen } from "./parts.js";
import { bump, deg, seg } from "./timing.js";

export function spinOut(t: number): RingingFrame {
  const spinP = easeInOutPoly(seg(t, 0, 0.45));
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
