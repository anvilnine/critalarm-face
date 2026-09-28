/**
 * Live faces in the browser. Each `mount` function puts a canvas inside an
 * element, animates it with `requestAnimationFrame`, and returns a handle to
 * change it or take it down. Only these functions touch the DOM.
 *
 * All three respect `prefers-reduced-motion`: with it on, faces hold still
 * and changes happen at once.
 *
 * @module
 */

import { faceFor, ringingStyleInfo, strokeFor } from "./data.js";
import { drawToCanvas } from "./canvas.js";
import { easeInOut } from "./easing.js";
import { IdleFaceController, IdleFaceTracker } from "./idle.js";
import { clamp, lerpColor, lerpNumber } from "./math.js";
import { defaultTilt } from "./ops.js";
import { ringingFrameFor } from "./ringing/choreography.js";
import { RINGING_STAGE_UNITS } from "./ringing/ops.js";
import { RingingShuffle } from "./ringing/shuffle.js";
import {
  faceOps,
  resolvePalette,
  ringingOps,
  type FaceOptions,
  type PaletteInput,
  type RingingOptions,
} from "./scene.js";
import { lerpFace } from "./shape.js";
import type { Color, FaceOp, FaceShape, FaceState, RingingStyleName } from "./types.js";

/** Room left round a face's box for props, as a fraction of its size. */
const PROP_ROOM = 0.15;

function reducedMotionQuery(): MediaQueryList | null {
  return typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
}

/**
 * A canvas inside `element` that shows `size` CSS pixels of face, with
 * `room` extra on every side that props may spill into.
 */
function makeStage(element: HTMLElement, size: number, room: number, label: string) {
  const wrap = document.createElement("div");
  wrap.style.cssText = `position:relative;display:inline-block;width:${size}px;height:${size}px;`;
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", label);
  const canvas = document.createElement("canvas");
  const outer = size + 2 * room;
  canvas.style.cssText = `position:absolute;left:${-room}px;top:${-room}px;width:${outer}px;height:${outer}px;pointer-events:none;`;
  wrap.appendChild(canvas);
  element.appendChild(wrap);
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("This browser has no 2D canvas.");

  const draw = (ops: readonly FaceOp[], units: number) => {
    const ratio = globalThis.devicePixelRatio || 1;
    const px = Math.round(outer * ratio);
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);
    const k = (size * ratio) / units;
    ctx.setTransform(k, 0, 0, k, room * ratio, room * ratio);
    drawToCanvas(ctx, ops);
  };
  return { wrap, draw, remove: () => wrap.remove() };
}

/** Runs `frame` on every animation frame until stopped. */
function animate(frame: (nowMs: number) => void): { start(): void; stop(): void } {
  let id: number | null = null;
  const tick = (now: number) => {
    frame(now);
    id = requestAnimationFrame(tick);
  };
  return {
    start() {
      if (id === null) id = requestAnimationFrame(tick);
    },
    stop() {
      if (id !== null) cancelAnimationFrame(id);
      id = null;
    },
  };
}

// ---------------------------------------------------------------------------
// mountFace.
// ---------------------------------------------------------------------------

/** Options for {@link mountFace}. */
export interface MountFaceOptions
  extends Omit<FaceOptions, "state" | "elapsedMs" | "size"> {
  /** The expression to show first. Default `calm`. */
  readonly state?: FaceState;
  /** Width and height in CSS pixels. Default 120. */
  readonly size?: number;
  /** False holds the face still. Default true. */
  readonly live?: boolean;
  /** How long a change of state takes to blend. Default 450. */
  readonly morphMs?: number;
}

/** What {@link mountFace} returns. */
export interface MountedFace {
  /** The expression showing, or being blended to. */
  readonly state: FaceState;
  /** Blends into `state`, then plays its live motion. */
  setState(state: FaceState): void;
  /** Stops the animation and removes the face. */
  destroy(): void;
}

interface Look {
  readonly shape: FaceShape;
  readonly stroke: Color;
  readonly tilt: number;
}

/**
 * Puts a live Crit inside `element`. It plays the state's motion the way the
 * app does (alarmed shakes, watching looks around, dizzy spins and so on),
 * and {@link MountedFace.setState} blends to a new expression.
 *
 * @example
 * ```ts
 * const face = mountFace(document.querySelector("#crit")!, { state: "calm", size: 160 });
 * face.setState("alarmed");
 * ```
 */
export function mountFace(element: HTMLElement, options: MountFaceOptions = {}): MountedFace {
  const size = options.size ?? 120;
  const palette = resolvePalette(options.palette);
  const live = options.live ?? true;
  const morphMs = options.morphMs ?? 450;
  const query = reducedMotionQuery();
  const stage = makeStage(element, size, Math.round(size * PROP_ROOM), "Crit");

  let state: FaceState = options.state ?? "calm";
  let stateStart = performance.now();
  let from: Look | null = null;
  let morphStart = 0;

  const lookOf = (s: FaceState): Look => ({
    shape: { ...faceFor(s), tilt: 0, nudge: [0, 0] },
    stroke: strokeFor(palette, s),
    tilt: options.tilt ?? defaultTilt(s),
  });
  const reduced = () => query?.matches === true;

  let current: Look = lookOf(state);

  const render = (now: number) => {
    let ops: FaceOp[];
    if (from !== null && !reduced()) {
      const p = clamp((now - morphStart) / morphMs, 0, 1);
      const t = easeInOut(p);
      const to = lookOf(state);
      current = {
        shape: lerpFace(from.shape, to.shape, t),
        stroke: lerpColor(from.stroke, to.stroke, t),
        tilt: lerpNumber(from.tilt, to.tilt, t),
      };
      ops = faceOps(current.shape, {
        ...options,
        palette,
        state,
        stroke: options.stroke ?? current.stroke,
        tilt: current.tilt,
        size,
      });
      if (p >= 1) {
        from = null;
        stateStart = now;
        if (!live) loop.stop();
      }
    } else {
      from = null;
      current = lookOf(state);
      ops = faceOps(state, {
        ...options,
        palette,
        size,
        ...(live && !reduced() ? { elapsedMs: now - stateStart } : {}),
      });
    }
    stage.draw(ops, 200);
  };

  const loop = animate(render);
  const sync = () => {
    render(performance.now());
    if (live && !reduced()) loop.start();
    else loop.stop();
  };
  query?.addEventListener("change", sync);
  sync();

  return {
    get state() {
      return state;
    },
    setState(next: FaceState) {
      if (next === state && from === null) return;
      from = current;
      morphStart = performance.now();
      state = next;
      if (reduced()) from = null;
      render(performance.now());
      if (!reduced()) loop.start();
    },
    destroy() {
      loop.stop();
      query?.removeEventListener("change", sync);
      stage.remove();
    },
  };
}

// ---------------------------------------------------------------------------
// mountIdleFace.
// ---------------------------------------------------------------------------

/** Options for {@link mountIdleFace}. */
export interface MountIdleFaceOptions {
  /** Width and height in CSS pixels. Default 120. */
  readonly size?: number;
  /** The colours. Default `"light"`. */
  readonly palette?: PaletteInput;
  /** A seed, so the run of beats is the same every time. Default random. */
  readonly seed?: number;
  /** The clock that decides whether it is night. Default the real one. */
  readonly now?: () => Date;
}

/** What {@link mountIdleFace} returns. */
export interface MountedIdleFace {
  /** Wakes the face if it has nodded off. Tapping it does the same. */
  wake(): void;
  /** Stops the loop and removes the face. */
  destroy(): void;
}

/**
 * Puts an idle Crit inside `element`: calm, playing a small expression every
 * few seconds, nodding off after a while untouched. A click or tap wakes it.
 * With reduced motion on it stays calm.
 */
export function mountIdleFace(
  element: HTMLElement,
  options: MountIdleFaceOptions = {},
): MountedIdleFace {
  const size = options.size ?? 120;
  const palette = resolvePalette(options.palette);
  const query = reducedMotionQuery();
  const stage = makeStage(element, size, Math.round(size * PROP_ROOM), "Crit, idle");
  const controller = new IdleFaceController({
    ...(options.seed === undefined ? {} : { seed: options.seed }),
    ...(options.now === undefined ? {} : { now: options.now }),
  });
  const tracker = new IdleFaceTracker();
  controller.onChange((event) => tracker.update(event, performance.now()));

  const render = (now: number) => {
    const shape = tracker.phase === "resting" ? "calm" : tracker.shapeAt(now);
    stage.draw(faceOps(shape, { palette, size }), 200);
  };
  const loop = animate(render);

  const sync = () => {
    if (query?.matches === true) {
      controller.stop();
      loop.stop();
    } else {
      void controller.start();
      loop.start();
    }
    render(performance.now());
  };
  const wake = () => {
    if (controller.isDozing) void controller.wake();
  };
  stage.wrap.addEventListener("click", wake);
  query?.addEventListener("change", sync);
  sync();

  return {
    wake,
    destroy() {
      loop.stop();
      controller.dispose();
      query?.removeEventListener("change", sync);
      stage.wrap.removeEventListener("click", wake);
      stage.remove();
    },
  };
}

// ---------------------------------------------------------------------------
// mountRingingFace.
// ---------------------------------------------------------------------------

/** Options for {@link mountRingingFace}. */
export interface MountRingingFaceOptions extends RingingOptions {
  /**
   * The ringing style, or `"shuffle"` to blend into a new random style every
   * few seconds. Default `classic`.
   */
  readonly style?: RingingStyleName | "shuffle";
  /** Width and height of the whole stage in CSS pixels. Default 160. */
  readonly size?: number;
  /** How fast the loop plays, 1 being normal. Held between 0.1 and 4. */
  readonly speed?: number;
  /** False holds the face on the style's still point. Default true. */
  readonly live?: boolean;
  /** Seed for `"shuffle"`, so the order is the same every time. */
  readonly seed?: number;
}

/** What {@link mountRingingFace} returns. */
export interface MountedRingingFace {
  /** Switches to another style, or to `"shuffle"`. */
  setStyle(style: RingingStyleName | "shuffle"): void;
  /** Stops the animation and removes the face. */
  destroy(): void;
}

/**
 * Puts a ringing Crit inside `element`, looping one of the 18 styles, or
 * shuffling through them. With reduced motion on it holds the style's still
 * point.
 */
export function mountRingingFace(
  element: HTMLElement,
  options: MountRingingFaceOptions = {},
): MountedRingingFace {
  const size = options.size ?? 160;
  const speed = clamp(options.speed ?? 1, 0.1, 4);
  const live = options.live ?? true;
  const query = reducedMotionQuery();
  const stage = makeStage(element, size, 0, "Crit, ringing");

  let style: RingingStyleName | "shuffle" = options.style ?? "classic";
  let start = performance.now();
  let shuffle: RingingShuffle | null = null;
  const moving = () => live && query?.matches !== true;

  const render = (now: number) => {
    let ops: FaceOp[];
    if (style === "shuffle") {
      shuffle ??= new RingingShuffle(options.seed);
      ops = ringingOps(
        moving() ? shuffle.frameAt((now - start) * speed) : shuffle.stillFrame(),
        undefined,
        options,
      );
    } else {
      const info = ringingStyleInfo(style);
      const t = moving() ? (((now - start) * speed) / info.periodMs) % 1 : info.stillT;
      ops = ringingOps(ringingFrameFor(style, t), undefined, options);
    }
    stage.draw(ops, RINGING_STAGE_UNITS);
  };
  const loop = animate(render);
  const sync = () => {
    render(performance.now());
    if (moving()) loop.start();
    else loop.stop();
  };
  query?.addEventListener("change", sync);
  sync();

  return {
    setStyle(next) {
      style = next;
      start = performance.now();
      shuffle = null;
      render(start);
    },
    destroy() {
      loop.stop();
      query?.removeEventListener("change", sync);
      stage.remove();
    },
  };
}
