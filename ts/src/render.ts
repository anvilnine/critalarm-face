/**
 * One-call helpers: a face or a ringing frame straight to SVG or a canvas.
 *
 * @module
 */

import { faceFor, ringingStyleInfo } from "./data.js";
import type { Canvas2DLike } from "./canvas.js";
import { drawToCanvas } from "./canvas.js";
import { RINGING_STAGE_UNITS } from "./ringing/ops.js";
import { faceOps, ringingOps, type FaceOptions, type RingingOptions } from "./scene.js";
import { lerpFace } from "./shape.js";
import { toSvg } from "./svg.js";
import type { FaceShape, FaceState, RingingFrame, RingingStyleName } from "./types.js";

/** Output options shared by the SVG helpers. */
export interface SvgOutputOptions {
  /** Width and height in pixels. Default 200. */
  readonly size?: number;
  /**
   * Room around the head, as a fraction of the size, so props that reach
   * past the head (the lines over a win, a puff of breath) are not cut off.
   * Faces only. Default 0: the SVG is exactly the head's box and shows the
   * overflow only where the page lets it.
   */
  readonly padding?: number;
  /** A CSS colour behind the face. Default none. */
  readonly background?: string;
  /** Text for screen readers. */
  readonly title?: string;
  /** Prefix for clip path ids. See {@link SvgOptions.idPrefix}. */
  readonly idPrefix?: string;
}

/**
 * Blends two faces. `t` 0 gives `a`, 1 gives `b`. Either side can be a state
 * name or a shape.
 *
 * @example
 * ```ts
 * const halfway = blendFaces("calm", "alarmed", 0.5);
 * const svg = renderFaceSvg(halfway, { size: 256 });
 * ```
 */
export function blendFaces(
  a: FaceState | FaceShape,
  b: FaceState | FaceShape,
  t: number,
): FaceShape {
  const shape = (f: FaceState | FaceShape) => (typeof f === "string" ? faceFor(f) : f);
  return lerpFace(shape(a), shape(b), t);
}

/**
 * A face as a standalone SVG string. Works in Node and the browser.
 *
 * @example
 * ```ts
 * const svg = renderFaceSvg("calm", { size: 128, palette: "dark" });
 * ```
 */
export function renderFaceSvg(
  face: FaceState | FaceShape,
  options: FaceOptions & SvgOutputOptions = {},
): string {
  const size = options.size ?? 200;
  const padding = (options.padding ?? 0) * 200;
  const svg = {
    units: 200,
    padding,
    size,
    ...(options.background === undefined ? {} : { background: options.background }),
    ...(options.title === undefined ? {} : { title: options.title }),
    ...(options.idPrefix === undefined ? {} : { idPrefix: options.idPrefix }),
  };
  const svgText = toSvg(faceOps(face, { ...options, size: size / (1 + (2 * padding) / 200) }), svg);
  return padding === 0 ? svgText.replace("<svg ", '<svg overflow="visible" ') : svgText;
}

/**
 * A ringing face as a standalone SVG string, on its 280 unit stage. Pass a
 * style and a point in its loop (default: the style's still point), or a
 * frame.
 *
 * @example
 * ```ts
 * const svg = renderRingingSvg("classic", 0.25, { size: 280 });
 * ```
 */
export function renderRingingSvg(
  frame: RingingStyleName | RingingFrame,
  t?: number,
  options: RingingOptions & Omit<SvgOutputOptions, "padding"> = {},
): string {
  return toSvg(ringingOps(frame, t, options), {
    units: RINGING_STAGE_UNITS,
    size: options.size ?? RINGING_STAGE_UNITS,
    ...(options.background === undefined ? {} : { background: options.background }),
    ...(options.title === undefined ? {} : { title: options.title }),
    ...(options.idPrefix === undefined ? {} : { idPrefix: options.idPrefix }),
  });
}

/**
 * Draws a face onto a canvas, `size` pixels wide, with its top left corner
 * at the context's current origin.
 */
export function drawFace(
  ctx: Canvas2DLike,
  face: FaceState | FaceShape,
  options: FaceOptions = {},
): void {
  const size = options.size ?? 200;
  ctx.save();
  ctx.scale(size / 200, size / 200);
  drawToCanvas(ctx, faceOps(face, options));
  ctx.restore();
}

/**
 * Draws a ringing face onto a canvas, its whole stage `size` pixels wide,
 * with its top left corner at the context's current origin.
 */
export function drawRingingFace(
  ctx: Canvas2DLike,
  frame: RingingStyleName | RingingFrame,
  t?: number,
  options: RingingOptions & { readonly size?: number } = {},
): void {
  const size = options.size ?? RINGING_STAGE_UNITS;
  ctx.save();
  ctx.scale(size / RINGING_STAGE_UNITS, size / RINGING_STAGE_UNITS);
  drawToCanvas(ctx, ringingOps(frame, t, options));
  ctx.restore();
}

/** The loop length of `style` in milliseconds, at normal speed. */
export function ringingPeriodMs(style: RingingStyleName): number {
  return ringingStyleInfo(style).periodMs;
}
