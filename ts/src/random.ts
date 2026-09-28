/**
 * The shared random number generator (mulberry32), so a seed gives the same
 * run in Dart, TypeScript and any other port.
 *
 * @module
 */

/** Anything that can hand out whole numbers below a limit. */
export interface RandomSource {
  /** A whole number from 0 up to but not including `max`. */
  nextInt(max: number): number;
}

/** mulberry32. See "Randomness" in `spec/SPEC.md`. */
export class SeededRandom implements RandomSource {
  #state: number;

  /** A generator starting from `seed`. Only the low 32 bits are used. */
  constructor(seed: number) {
    this.#state = seed >>> 0;
  }

  /** The next raw value, a whole number from 0 to 2^32 - 1. */
  nextUint32(): number {
    this.#state = (this.#state + 0x6d2b79f5) >>> 0;
    const s = this.#state;
    let t = Math.imul(s ^ (s >>> 15), s | 1) >>> 0;
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** A number from 0 up to but not including 1. */
  nextDouble(): number {
    return this.nextUint32() / 4294967296;
  }

  /** A whole number from 0 up to but not including `max`. */
  nextInt(max: number): number {
    if (!(max > 0)) throw new RangeError(`max must be above 0, got ${max}`);
    return Math.floor(this.nextDouble() * max);
  }
}

/** A generator seeded from `Math.random`, for when no seed is given. */
export function randomSource(): SeededRandom {
  return new SeededRandom(Math.floor(Math.random() * 4294967296));
}
