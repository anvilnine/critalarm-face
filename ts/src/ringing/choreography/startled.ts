/**
 * The `startled` ringing style. Dozing, then launched off the ground by the
 * ring.
 *
 * @module
 */

import { faceFor } from "../../data.js";
import { easeInOutPoly } from "../../easing.js";
import { frac } from "../../math.js";
import { headShape, lerpFace } from "../../shape.js";
import type { RingFx, RingingFrame } from "../../types.js";
import { ringFx, ringingFrame } from "../frame.js";
import { prop, withParts } from "./parts.js";
import { bump, deg, elastic, pulse, seg, wave } from "./timing.js";

export function startled(t: number): RingingFrame {
  const awake = easeInOutPoly(seg(t, 0.4, 0.45)) * (1 - easeInOutPoly(seg(t, 0.8, 0.98)));
  const air = seg(t, 0.42, 0.72);
  const height = 4 * air * (1 - air);
  const land = bump(seg(t, 0.72, 0.8));
  const breathe = wave(t, 2) * (1 - awake);
  const squashY = 1 - 0.12 * land + 0.06 * height + 0.015 * breathe;
  const blended = lerpFace(faceFor("dozing"), faceFor("shocked"), awake);
  const zzz = prop(
    "zzz",
    [150 + 4 * wave(t, 2), 34 - 6 * pulse(t, 2)],
    (1 - awake) * (0.9 + 0.1 * pulse(t, 2)),
    1 - awake,
  );
  const fx: RingFx[] = [
    ringFx("exclaim", {
      at: [100, -30],
      scale: elastic(seg(t, 0.44, 0.56)) * 1.1 * (1 - seg(t, 0.72, 0.8)),
      alpha: seg(t, 0.44, 0.46) * (1 - seg(t, 0.72, 0.8)),
      onHead: true,
    }),
    ringFx("speedLines", {
      at: [100, 214 - 48 * height],
      alpha: seg(t, 0.43, 0.47) * (1 - seg(t, 0.52, 0.57)),
    }),
    ringFx("soundWaves", { phase: frac(t * 4), alpha: awake }),
  ];
  for (const side of [-1, 1]) {
    fx.push(
      ringFx("steam", {
        at: [100 + side * (70 + 26 * land), 188],
        scale: 0.4 + 0.4 * land,
        alpha: land,
      }),
    );
  }
  return ringingFrame(
    withParts(blended, {
      head: headShape({
        squashX: 1 + 0.1 * land - 0.03 * height,
        squashY,
        strokeWidth: 10 + 2 * awake,
      }),
      props: [zzz],
    }),
    {
      tilt: deg(4) * wave(t, 20) * height + 0.06 * (1 - awake),
      nudge: [0, -48 * height + 88 * (1 - squashY)],
      fx,
    },
  );
}
