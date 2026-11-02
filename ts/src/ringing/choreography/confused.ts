/**
 * The `confused` ringing style. Head rocking side to side under a stream of
 * question marks.
 *
 * @module
 */

import { add, frac, lerpPoints, TAU } from "../../math.js";
import { browShape, faceShape, mouthShape, sampleMouth } from "../../shape.js";
import type { Point, RingFx, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { eye } from "./parts.js";
import { deg, elastic, seg, wave } from "./timing.js";

export function confused(t: number): RingingFrame {
  const sway = wave(t, 1);
  const k = 0.5 + 0.5 * sway;
  const leftHigh: Point[] = [
    [48, 64],
    [66, 50],
    [86, 58],
  ];
  const leftLow: Point[] = [
    [50, 72],
    [68, 72],
    [86, 74],
  ];
  const rightHigh: Point[] = [
    [114, 58],
    [134, 50],
    [152, 64],
  ];
  const rightLow: Point[] = [
    [114, 74],
    [132, 72],
    [150, 72],
  ];
  const look: Point = [sway * 5, -6];
  const spots: Point[] = [
    [34, 0],
    [166, -6],
    [100, -26],
  ];
  const fx: RingFx[] = [];
  for (let i = 0; i < 3; i++) {
    const p = frac(t + i / 3);
    fx.push(
      ringFx("question", {
        at: add(spots[i] as Point, [0, -12 * p]),
        scale: elastic(seg(p, 0, 0.3)) * (1 - seg(p, 0.8, 1)),
        rotation: deg(14) * Math.sin(TAU * (t * 2 + i / 3)),
      }),
    );
  }
  return ringingFrame(
    faceShape({
      leftEye: eye([68, 96], { ball: 16 + 5 * k, pupil: 7 + 2 * k, shine: 3, look }),
      rightEye: eye([132, 97], { ball: 21 - 5 * k, pupil: 9 - 2 * k, shine: 3, look }),
      leftBrow: browShape(lerpPoints(leftLow, leftHigh, k)),
      rightBrow: browShape(lerpPoints(rightHigh, rightLow, k)),
      mouth: mouthShape(
        sampleMouth((u) => [
          80 + 42 * u,
          143 + 5 * Math.sin(TAU * (1.5 * u + t)) + 8 * (u - 0.5) * sway,
        ]),
      ),
    }),
    { tilt: deg(12) * sway, nudge: [sway * 6, 0], fx },
  );
}
