/**
 * The `terrified` ringing style. Shrunk down, shaking, teeth chattering.
 *
 * @module
 */

import { add, frac, mul } from "../../math.js";
import { faceShape } from "../../shape.js";
import type { Point, RingFx, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { brows, eye, gritMouth, teeth, teethMouth } from "./parts.js";
import { deg, pulse, seg, snap, wave } from "./timing.js";

export function terrified(t: number): RingingFrame {
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
