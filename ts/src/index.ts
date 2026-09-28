/**
 * Crit, the Crit Alarm mascot, for the web and Node.
 *
 * Quick start:
 *
 * - {@link renderFaceSvg} and {@link renderRingingSvg} give an SVG string.
 * - {@link blendFaces} mixes two faces.
 * - {@link mountFace}, {@link mountIdleFace} and {@link mountRingingFace}
 *   put a live, animated Crit in a web page.
 *
 * Underneath, every face becomes a list of draw ops ({@link buildFaceOps},
 * {@link buildRingingOps}) that {@link toSvg} and {@link drawToCanvas}
 * replay. The ops match the Dart package's for the same input, which is
 * what keeps Crit looking the same everywhere.
 *
 * @packageDocumentation
 */

export type * from "./types.js";

export {
  colors,
  faceFor,
  faceStateInfo,
  faceStates,
  isFaceState,
  isRingingStyle,
  palettes,
  ringingStyleInfo,
  ringingStyles,
  spec,
  strokeFor,
  type FaceStateInfo,
  type RingingStyleInfo,
} from "./data.js";
export { hexColor, lerpColor, toCss, toHex, withAlpha } from "./math.js";
export { cubicBezier, easeInOut, easeInOutCubic, watchingLookDx, type Easing } from "./easing.js";
export { SeededRandom, type RandomSource } from "./random.js";
export {
  blinking,
  browShape,
  curveMouth,
  eyeShape,
  faceShape,
  headShape,
  lerpFace,
  lineMouth,
  lipsMouth,
  mouthShape,
  ovalMouth,
  sampleMouth,
  wedgeMouth,
} from "./shape.js";
export {
  buildFaceOps,
  circleUnionPath,
  defaultTilt,
  faceStyle,
  PathBuilder,
  pupilOnWhite,
  type Circle,
  type FaceStyleOptions,
} from "./ops.js";
export {
  buildRingingOps,
  RINGING_STAGE_UNITS,
  ringingColors,
  type RingingColorOptions,
} from "./ringing/ops.js";
export { ringingFrameFor } from "./ringing/choreography.js";
export { lerpRingingFrame, nextRingingStyle, ringFx, ringingFrame } from "./ringing/frame.js";
export { RingingShuffle } from "./ringing/shuffle.js";
export {
  IdleFaceController,
  IdleFaceTracker,
  idleFaceAt,
  idleTimeline,
  isNightHour,
  type IdleControllerOptions,
  type IdleEvent,
  type IdlePhase,
  type IdleTimelineOptions,
  type TimedIdleEvent,
} from "./idle.js";
export { svgBody, svgPathData, toSvg, type SvgOptions } from "./svg.js";
export { drawToCanvas, type Canvas2DLike } from "./canvas.js";
export {
  faceOps,
  livePose,
  resolvePalette,
  ringingOps,
  type ColorInput,
  type FaceOptions,
  type FacePose,
  type PaletteInput,
  type RingingOptions,
} from "./scene.js";
export {
  blendFaces,
  drawFace,
  drawRingingFace,
  renderFaceSvg,
  renderRingingSvg,
  ringingPeriodMs,
  type SvgOutputOptions,
} from "./render.js";
export {
  mountFace,
  mountIdleFace,
  mountRingingFace,
  type MountedFace,
  type MountedIdleFace,
  type MountedRingingFace,
  type MountFaceOptions,
  type MountIdleFaceOptions,
  type MountRingingFaceOptions,
} from "./dom.js";
