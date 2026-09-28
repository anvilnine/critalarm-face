/**
 * Faces as a host shows them: palette colours, the head tilt, and the live
 * motion the Dart `FaceWidget` plays. Everything here returns draw ops, so
 * the SVG and canvas backends draw it the same way.
 *
 * @module
 */

import { faceFor, palettes, spec } from "./data.js";
import { easeInOut, watchingLookDx } from "./easing.js";
import { hexColor, TAU } from "./math.js";
import { buildFaceOps, defaultTilt, faceStyle, RESTORE, rotate, SAVE, translate } from "./ops.js";
import { buildRingingOps, ringingColors } from "./ringing/ops.js";
import { ringingFrameFor } from "./ringing/choreography.js";
import type {
  Color,
  FaceOp,
  FaceShape,
  FaceState,
  Palette,
  RingingFrame,
  RingingStyleName,
} from "./types.js";

/** A palette, or the name of one of the two built in. */
export type PaletteInput = Palette | "light" | "dark";

/** A colour as `[r, g, b, a]` (0 to 1) or a hex string such as `#FFC93C`. */
export type ColorInput = Color | string;

/** Turns a {@link PaletteInput} into a palette. */
export function resolvePalette(palette: PaletteInput | undefined): Palette {
  if (palette === undefined || palette === "light") return palettes.light;
  if (palette === "dark") return palettes.dark;
  return palette;
}

function color(c: ColorInput | undefined): Color | undefined {
  return c === undefined ? undefined : typeof c === "string" ? hexColor(c) : c;
}

// ---------------------------------------------------------------------------
// Live motion.
// ---------------------------------------------------------------------------

/**
 * How a live face is moved and posed at one moment, on top of its shape.
 * Rotation is round `pivot`, given as a fraction of the face's size; `dx` and
 * `dy` are screen pixels, as in the Dart widget.
 */
export interface FacePose {
  readonly rotate: number;
  readonly pivot: readonly [number, number];
  readonly dx: number;
  readonly dy: number;
  readonly lookDx: number;
  readonly spiralRotation: number;
}

/** A controller value that runs 0 to 1 and back, as `repeat(reverse: true)`. */
function backAndForth(ms: number, periodMs: number): number {
  const p = (((ms / periodMs) % 2) + 2) % 2;
  return p <= 1 ? p : 2 - p;
}

/** A controller value that runs 0 to 1 and starts again. */
function repeating(ms: number, periodMs: number): number {
  const p = ms / periodMs;
  return p - Math.floor(p);
}

/**
 * The pose `state` is in `elapsedMs` into its live animation, exactly as the
 * Dart `FaceWidget` moves it: alarmed shakes, shocked jitters, watching
 * looks around, dizzy spins its eyes, laughing bounces, confused sways. The
 * rest hold still at `baseTilt`.
 *
 * `baseTilt` is the head tilt without motion (see {@link defaultTilt}).
 * Confused ignores it unless `tiltOverride` is given, as in Dart.
 */
export function livePose(
  state: FaceState,
  elapsedMs: number,
  baseTilt: number,
  tiltOverride?: number,
): FacePose {
  const d = spec.motion.durationsMs;
  const deg = (v: number) => (v * Math.PI) / 180;
  const pose = {
    rotate: baseTilt,
    pivot: [0.5, 0.5] as const,
    dx: 0,
    dy: 0,
    lookDx: 0,
    spiralRotation: 0,
  };
  switch (state) {
    case "alarmed": {
      const v = backAndForth(elapsedMs, d.alarmedShake);
      return { ...pose, rotate: baseTilt + deg(-3 + v * 6), pivot: [0.5, 0.6] };
    }
    case "shocked": {
      const v = backAndForth(elapsedMs, d.shockedShake);
      return { ...pose, rotate: baseTilt + deg(-2 + v * 4), dy: -1 + v * 2 };
    }
    case "watching":
      return { ...pose, lookDx: watchingLookDx(repeating(elapsedMs, d.watchingLook)) };
    case "dizzy": {
      const v = repeating(elapsedMs, d.dizzySpin);
      return {
        ...pose,
        rotate: baseTilt + Math.sin(v * 4 * Math.PI) * deg(3),
        spiralRotation: v * TAU,
      };
    }
    case "laughing": {
      const v = easeInOut(backAndForth(elapsedMs, d.laughingBounce));
      return { ...pose, dy: -5 * v };
    }
    case "confused": {
      const v = easeInOut(backAndForth(elapsedMs, d.confusedSway));
      return { ...pose, rotate: tiltOverride ?? deg(-6 - v * 5) };
    }
    default:
      return pose;
  }
}

// ---------------------------------------------------------------------------
// Face scenes.
// ---------------------------------------------------------------------------

/** Colours and pose for {@link faceOps} and the renderers built on it. */
export interface FaceOptions {
  /** The colours. Default `"light"`. */
  readonly palette?: PaletteInput;
  /**
   * Which state picks the outline colour and the live motion when you pass
   * a shape. Ignored when you pass a state name. Default `calm`.
   */
  readonly state?: FaceState;
  /** The head. Overrides the palette. */
  readonly fill?: ColorInput;
  /** The head outline. Overrides the palette and the per-state outline. */
  readonly stroke?: ColorInput;
  /** Brows, pupils, lids and mouths. Overrides the palette. */
  readonly ink?: ColorInput;
  /** Fills an open mouth that names no colour. Default coral. */
  readonly tongue?: ColorInput;
  /**
   * Head tilt in radians. Default: the state's own (-8 degrees for
   * confused, 0 for the rest).
   */
  readonly tilt?: number;
  /**
   * Plays the state's live motion at this many milliseconds in. Leave it
   * out for a still face.
   */
  readonly elapsedMs?: number;
  /**
   * Size on screen in pixels. Only matters for live motion, which moves a
   * few pixels whatever the size, as in the Dart widget. Default 200.
   */
  readonly size?: number;
}

/**
 * The draw ops for a face as a host shows it, in the 200 unit box: colours
 * from the palette, the head tilt, and live motion when `elapsedMs` is set.
 *
 * Pass a state name to draw its resting face, or a shape (for example from
 * {@link blendFaces}) to draw that. A shape's own `tilt` and `nudge` are
 * applied; a state name's are not, which matches the Dart `FaceWidget`.
 */
export function faceOps(face: FaceState | FaceShape, options: FaceOptions = {}): FaceOp[] {
  const isState = typeof face === "string";
  const state: FaceState = isState ? face : (options.state ?? "calm");
  const shape: FaceShape = isState ? faceFor(face) : face;
  const palette = resolvePalette(options.palette);
  const size = options.size ?? 200;
  const baseTilt = (options.tilt ?? defaultTilt(state)) + (isState ? 0 : shape.tilt);

  const pose =
    options.elapsedMs === undefined || !isState
      ? livePose("calm", 0, baseTilt)
      : livePose(state, options.elapsedMs, baseTilt, options.tilt);

  const style = faceStyle(palette, {
    state,
    fill: color(options.fill),
    stroke: color(options.stroke),
    ink: color(options.ink),
    tongue: color(options.tongue) ?? null,
    lookDx: pose.lookDx,
    spiralRotation: pose.spiralRotation,
  });

  const toUnits = 200 / size;
  const nudge = isState ? [0, 0] : shape.nudge;
  const px = pose.pivot[0] * 200;
  const py = pose.pivot[1] * 200;
  const ops: FaceOp[] = [SAVE];
  const dx = (nudge[0] ?? 0) + pose.dx * toUnits;
  const dy = (nudge[1] ?? 0) + pose.dy * toUnits;
  if (dx !== 0 || dy !== 0) ops.push(translate(dx, dy));
  if (pose.rotate !== 0) ops.push(translate(px, py), rotate(pose.rotate), translate(-px, -py));
  ops.push(...buildFaceOps(shape, style), RESTORE);
  return ops;
}

/** Colours for {@link ringingOps}. */
export interface RingingOptions {
  /** The colours. Default `"light"`. */
  readonly palette?: PaletteInput;
  /** The head. Defaults to the palette's fill. */
  readonly fill?: ColorInput;
  /** The head outline. Defaults to the alarm red. */
  readonly stroke?: ColorInput;
  /** Brows, eyes and mouth. Defaults to the palette's ink. */
  readonly ink?: ColorInput;
  /** The flush, the siren and the other red extras. Defaults to the alarm red. */
  readonly accent?: ColorInput;
}

/**
 * The draw ops for a ringing face on the 280 unit stage. Pass a style and a
 * point in its loop (default: the style's still point), or a frame.
 */
export function ringingOps(
  frame: RingingStyleName | RingingFrame,
  t?: number,
  options: RingingOptions = {},
): FaceOp[] {
  const f =
    typeof frame === "string"
      ? ringingFrameFor(frame, t ?? spec.ringingStyles.find((s) => s.name === frame)?.stillT ?? 0)
      : frame;
  const colors = ringingColors(resolvePalette(options.palette), {
    fill: color(options.fill),
    stroke: color(options.stroke),
    ink: color(options.ink),
    accent: color(options.accent),
  });
  return buildRingingOps(f, colors);
}
