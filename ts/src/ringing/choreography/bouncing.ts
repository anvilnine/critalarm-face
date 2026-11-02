/**
 * The `bouncing` ringing style. Bouncing off the floor, squashing on every
 * landing.
 *
 * @module
 */

import { clamp } from "../../math.js";
import { faceShape, headShape, ovalMouth } from "../../shape.js";
import type { Point, RingFx, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { alarmBrows, eye, inkMouth } from "./parts.js";
import { deg, seg, wave } from "./timing.js";

export function bouncing(t: number): RingingFrame {
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
