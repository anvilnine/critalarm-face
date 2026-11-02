/**
 * The `dizzy` ringing style. Swirl eyes and stars circling a wobbling head.
 *
 * @module
 */

import { TAU } from "../../math.js";
import { faceShape, mouthShape } from "../../shape.js";
import type { RingFx, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { eye, wavyOpen, worriedBrows } from "./parts.js";
import { deg, wave } from "./timing.js";

export function dizzy(t: number): RingingFrame {
  const [lb, rb] = worriedBrows(-4 + 3 * wave(t, 2), 10);
  const fx: RingFx[] = [];
  for (let i = 0; i < 3; i++) {
    const a = TAU * (t * 2 + i / 3);
    fx.push(
      ringFx("star", {
        at: [100 + 76 * Math.cos(a), 6 + 16 * Math.sin(a)],
        scale: 0.75 + 0.25 * Math.sin(a),
        rotation: a * 2,
        inFront: Math.sin(a) > 0,
        onHead: true,
      }),
    );
  }
  return ringingFrame(
    faceShape({
      leftEye: eye([70, 94], { pupil: 17, spiral: 1 }),
      rightEye: eye([130, 94], { pupil: 17, spiral: 1 }),
      leftBrow: lb,
      rightBrow: rb,
      mouth: mouthShape(wavyOpen([100, 146], 50, 12, 3.5, t * 2, 1.5), {
        width: 9,
        fill: 1,
      }),
    }),
    {
      spin: -TAU * t * 2,
      tilt: deg(9) * wave(t, 1, 0.25),
      nudge: [Math.cos(TAU * t) * 7, Math.sin(TAU * t) * 4],
      fx,
    },
  );
}
