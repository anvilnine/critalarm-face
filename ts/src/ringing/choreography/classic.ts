/**
 * The `classic` ringing style. The alarm face as it has always been, with a
 * proper shout and shake.
 *
 * @module
 */

import { frac } from "../../math.js";
import { faceShape, headShape, ovalMouth } from "../../shape.js";
import type { Point, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { alarmBrows, eye, inkMouth } from "./parts.js";
import { deg, pulse, wave } from "./timing.js";

export function classic(t: number): RingingFrame {
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
