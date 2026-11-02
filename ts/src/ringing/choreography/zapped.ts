/**
 * The `zapped` ringing style. Flickering between light and dark with bolts all
 * around, then smoking.
 *
 * @module
 */

import { frac, mul, TAU } from "../../math.js";
import { faceShape, headShape, lerpFace, mouthShape } from "../../shape.js";
import type { Point, RingFx, RingingFrame } from "../../types.js";
import { fadedFx, ringFx, ringingFrame } from "../frame.js";
import { brow, eye, gritMouth, teeth, teethMouth, wavyLine } from "./parts.js";
import { deg, pulse, seg, wave } from "./timing.js";

export function zapped(t: number): RingingFrame {
  const zap = seg(t, 0, 0.04) * (1 - seg(t, 0.52, 0.6));
  const flicker = wave(t, 18) > 0 ? 1 : 0;
  const jolt = mul([wave(t, 23) * 3, wave(t, 19, 0.3) * 3], zap);
  const mouthAt: Point = [100, 146];

  const shocked = faceShape({
    leftEye: eye([68, 94], { ball: 22, pupil: 3, width: 9, look: mul(jolt, 0.6) }),
    rightEye: eye([132, 94], { ball: 22, pupil: 3, width: 9, look: mul(jolt, 0.6) }),
    leftBrow: brow([46, 58], [66, 46], [88, 56]),
    rightBrow: brow([112, 56], [134, 46], [154, 58]),
    mouth: teethMouth(gritMouth(mouthAt, 66, 22, -5)),
    head: headShape({ strokeWidth: 13 }),
  });
  const dazed = faceShape({
    leftEye: eye([70, 96], { ball: 15, squash: 0.6, pupil: 7, look: [5, 1] }),
    rightEye: eye([130, 96], { ball: 15, squash: 0.6, pupil: 7, look: [-5, -1] }),
    leftBrow: brow([54, 78], [70, 76], [86, 78]),
    rightBrow: brow([114, 78], [130, 76], [146, 78]),
    mouth: mouthShape(wavyLine([100, 144], 44, 4, t * 2)),
  });
  const bolts: [Point, number][] = [
    [[14, 30], -0.5],
    [[186, 24], 0.6],
    [[4, 150], -2.2],
    [[196, 146], 2.4],
    [[100, -22], 0.1],
  ];
  const fx: RingFx[] = [fadedFx(teeth(mouthAt, 66, 22, -5), zap)];
  bolts.forEach(([at, rotation], i) => {
    fx.push(
      ringFx("bolt", {
        at,
        rotation,
        scale: 0.9 + 0.2 * pulse(t, 7, i / 5),
        alpha: zap * (wave(t, 12, i / 5) > -0.2 ? 1 : 0),
      }),
    );
  });
  for (let i = 0; i < 3; i++) {
    const p = frac(t * 2 + i / 3);
    fx.push(
      ringFx("steam", {
        at: [70 + i * 30 + 10 * Math.sin(TAU * p), 8 - 40 * p],
        scale: 0.5 + 0.7 * p,
        alpha: (1 - zap) * (1 - p) * seg(p, 0, 0.15) * 0.9,
      }),
    );
  }
  return ringingFrame(lerpFace(dazed, shocked, zap), {
    nudge: jolt,
    tilt: deg(3) * wave(t, 13) * zap,
    flash: 0.9 * flicker * zap,
    fx,
  });
}
