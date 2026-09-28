/**
 * A ringing face that shows one style for a while, then blends into another
 * random one, for as long as it runs. A port of the Dart
 * `ShufflingRingingFace` timing, driven by whatever clock you give it.
 *
 * @module
 */

import { ringingStyleInfo, ringingStyles, spec } from "../data.js";
import { easeInOut } from "../easing.js";
import { clamp } from "../math.js";
import { SeededRandom, randomSource, type RandomSource } from "../random.js";
import type { RingingFrame, RingingStyleName } from "../types.js";
import { ringingFrameFor } from "./choreography.js";
import { lerpRingingFrame, nextRingingStyle } from "./frame.js";

/**
 * Shuffles through the ringing styles. Call {@link RingingShuffle.frameAt}
 * with a clock that only moves forward (one call per animation frame, or per
 * video frame) and draw the frame it returns.
 */
export class RingingShuffle {
  readonly #random: RandomSource;
  #style: RingingStyleName;
  #styleStart = 0;
  #next: RingingStyleName | null = null;
  #nextStart = 0;

  /** A shuffle seeded with `seed`, or a random one when left out. */
  constructor(seed?: number | RandomSource) {
    this.#random =
      seed === undefined ? randomSource() : typeof seed === "number" ? new SeededRandom(seed) : seed;
    this.#style = ringingStyles[this.#random.nextInt(ringingStyles.length)] as RingingStyleName;
  }

  /** The style showing, or the one being left while a blend runs. */
  get style(): RingingStyleName {
    return this.#style;
  }

  /** The frame to draw `elapsedMs` after the shuffle started. */
  frameAt(elapsedMs: number): RingingFrame {
    const { ringingHold, ringingBlend } = spec.motion.durationsMs;
    const next = this.#next;
    if (next === null) {
      if (elapsedMs - this.#styleStart >= ringingHold) {
        this.#next = nextRingingStyle(this.#style, this.#random);
        this.#nextStart = elapsedMs;
      }
    } else if (elapsedMs - this.#nextStart >= ringingBlend) {
      this.#style = next;
      this.#styleStart = this.#nextStart;
      this.#next = null;
    }

    const at = (style: RingingStyleName, start: number) =>
      ringingFrameFor(style, ((elapsedMs - start) / ringingStyleInfo(style).periodMs) % 1);
    const current = at(this.#style, this.#styleStart);
    if (this.#next === null) return current;
    const progress = clamp((elapsedMs - this.#nextStart) / ringingBlend, 0, 1);
    return lerpRingingFrame(current, at(this.#next, this.#nextStart), easeInOut(progress));
  }

  /** The still frame to show when motion is off. */
  stillFrame(): RingingFrame {
    return ringingFrameFor(this.#style, ringingStyleInfo(this.#style).stillT);
  }
}
