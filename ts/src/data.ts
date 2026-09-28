/**
 * The numbers from `spec/faces.json`, typed.
 *
 * @module
 */

import specData from "./generated/spec-data.js";
import type {
  Color,
  FaceShape,
  FaceState,
  Palette,
  RingingStyleName,
  SpecData,
} from "./types.js";

/** Everything in `spec/faces.json`, as loaded. */
export const spec: SpecData = specData;

/** The two palettes the Crit Alarm app uses. */
export const palettes: { readonly light: Palette; readonly dark: Palette } =
  specData.palettes;

/** Colours that stay the same in every theme. */
export const colors: SpecData["colors"] = specData.colors;

/** Every face state, in the order the spec lists them. */
export const faceStates: readonly FaceState[] = specData.states.map(
  (s) => s.name,
);

/** Every ringing style, in the order the spec lists them. */
export const ringingStyles: readonly RingingStyleName[] =
  specData.ringingStyles.map((s) => s.name);

/** Name, label, description and timing for one ringing style. */
export type RingingStyleInfo = SpecData["ringingStyles"][number];

/** Name, label, description, colour and default tilt for one face state. */
export type FaceStateInfo = SpecData["states"][number];

/** The resting face for `state`. */
export function faceFor(state: FaceState): FaceShape {
  const face = specData.faces[state];
  if (face === undefined) throw new RangeError(`Unknown face state: ${state}`);
  return face;
}

/** Label, description and default tilt for `state`. */
export function faceStateInfo(state: FaceState): FaceStateInfo {
  const info = specData.states.find((s) => s.name === state);
  if (info === undefined) throw new RangeError(`Unknown face state: ${state}`);
  return info;
}

/** Label, description, loop length and still point for `style`. */
export function ringingStyleInfo(style: RingingStyleName): RingingStyleInfo {
  const info = specData.ringingStyles.find((s) => s.name === style);
  if (info === undefined) {
    throw new RangeError(`Unknown ringing style: ${style}`);
  }
  return info;
}

/** The outline colour a face in `state` gets from `palette`. */
export function strokeFor(palette: Palette, state: FaceState): Color {
  return palette[specData.strokeByState[state]];
}

/** True when `name` is one of the 36 face states. */
export function isFaceState(name: string): name is FaceState {
  return Object.hasOwn(specData.faces, name);
}

/** True when `name` is one of the 18 ringing styles. */
export function isRingingStyle(name: string): name is RingingStyleName {
  return specData.ringingStyles.some((s) => s.name === name);
}
