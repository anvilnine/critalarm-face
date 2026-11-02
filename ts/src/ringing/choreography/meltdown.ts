/**
 * The `meltdown` ringing style. Melting into a puddle of drips, then snapping
 * back.
 *
 * @module
 */

import { easeInOutPoly } from "../../easing.js";
import { clamp, frac } from "../../math.js";
import { faceShape, headShape, mouthShape } from "../../shape.js";
import type { Point, RingFx, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { brows, eye, wavyLine } from "./parts.js";
import { deg, elastic, seg, wave } from "./timing.js";

export function meltdown(t: number): RingingFrame {
  const down = easeInOutPoly(seg(t, 0.05, 0.6));
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
