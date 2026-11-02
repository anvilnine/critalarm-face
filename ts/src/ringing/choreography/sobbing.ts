/**
 * The `sobbing` ringing style. Wailing, with tears arcing out of both eyes.
 *
 * @module
 */

import { frac } from "../../math.js";
import { faceShape, headShape, lipsMouth, quadAt } from "../../shape.js";
import type { RingFx, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { eye, flung, inkMouth, worriedBrows } from "./parts.js";
import { pulse, seg } from "./timing.js";

export function sobbing(t: number): RingingFrame {
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
