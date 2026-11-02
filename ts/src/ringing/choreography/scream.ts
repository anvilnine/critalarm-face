/**
 * The `scream` ringing style. Stretched tall, pinprick pupils, mouth wide open.
 *
 * @module
 */

import { frac, mul } from "../../math.js";
import { faceShape, headShape, ovalMouth } from "../../shape.js";
import type { Point, RingFx, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { brows, eye, inkMouth } from "./parts.js";
import { deg, pulse, seg, wave } from "./timing.js";

export function scream(t: number): RingingFrame {
  const shriek = pulse(t, 2);
  const tremble: Point = [wave(t, 16) * 1.6, wave(t, 13, 0.3) * 1.2];
  const [lb, rb] = brows([48, 56], [68, 44], [88, 52], { by: [0, -3 * shriek] });
  const e = (c: Point) => eye(c, { ball: 22, pupil: 3.5, width: 9, look: mul(tremble, 0.8) });
  const fx: RingFx[] = [];
  for (let i = 0; i < 2; i++) {
    const p = frac(t * 2 + i / 2);
    fx.push(
      ringFx("pulseRing", {
        scale: 1 + 0.45 * p,
        alpha: (1 - p) * seg(p, 0, 0.15) * 0.6,
        inFront: false,
      }),
    );
  }
  fx.push(
    ringFx("soundWaves", { phase: frac(t * 3) }),
    ringFx("exclaim", { at: [154, -12], scale: 0.8 + 0.2 * shriek, rotation: deg(12) }),
    ringFx("exclaim", { at: [178, 2], scale: 0.7 + 0.2 * (1 - shriek), rotation: deg(24) }),
  );
  return ringingFrame(
    faceShape({
      leftEye: e([70, 88]),
      rightEye: e([130, 88]),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(ovalMouth([100, 147], 16 + 2 * shriek, 28 + 6 * shriek), 10),
      head: headShape({ squashX: 0.9, squashY: 1.1 + 0.03 * shriek, strokeWidth: 12 }),
    }),
    { tilt: deg(1.5) * wave(t, 10), nudge: tremble, fx },
  );
}
