/**
 * The `annoyed` ringing style. Heavy lids, a long eye roll and a sigh.
 *
 * @module
 */

import { easeInOutPoly } from "../../easing.js";
import { frac, mul } from "../../math.js";
import {
  faceShape,
  headShape,
  lerpBrow,
  lerpMouth,
  lineMouth,
  mouthShape,
  ovalMouth,
} from "../../shape.js";
import type { Point, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { brow, brows, eye, inkMouth, prop } from "./parts.js";
import { bump, deg, seg } from "./timing.js";

export function annoyed(t: number): RingingFrame {
  const env = bump(seg(t, 0.08, 0.62));
  const a = Math.PI + Math.PI * easeInOutPoly(seg(t, 0.12, 0.56));
  const look = mul([Math.cos(a), Math.sin(a)], 9 * env);
  const sigh = bump(seg(t, 0.6, 0.94));
  const [lb, rb] = brows([52, 82], [70, 81], [88, 83], { width: 12 });
  const e = (c: Point) => eye(c, { ball: 17, squash: 0.55, pupil: 8, look });
  return ringingFrame(
    faceShape({
      leftEye: e([70, 98]),
      rightEye: e([130, 98]),
      leftBrow: lb,
      rightBrow: lerpBrow(rb, brow([112, 70], [130, 62], [148, 68], { width: 12 }), env),
      mouth: lerpMouth(
        mouthShape(lineMouth([84, 142], [118, 138])),
        inkMouth(ovalMouth([110, 142], 7, 6), 9),
        sigh,
      ),
      head: headShape({ squashY: 1 - 0.04 * sigh, squashX: 1 + 0.02 * sigh }),
      props: [prop("puff", [144 + 22 * seg(t, 0.6, 0.94), 150], sigh * 1.2, sigh)],
    }),
    {
      tilt: -deg(7) * env,
      nudge: [0, -2 * env + 3 * sigh],
      fx: [ringFx("soundWaves", { phase: frac(t * 3), alpha: 0.45 })],
    },
  );
}
