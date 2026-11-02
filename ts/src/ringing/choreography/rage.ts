/**
 * The `rage` ringing style. Red in the face, teeth gritted, steam off both
 * sides.
 *
 * @module
 */

import { frac } from "../../math.js";
import { faceShape, headShape } from "../../shape.js";
import type { Point, RingFx, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { brows, eye, gritMouth, teeth, teethMouth } from "./parts.js";
import { pulse, seg, wave } from "./timing.js";

export function rage(t: number): RingingFrame {
  const throb = pulse(t, 4);
  const [lb, rb] = brows([46, 68], [66, 77], [88, 88], { by: [0, 2 * throb], width: 13 });
  const mouthAt: Point = [100, 147];
  const fx: RingFx[] = [
    teeth(mouthAt, 60, 20, 6),
    ringFx("angerVein", { at: [150, 42], scale: 0.75 + 0.35 * throb, onHead: true }),
  ];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const p = frac(t * 2 + i / 2 + (side > 0 ? 0.25 : 0));
      fx.push(
        ringFx("steam", {
          at: [100 + side * (86 + 34 * p), 52 - 44 * p],
          scale: 0.5 + 0.9 * p,
          alpha: (1 - p) * seg(p, 0, 0.1),
        }),
      );
    }
  }
  return ringingFrame(
    faceShape({
      leftEye: eye([70, 100], { ball: 15, squash: 0.72, pupil: 8, look: [4, 0] }),
      rightEye: eye([130, 100], { ball: 15, squash: 0.72, pupil: 8, look: [-4, 0] }),
      leftBrow: lb,
      rightBrow: rb,
      mouth: teethMouth(gritMouth(mouthAt, 60, 20, 6)),
      head: headShape({ strokeWidth: 13 }),
    }),
    {
      nudge: [wave(t, 14) * 2.2, wave(t, 11, 0.2) * 0.8],
      scale: 1 + 0.025 * throb,
      flush: 0.45 + 0.4 * throb,
      fx,
    },
  );
}
