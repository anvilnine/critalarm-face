/**
 * The `siren` ringing style. A siren on its head and a mouth going wee-oo.
 *
 * @module
 */

import { frac } from "../../math.js";
import { faceShape, headShape, lerpMouth, ovalMouth } from "../../shape.js";
import type { Point, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { brows, eye, inkMouth } from "./parts.js";
import { pulse } from "./timing.js";

export function siren(t: number): RingingFrame {
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
