/**
 * The `eyesPop` ringing style. Eyes boinging out of the head and the jaw
 * hitting the floor.
 *
 * @module
 */

import { easeInOutPoly } from "../../easing.js";
import { clamp } from "../../math.js";
import { faceShape, headShape, ovalMouth } from "../../shape.js";
import type { Point, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { brows, eye, inkMouth, prop } from "./parts.js";
import { bump, deg, elastic, seg, wave } from "./timing.js";

export function eyesPop(t: number): RingingFrame {
  const pop = elastic(seg(t, 0.06, 0.4)) * (1 - easeInOutPoly(seg(t, 0.72, 0.94)));
  const brace = bump(seg(t, 0, 0.06));
  const [lb, rb] = brows([52, 70], [68, 64], [84, 68], {
    by: [0, -28 * pop + 4 * brace],
    alpha: 1 - 0.3 * clamp(pop, 0, 1),
  });
  const e = (c: Point) =>
    eye(c, { ball: 16 + 16 * pop, pupil: Math.max(3, 9 - 5 * pop), shine: 3, width: 9 });
  return ringingFrame(
    faceShape({
      leftEye: e([70 - 8 * pop, 94 - 8 * pop]),
      rightEye: e([130 + 8 * pop, 94 - 8 * pop]),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(
        ovalMouth([100, 142 + 20 * pop], 12 + 7 * pop, Math.max(4, 5 + 30 * pop)),
        10,
      ),
      head: headShape({
        squashX: 1 - 0.05 * pop - 0.03 * brace,
        squashY: 1 + 0.12 * pop - 0.05 * brace,
      }),
      props: [prop("popLines", [100, 100], clamp(pop, 0, 1.2), clamp(pop, 0, 1))],
    }),
    {
      tilt: deg(3) * wave(t, 6) * pop,
      fx: [
        ringFx("exclaim", {
          at: [100, -34],
          scale: clamp(pop, 0, 1.3),
          alpha: clamp(pop, 0, 1),
        }),
      ],
    },
  );
}
