/**
 * Types for Crit's faces, draw ops and the data in `spec/faces.json`.
 *
 * Every shape here has the same fields as the JSON in `spec/`, so a face or a
 * frame read from the spec files can be used directly. `spec/SPEC.md`
 * explains every field.
 *
 * @module
 */

/** A point `[x, y]` in face units. y points down. */
export type Point = readonly [number, number];

/** A colour `[r, g, b, a]`, each 0 to 1, in sRGB. */
export type Color = readonly [number, number, number, number];

/** The 36 expressions Crit has. */
export type FaceState =
  | "calm"
  | "watching"
  | "worried"
  | "alarmed"
  | "acked"
  | "working"
  | "success"
  | "shocked"
  | "laughing"
  | "surprised"
  | "skeptical"
  | "dizzy"
  | "determined"
  | "confused"
  | "sad"
  | "blink"
  | "happy"
  | "content"
  | "curious"
  | "lookLeft"
  | "lookRight"
  | "thinking"
  | "interested"
  | "concerned"
  | "realization"
  | "yawn"
  | "sleepy"
  | "dozing"
  | "wakesUp"
  | "shakeHead"
  | "breatheIn"
  | "breatheOut"
  | "proud"
  | "cheeky"
  | "confident"
  | "love";

/** The 18 ways a ringing face can ring. */
export type RingingStyleName =
  | "classic"
  | "panic"
  | "rage"
  | "confused"
  | "dizzy"
  | "sobbing"
  | "scream"
  | "bellHead"
  | "eyesPop"
  | "annoyed"
  | "startled"
  | "hyperventilating"
  | "zapped"
  | "bouncing"
  | "terrified"
  | "siren"
  | "meltdown"
  | "spinOut";

/** Extras drawn around a resting face. */
export type PropKind = "popLines" | "zzz" | "puff" | "heart" | "motionArcs";

/** Extras drawn around a ringing face. */
export type RingFxKind =
  | "soundWaves"
  | "sweat"
  | "tear"
  | "steam"
  | "angerVein"
  | "question"
  | "exclaim"
  | "star"
  | "bell"
  | "hammer"
  | "bolt"
  | "siren"
  | "speedLines"
  | "teeth"
  | "drip"
  | "pulseRing"
  | "blush";

// ---------------------------------------------------------------------------
// Faces.
// ---------------------------------------------------------------------------

/** One eye. See "Eye" in `spec/SPEC.md`. */
export interface EyeShape {
  readonly centre: Point;
  readonly ballRadius: number;
  readonly ballSquash: number;
  readonly ballWidth: number;
  readonly ballIsHead: boolean;
  readonly pupilRadius: number;
  readonly pupilOffset: Point;
  readonly shineRadius: number;
  readonly shineOffset: Point;
  readonly spiral: number;
  readonly lid: number;
  readonly lidPoints: readonly Point[];
  readonly lidWidth: number;
}

/** One eyebrow: a curve through three points. */
export interface BrowShape {
  readonly points: readonly Point[];
  readonly width: number;
  readonly alpha: number;
}

/** The mouth: always 13 points round both lips. */
export interface MouthShape {
  readonly points: readonly Point[];
  readonly width: number;
  readonly fill: number;
  readonly fillColor: Color | null;
  readonly fillsWithInk: boolean;
}

/** The head's size and outline pen. */
export interface HeadShape {
  readonly squashX: number;
  readonly squashY: number;
  readonly strokeWidth: number;
}

/** An extra near the head, such as a heart or a Zzz. */
export interface PropShape {
  readonly kind: PropKind;
  readonly at: Point;
  readonly scale: number;
  readonly alpha: number;
}

/** A whole face. Any two can be blended with `lerpFace`. */
export interface FaceShape {
  readonly leftEye: EyeShape;
  readonly rightEye: EyeShape;
  readonly leftBrow: BrowShape;
  readonly rightBrow: BrowShape;
  readonly mouth: MouthShape;
  readonly head: HeadShape;
  readonly props: readonly PropShape[];
  /** Radians the whole head turns. The host applies it, not the ops. */
  readonly tilt: number;
  /** Box units the whole head moves. The host applies it, not the ops. */
  readonly nudge: Point;
}

// ---------------------------------------------------------------------------
// Ringing.
// ---------------------------------------------------------------------------

/** One extra around a ringing face. */
export interface RingFx {
  readonly kind: RingFxKind;
  readonly at: Point;
  readonly scale: number;
  readonly rotation: number;
  readonly alpha: number;
  readonly onHead: boolean;
  readonly inFront: boolean;
  readonly phase: number;
  readonly extent: Point;
}

/** Everything about a ringing face at one moment of its loop. */
export interface RingingFrame {
  readonly face: FaceShape;
  readonly tilt: number;
  readonly nudge: Point;
  readonly scale: number;
  readonly flush: number;
  readonly flash: number;
  readonly spin: number;
  readonly fx: readonly RingFx[];
}

// ---------------------------------------------------------------------------
// Draw ops.
// ---------------------------------------------------------------------------

/** An ellipse. A circle has `rx == ry`. */
export interface OvalShape {
  readonly type: "oval";
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

/** A rectangle with all four corners rounded to the same circle. */
export interface RRectShape {
  readonly type: "rrect";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly radius: number;
}

/** One step of a path. See "Path commands" in `spec/SPEC.md`. */
export type PathCommand =
  | readonly ["M", number, number]
  | readonly ["L", number, number]
  | readonly ["Q", number, number, number, number]
  | readonly ["C", number, number, number, number, number, number]
  | readonly ["A", number, number, number, number, number]
  | readonly ["Z"];

/** A path made of commands. */
export interface PathShape {
  readonly type: "path";
  readonly commands: readonly PathCommand[];
}

/** Anything a fill or stroke op paints. */
export type OpShape = OvalShape | RRectShape | PathShape;

/** One drawing step. Replay a list of them in order. */
export type FaceOp =
  | { readonly op: "save" }
  | { readonly op: "restore" }
  | { readonly op: "translate"; readonly dx: number; readonly dy: number }
  | { readonly op: "rotate"; readonly radians: number }
  | { readonly op: "scale"; readonly sx: number; readonly sy: number }
  | {
      readonly op: "clipOval";
      readonly cx: number;
      readonly cy: number;
      readonly rx: number;
      readonly ry: number;
    }
  | { readonly op: "fill"; readonly shape: OpShape; readonly color: Color }
  | {
      readonly op: "stroke";
      readonly shape: OpShape;
      readonly color: Color;
      readonly width: number;
      readonly cap: "round";
      readonly join: "round";
    };

// ---------------------------------------------------------------------------
// Colours and styles.
// ---------------------------------------------------------------------------

/** The colours Crit is drawn in, for one theme. */
export interface Palette {
  /** The head. */
  readonly fill: Color;
  /** The head outline on most faces. */
  readonly stroke: Color;
  /** Brows, pupils, lids, mouth lines and props. */
  readonly ink: Color;
  /** The outline of `worried`. */
  readonly high: Color;
  /** The alarm red. */
  readonly crit: Color;
  /** The outline of `acked`. */
  readonly cobalt: Color;
}

/** The colours and live values `buildFaceOps` paints a face with. */
export interface FaceStyle {
  readonly fill: Color;
  readonly stroke: Color;
  readonly ink: Color;
  /** Fills an open mouth that names no colour. Null means coral. */
  readonly tongue: Color | null;
  /** Slides both pupils sideways, in box units. */
  readonly lookDx: number;
  /** Turns the swirl in a spiral eye, in radians. */
  readonly spiralRotation: number;
}

/** The colours `buildRingingOps` paints a ringing face with. */
export interface RingingColors {
  readonly fill: Color;
  readonly stroke: Color;
  readonly ink: Color;
  /** The flush, the siren and the other red extras. */
  readonly accent: Color;
}

// ---------------------------------------------------------------------------
// spec/faces.json.
// ---------------------------------------------------------------------------

/** One idle beat. See "Idle face" in `spec/SPEC.md`. */
export interface IdleBeat {
  readonly face: FaceState;
  readonly weight: number;
  readonly enterMs: number;
  readonly holdMs: number;
  readonly leaveMs: number;
  readonly thenPlay: IdleBeat | null;
}

/** An easing curve and the samples to test it against. */
export interface EasingData {
  readonly cubicBezier: readonly [number, number, number, number];
  readonly samples: readonly Point[];
}

/** The whole of `spec/faces.json`. */
export interface SpecData {
  readonly schemaVersion: number;
  readonly box: {
    readonly size: number;
    readonly middle: Point;
    readonly head: {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly radius: number;
    };
  };
  readonly ringingStage: { readonly size: number; readonly inset: number };
  readonly palettes: { readonly light: Palette; readonly dark: Palette };
  readonly strokeByState: Readonly<Record<FaceState, keyof Palette>>;
  readonly colors: {
    readonly white: Color;
    readonly darkInk: Color;
    readonly mouthCoral: Color;
    readonly heart: Color;
    readonly sweatBlue: Color;
    readonly tearBlue: Color;
    readonly gold: Color;
    readonly starYellow: Color;
    readonly blushPink: Color;
  };
  readonly motion: {
    readonly durationsMs: {
      readonly alarmedShake: number;
      readonly shockedShake: number;
      readonly watchingLook: number;
      readonly dizzySpin: number;
      readonly laughingBounce: number;
      readonly confusedSway: number;
      readonly ringingHold: number;
      readonly ringingBlend: number;
    };
    readonly easing: {
      readonly easeInOut: EasingData;
      readonly easeInOutCubic: EasingData;
    };
    readonly watchingLookDx: readonly Point[];
  };
  readonly states: readonly {
    readonly name: FaceState;
    readonly label: string;
    readonly description: string;
    readonly characteristicColor: Color;
    readonly defaultTilt: number;
  }[];
  readonly faces: Readonly<Record<FaceState, FaceShape>>;
  readonly propKinds: readonly PropKind[];
  readonly puffCircles: readonly { readonly at: Point; readonly radius: number }[];
  readonly steamCircles: readonly { readonly at: Point; readonly radius: number }[];
  readonly ringFxKinds: readonly RingFxKind[];
  readonly ringingStyles: readonly {
    readonly name: RingingStyleName;
    readonly label: string;
    readonly description: string;
    readonly periodMs: number;
    readonly stillT: number;
  }[];
  readonly idle: {
    readonly beats: readonly IdleBeat[];
    readonly waking: IdleBeat;
    readonly tiredFaces: readonly FaceState[];
    readonly nightLift: number;
    readonly dayStarts: number;
    readonly dayEnds: number;
    readonly minGapMs: number;
    readonly maxGapMs: number;
    readonly dozeAfterMs: number;
    readonly dozeAfterAtNightMs: number;
    readonly nodOff: {
      readonly sleepyEnterMs: number;
      readonly sleepyHoldMs: number;
      readonly dozingEnterMs: number;
    };
  };
  readonly random: {
    readonly algorithm: string;
    readonly samples: readonly {
      readonly seed: number;
      readonly uint32: readonly number[];
    }[];
  };
}
