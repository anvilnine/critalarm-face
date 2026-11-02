/**
 * The `bellHead` ringing style. Alarm clock bells on top of the head, wincing
 * at every hit.
 *
 * @module
 */

import { add, frac, TAU } from "../../math.js";
import { faceShape, headShape, lerpMouth, ovalMouth } from "../../shape.js";
import type { Point, RingingFrame } from "../../types.js";
import { fadedFx, ringFx, ringingFrame } from "../frame.js";
import { alarmBrows, eye, gritMouth, inkMouth, teeth, teethMouth } from "./parts.js";
import { deg, wave } from "./timing.js";

export function bellHead(t: number): RingingFrame {
  const swing = wave(t, 2);
  const hit = Math.pow(Math.abs(swing), 6);
  const side = Math.sign(swing);
  const open = ovalMouth([100, 144], 16, 20);
  const grit = gritMouth([100, 144], 50, 16, 4);
  const [lb, rb] = alarmBrows(-4 * hit);
  const wince = (c: Point, struck: boolean) =>
    eye(c, {
      ball: 17,
      pupil: 6,
      hollow: true,
      width: 11,
      lid: hit * (struck ? 0.9 : 0.3),
      lidPoints: [add(c, [-14, 2]), c, add(c, [14, 2])],
    });
  return ringingFrame(
    faceShape({
      leftEye: wince([70, 96], side < 0),
      rightEye: wince([130, 96], side > 0),
      leftBrow: lb,
      rightBrow: rb,
      mouth: lerpMouth(inkMouth(open), teethMouth(grit), hit),
      head: headShape({ strokeWidth: 12 }),
    }),
    {
      tilt: -side * deg(5) * hit,
      nudge: [-side * 3 * hit, 3 * hit],
      fx: [
        ringFx("bell", {
          at: [56, 2],
          rotation: deg(-28) + (side < 0 ? deg(-10) * hit : 0),
          onHead: true,
          inFront: false,
        }),
        ringFx("bell", {
          at: [144, 2],
          rotation: deg(28) + (side > 0 ? deg(10) * hit : 0),
          onHead: true,
          inFront: false,
        }),
        ringFx("hammer", {
          at: [100, 14],
          rotation: deg(45) * swing,
          onHead: true,
          inFront: false,
        }),
        fadedFx(teeth([100, 144], 50, 16, 4), hit),
        ringFx("star", {
          at: [100 + side * 70, -26],
          scale: 0.9 * hit,
          alpha: hit,
          rotation: t * TAU,
        }),
        ringFx("soundWaves", { phase: frac(t * 2), alpha: 0.4 + 0.6 * hit }),
      ],
    },
  );
}
