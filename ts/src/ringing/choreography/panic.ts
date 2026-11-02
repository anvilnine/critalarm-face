/**
 * The `panic` ringing style. Pupils darting, sweat flying, a wobbling scream.
 *
 * @module
 */

import { frac } from "../../math.js";
import { faceShape, headShape } from "../../shape.js";
import type { Point, RingFx, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { eye, flung, inkMouth, wavyOpen, worriedBrows } from "./parts.js";
import { deg, pulse, snap, wave } from "./timing.js";

export function panic(t: number): RingingFrame {
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
