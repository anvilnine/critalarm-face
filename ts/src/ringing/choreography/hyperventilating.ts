/**
 * The `hyperventilating` ringing style. Short fast breaths, cheeks puffing in
 * and out.
 *
 * @module
 */

import { frac } from "../../math.js";
import { faceShape, headShape, lerpMouth, ovalMouth } from "../../shape.js";
import type { Point, RingFx, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { eye, inkMouth, prop, worriedBrows } from "./parts.js";
import { pulse, seg, wave } from "./timing.js";

export function hyperventilating(t: number): RingingFrame {
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
