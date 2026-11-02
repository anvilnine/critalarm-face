/**
 * Where each ringing face is at moment `t` of its loop. A line by line port
 * of `dart/lib/src/ringing/ringing_choreography.dart` and the files in
 * `dart/lib/src/ringing/choreography/`.
 *
 * `t` runs 0 to 1 over one loop and wraps. The same style and `t` always
 * give the same frame.
 *
 * Each style, and the timing and part helpers they share, lives in its own
 * file under `choreography/`, with the same names as the Dart port's.
 *
 * @module
 */

import { frac } from "../math.js";
import type { RingingFrame, RingingStyleName } from "../types.js";
import { annoyed } from "./choreography/annoyed.js";
import { bellHead } from "./choreography/bell_head.js";
import { bouncing } from "./choreography/bouncing.js";
import { classic } from "./choreography/classic.js";
import { confused } from "./choreography/confused.js";
import { dizzy } from "./choreography/dizzy.js";
import { eyesPop } from "./choreography/eyes_pop.js";
import { hyperventilating } from "./choreography/hyperventilating.js";
import { meltdown } from "./choreography/meltdown.js";
import { panic } from "./choreography/panic.js";
import { rage } from "./choreography/rage.js";
import { scream } from "./choreography/scream.js";
import { siren } from "./choreography/siren.js";
import { sobbing } from "./choreography/sobbing.js";
import { spinOut } from "./choreography/spin_out.js";
import { startled } from "./choreography/startled.js";
import { terrified } from "./choreography/terrified.js";
import { zapped } from "./choreography/zapped.js";

/** The frame `style` shows at point `t` of its loop. `t` wraps. */
export function ringingFrameFor(style: RingingStyleName, t: number): RingingFrame {
  const at = frac(t);
  switch (style) {
    case "classic":
      return classic(at);
    case "panic":
      return panic(at);
    case "rage":
      return rage(at);
    case "confused":
      return confused(at);
    case "dizzy":
      return dizzy(at);
    case "sobbing":
      return sobbing(at);
    case "scream":
      return scream(at);
    case "bellHead":
      return bellHead(at);
    case "eyesPop":
      return eyesPop(at);
    case "annoyed":
      return annoyed(at);
    case "startled":
      return startled(at);
    case "hyperventilating":
      return hyperventilating(at);
    case "zapped":
      return zapped(at);
    case "bouncing":
      return bouncing(at);
    case "terrified":
      return terrified(at);
    case "siren":
      return siren(at);
    case "meltdown":
      return meltdown(at);
    case "spinOut":
      return spinOut(at);
    default:
      throw new RangeError(`Unknown ringing style: ${String(style)}`);
  }
}
