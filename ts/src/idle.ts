/**
 * The idle face: calm, with a small expression every few seconds, nodding
 * off after a while untouched. See "Idle face" in `spec/SPEC.md`.
 *
 * Three pieces:
 *
 * - {@link IdleFaceController} runs the loop on real timers (or an injected
 *   delay) and reports each phase change. A port of the Dart controller.
 * - {@link idleTimeline} plays the same loop through in no time and returns
 *   every phase change with its time, for video frames and tests.
 * - {@link IdleFaceTracker} turns phase changes into the face to draw at any
 *   moment, blending the way the Dart `IdleFace` widget does.
 *
 * @module
 */

import { faceFor, spec } from "./data.js";
import { easeInOutCubic } from "./easing.js";
import { clamp } from "./math.js";
import { randomSource, SeededRandom, type RandomSource } from "./random.js";
import { lerpFace } from "./shape.js";
import type { FaceShape, FaceState, IdleBeat } from "./types.js";

const idle = spec.idle;

/** Where the idle face is inside one beat. */
export type IdlePhase = "resting" | "entering" | "holding" | "leaving" | "dozing";

/** One phase change. */
export interface IdleEvent {
  /** The new phase. */
  readonly phase: IdlePhase;
  /** The face this beat shows. Calm between beats. */
  readonly beat: FaceState;
  /** How long the blend into (or out of) `beat` takes. */
  readonly blendMs: number;
}

/** A phase change at a moment on the timeline. */
export interface TimedIdleEvent extends IdleEvent {
  /** Milliseconds from the start. */
  readonly atMs: number;
}

type Step = { readonly set: IdleEvent } | { readonly wait: number };

/** True when `hour` (0 to 23) counts as night for the idle face. */
export function isNightHour(hour: number): boolean {
  return hour < idle.dayStarts || hour >= idle.dayEnds;
}

function* playBeat(b: IdleBeat): Generator<Step> {
  yield { set: { phase: "entering", beat: b.face, blendMs: b.enterMs } };
  yield { wait: b.enterMs };
  yield { set: { phase: "holding", beat: b.face, blendMs: b.enterMs } };
  yield { wait: b.holdMs };
  let last = b;
  const n = b.thenPlay;
  if (n !== null) {
    yield { set: { phase: "entering", beat: n.face, blendMs: n.enterMs } };
    yield { wait: n.enterMs };
    yield { set: { phase: "holding", beat: n.face, blendMs: n.enterMs } };
    yield { wait: n.holdMs };
    last = n;
  }
  yield { set: { phase: "leaving", beat: last.face, blendMs: last.leaveMs } };
  yield { wait: last.leaveMs };
  yield { set: { phase: "resting", beat: "calm", blendMs: last.leaveMs } };
}

function* nodOff(): Generator<Step> {
  const n = idle.nodOff;
  yield { set: { phase: "entering", beat: "sleepy", blendMs: n.sleepyEnterMs } };
  yield { wait: n.sleepyEnterMs };
  yield { set: { phase: "holding", beat: "sleepy", blendMs: n.sleepyEnterMs } };
  yield { wait: n.sleepyHoldMs };
  yield { set: { phase: "entering", beat: "dozing", blendMs: n.dozingEnterMs } };
  yield { wait: n.dozingEnterMs };
  yield { set: { phase: "dozing", beat: "dozing", blendMs: n.dozingEnterMs } };
}

function pick(random: RandomSource, night: boolean): IdleBeat {
  const weight = (b: IdleBeat) =>
    b.weight + (night && idle.tiredFaces.includes(b.face) ? idle.nightLift : 0);
  let total = 0;
  for (const b of idle.beats) total += weight(b);
  let roll = random.nextInt(total);
  for (const b of idle.beats) {
    roll -= weight(b);
    if (roll < 0) return b;
  }
  return idle.beats[0] as IdleBeat;
}

/** The loop: wait, play a beat, repeat, until it nods off. */
function* loop(random: RandomSource, isNight: () => boolean): Generator<Step> {
  let awake = 0;
  for (;;) {
    const gap = idle.minGapMs + random.nextInt(idle.maxGapMs - idle.minGapMs + 1);
    yield { wait: gap };
    awake += gap;
    if (awake >= (isNight() ? idle.dozeAfterAtNightMs : idle.dozeAfterMs)) {
      yield* nodOff();
      return;
    }
    yield* playBeat(pick(random, isNight()));
  }
}

function* wakeThenLoop(random: RandomSource, isNight: () => boolean): Generator<Step> {
  yield* playBeat(idle.waking);
  yield* loop(random, isNight);
}

// ---------------------------------------------------------------------------
// The live controller.
// ---------------------------------------------------------------------------

/** Options for {@link IdleFaceController}. */
export interface IdleControllerOptions {
  /** A seed for the beats. Ignored when `random` is given. */
  readonly seed?: number;
  /** Where the randomness comes from. Default: a random seed. */
  readonly random?: RandomSource;
  /** Replaces the real timer. Handy for tests and playing a run through. */
  readonly delay?: (ms: number) => Promise<void>;
  /** The clock that decides whether it is night. Default: the real one. */
  readonly now?: () => Date;
}

/**
 * Runs the small things the face does while nothing is wrong: wait, do
 * something, go back to calm, wait again. After a while it nods off and
 * stays asleep until {@link IdleFaceController.wake} is called.
 *
 * It draws nothing. Listen with {@link IdleFaceController.onChange} and feed
 * the events to an {@link IdleFaceTracker}, or use `mountIdleFace`.
 */
export class IdleFaceController {
  readonly #random: RandomSource;
  readonly #delay: ((ms: number) => Promise<void>) | undefined;
  readonly #now: () => Date;
  readonly #listeners = new Set<(event: IdleEvent) => void>();
  #timer: ReturnType<typeof setTimeout> | undefined;
  #release: (() => void) | undefined;
  #run = 0;
  #running = false;
  #disposed = false;
  #event: IdleEvent = { phase: "resting", beat: "calm", blendMs: 0 };

  /** A controller that has not started yet. */
  constructor(options: IdleControllerOptions = {}) {
    this.#random =
      options.random ??
      (options.seed === undefined ? randomSource() : new SeededRandom(options.seed));
    this.#delay = options.delay;
    this.#now = options.now ?? (() => new Date());
  }

  /** Where the beat is. */
  get phase(): IdlePhase {
    return this.#event.phase;
  }

  /** The face this beat shows. Calm between beats. */
  get beat(): FaceState {
    return this.#event.beat;
  }

  /** How long the current beat's blend runs for. */
  get blendMs(): number {
    return this.#event.blendMs;
  }

  /** True while the loop is running. */
  get isRunning(): boolean {
    return this.#running;
  }

  /** True when {@link IdleFaceController.wake} would wake it. */
  get isDozing(): boolean {
    return this.#event.phase === "dozing";
  }

  /** True when the clock says it is late enough to act tired. */
  get isNight(): boolean {
    return isNightHour(this.#now().getHours());
  }

  /** Calls `listener` on every phase change. Returns a function that stops it. */
  onChange(listener: (event: IdleEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** Starts the loop. Does nothing when it is already running. */
  async start(): Promise<void> {
    if (this.#running || this.#disposed) return;
    this.#running = true;
    await this.#drive(loop(this.#random, () => this.isNight), ++this.#run);
  }

  /** Wakes a dozing face and picks the loop back up. Does nothing otherwise. */
  async wake(): Promise<void> {
    if (this.#event.phase !== "dozing") return;
    const run = this.#run;
    this.#stopWaiting();
    await this.#drive(wakeThenLoop(this.#random, () => this.isNight), run);
  }

  /** Stops the loop and settles back on calm. Nothing is left waiting. */
  stop(): void {
    if (!this.#running && this.#event.phase === "resting") return;
    this.#running = false;
    this.#run++;
    this.#stopWaiting();
    const wasResting = this.#event.phase === "resting";
    this.#event = { phase: "resting", beat: "calm", blendMs: this.#event.blendMs };
    if (!wasResting && !this.#disposed) this.#notify();
  }

  /** Stops for good and drops every listener. */
  dispose(): void {
    this.#running = false;
    this.#disposed = true;
    this.#run++;
    this.#stopWaiting();
    this.#listeners.clear();
  }

  async #drive(steps: Generator<Step>, run: number): Promise<void> {
    for (const step of steps) {
      if (!this.#keepGoing(run)) return;
      if ("wait" in step) {
        await this.#wait(step.wait);
      } else {
        this.#event = step.set;
        this.#notify();
      }
    }
  }

  #keepGoing(run: number): boolean {
    return this.#running && !this.#disposed && run === this.#run;
  }

  #notify(): void {
    for (const listener of [...this.#listeners]) listener(this.#event);
  }

  #wait(ms: number): Promise<void> {
    if (this.#delay !== undefined) return this.#delay(ms);
    return new Promise<void>((resolve) => {
      this.#release = resolve;
      this.#timer = setTimeout(() => {
        this.#timer = undefined;
        this.#release = undefined;
        resolve();
      }, ms);
    });
  }

  #stopWaiting(): void {
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
    const release = this.#release;
    this.#release = undefined;
    release?.();
  }
}

// ---------------------------------------------------------------------------
// A whole run, worked out ahead.
// ---------------------------------------------------------------------------

/** Options for {@link idleTimeline}. */
export interface IdleTimelineOptions {
  /** A seed for the beats. Ignored when `random` is given. Default 1. */
  readonly seed?: number;
  /** Where the randomness comes from. */
  readonly random?: RandomSource;
  /** Whether it is night, which makes the face sleepier. Default false. */
  readonly night?: boolean;
  /** Stop once the timeline reaches this many milliseconds. Default 60000. */
  readonly durationMs?: number;
  /**
   * When the face nods off, tap it awake after this many milliseconds and
   * carry on. Leave it out to let it sleep through to the end.
   */
  readonly wakeAfterMs?: number;
}

/**
 * Plays the idle loop through with a virtual clock and returns every phase
 * change with its time. The same seed gives the same timeline as the Dart
 * controller. Feed it to an {@link IdleFaceTracker} to get the face at any
 * frame of a video.
 */
export function idleTimeline(options: IdleTimelineOptions = {}): TimedIdleEvent[] {
  const random = options.random ?? new SeededRandom(options.seed ?? 1);
  const night = options.night ?? false;
  const duration = options.durationMs ?? 60000;
  const events: TimedIdleEvent[] = [];
  let at = 0;
  let steps: Generator<Step> = loop(random, () => night);
  for (;;) {
    for (const step of steps) {
      if (at > duration) return events;
      if ("wait" in step) at += step.wait;
      else events.push({ ...step.set, atMs: at });
    }
    if (options.wakeAfterMs === undefined) return events;
    at += options.wakeAfterMs;
    if (at > duration) return events;
    steps = wakeThenLoop(random, () => night);
  }
}

// ---------------------------------------------------------------------------
// From phase changes to a face.
// ---------------------------------------------------------------------------

/**
 * Turns idle phase changes into the face to draw. Call
 * {@link IdleFaceTracker.update} on every change with the time it happened,
 * then {@link IdleFaceTracker.shapeAt} for each frame.
 *
 * Entering blends from whatever was showing into the beat, holding and
 * dozing show the beat, leaving blends back to calm, all on the idle easing
 * curve.
 */
export class IdleFaceTracker {
  #phase: IdlePhase = "resting";
  #from: FaceShape = faceFor("calm");
  #beat: FaceShape = faceFor("calm");
  #startMs = 0;
  #blendMs = 0;

  /** The phase the face is in. */
  get phase(): IdlePhase {
    return this.#phase;
  }

  /** Records a phase change that happened at `atMs`. */
  update(event: IdleEvent, atMs: number): void {
    if (event.phase === this.#phase) return;
    const calm = faceFor("calm");
    switch (event.phase) {
      case "entering":
        this.#from = this.shapeAt(atMs);
        this.#beat = faceFor(event.beat);
        break;
      case "leaving":
        this.#from = this.#beat;
        break;
      case "resting":
        this.#from = calm;
        break;
      case "holding":
      case "dozing":
        break;
    }
    this.#phase = event.phase;
    this.#startMs = atMs;
    this.#blendMs = event.blendMs;
  }

  /** The face to draw at `atMs`. */
  shapeAt(atMs: number): FaceShape {
    const p =
      this.#blendMs <= 0 ? 1 : clamp((atMs - this.#startMs) / this.#blendMs, 0, 1);
    const t = easeInOutCubic(p);
    switch (this.#phase) {
      case "resting":
        return faceFor("calm");
      case "entering":
        return lerpFace(this.#from, this.#beat, t);
      case "holding":
      case "dozing":
        return this.#beat;
      case "leaving":
        return lerpFace(this.#from, faceFor("calm"), t);
    }
  }
}

/**
 * The idle face at `atMs` on a timeline from {@link idleTimeline}. For many
 * frames in a row, an {@link IdleFaceTracker} fed as you go is cheaper.
 */
export function idleFaceAt(timeline: readonly TimedIdleEvent[], atMs: number): FaceShape {
  const tracker = new IdleFaceTracker();
  for (const e of timeline) {
    if (e.atMs > atMs) break;
    tracker.update(e, e.atMs);
  }
  return tracker.shapeAt(atMs);
}
