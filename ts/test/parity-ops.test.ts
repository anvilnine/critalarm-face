// The key test: for every case in spec/fixtures/ops.json, the TypeScript port
// builds the same draw ops as the Dart package, within the 1e-5 tolerance
// SPEC.md sets.

import { describe, expect, it } from "vitest";
import {
  buildFaceOps,
  buildRingingOps,
  faceFor,
  faceOps,
  lerpFace,
  lerpRingingFrame,
  ringingFrameFor,
  type FaceOp,
  type FaceState,
  type FaceStyle,
  type RingingColors,
  type RingingStyleName,
} from "../src/index.js";
import { spec } from "../src/data.js";
import { firstDifference, readSpec } from "./helpers.js";

interface FaceCase {
  name: string;
  style: FaceStyle;
  ops: FaceOp[];
}

interface RingingCase {
  name: string;
  style?: RingingStyleName;
  t?: number;
  colors: RingingColors;
  ops: FaceOp[];
}

const fixture = readSpec<{
  schemaVersion: number;
  faces: FaceCase[];
  blends: FaceCase[];
  ringing: RingingCase[];
}>("fixtures/ops.json");

/**
 * Splits `faceOps` output into the moves it makes round the face and the
 * face itself: `[save, ...moves, ...face, restore]`. The face starts with
 * its own save, so the moves are the translates and rotates before it.
 */
function unwrap(ops: FaceOp[]): { moves: FaceOp[]; face: FaceOp[] } {
  expect(ops[0]).toEqual({ op: "save" });
  expect(ops.at(-1)).toEqual({ op: "restore" });
  const inner = ops.slice(1, -1);
  let n = 0;
  while (inner[n]?.op === "translate" || inner[n]?.op === "rotate") n++;
  return { moves: inner.slice(0, n), face: inner.slice(n) };
}

const byName = new Map(fixture.faces.map((c) => [c.name, c] as const));
const states = spec.states.map((s) => s.name as FaceState);

describe("ops.json", () => {
  it("is schema version 1", () => {
    expect(fixture.schemaVersion).toBe(1);
  });

  // An empty or renamed fixture must fail, not pass with no cases.
  it("has every case", () => {
    expect(states.length).toBe(36);
    expect(fixture.faces.length).toBe(2 * states.length + 3);
    expect(fixture.blends.length).toBe(60);
    expect(fixture.ringing.length).toBe(80);
    for (const theme of ["light", "dark"]) {
      for (const s of states) expect(byName.has(`${theme}/${s}`)).toBe(true);
    }
  });

  // The same faces again, built the way a host builds them: a state name and
  // a palette, so the palette to colour code (outline per state, ink,
  // tongue, dark) is checked too.
  describe("faceOps", () => {
    const cases = (["light", "dark"] as const).flatMap((theme) =>
      states.map((s) => [`${theme}/${s}`, theme, s] as const),
    );

    it.each(cases)("%s", (name, palette, state) => {
      const { moves, face } = unwrap(faceOps(state, { palette }));
      const tilt = spec.states.find((s) => s.name === state)?.defaultTilt ?? 0;
      if (tilt === 0) {
        expect(moves).toEqual([]);
      } else {
        expect(firstDifference(moves, [
          { op: "translate", dx: 100, dy: 100 },
          { op: "rotate", radians: tilt },
          { op: "translate", dx: -100, dy: -100 },
        ])).toBeNull();
      }
      expect(firstDifference(face, byName.get(name)?.ops)).toBeNull();
    });

    it("light/laughing-blue-tongue", () => {
      const { face } = unwrap(faceOps("laughing", { tongue: "#4EAAD8" }));
      expect(firstDifference(face, byName.get("light/laughing-blue-tongue")?.ops)).toBeNull();
    });

    // Live motion, at points where the Dart fixture pins the pose.
    it("light/watching-look", () => {
      const elapsedMs = 0.7 * spec.motion.durationsMs.watchingLook;
      const { moves, face } = unwrap(faceOps("watching", { elapsedMs }));
      expect(moves).toEqual([]);
      expect(firstDifference(face, byName.get("light/watching-look")?.ops)).toBeNull();
    });

    it("light/dizzy-spin", () => {
      const elapsedMs = (1.3 / (2 * Math.PI)) * spec.motion.durationsMs.dizzySpin;
      const { face } = unwrap(faceOps("dizzy", { elapsedMs }));
      expect(firstDifference(face, byName.get("light/dizzy-spin")?.ops)).toBeNull();
    });
  });

  describe("faces", () => {
    // "light/watching-look" draws the watching face with a style of its own.
    it.each(fixture.faces.map((c) => [c.name, c] as const))("%s", (_, c) => {
      const state = (c.name.split("/")[1] as string).split("-")[0] as FaceState;
      expect(firstDifference(buildFaceOps(faceFor(state), c.style), c.ops)).toBeNull();
    });
  });

  describe("blends", () => {
    it.each(fixture.blends.map((c) => [c.name, c] as const))("%s", (_, c) => {
      const match = /^light\/(\w+)-(\w+)@([\d.]+)$/.exec(c.name);
      expect(match).not.toBeNull();
      const [, a, b, t] = match as unknown as [string, FaceState, FaceState, string];
      const shape = lerpFace(faceFor(a), faceFor(b), Number(t));
      expect(firstDifference(buildFaceOps(shape, c.style), c.ops)).toBeNull();
    });
  });

  describe("ringing", () => {
    it.each(fixture.ringing.map((c) => [c.name, c] as const))("%s", (_, c) => {
      let frame;
      if (c.style !== undefined && c.t !== undefined) {
        frame = ringingFrameFor(c.style, c.t);
      } else {
        const match = /^light\/(\w+)@([\d.]+)-(\w+)@([\d.]+)@([\d.]+)$/.exec(c.name);
        expect(match).not.toBeNull();
        const [, a, at, b, bt, t] = match as unknown as [
          string,
          RingingStyleName,
          string,
          RingingStyleName,
          string,
          string,
        ];
        frame = lerpRingingFrame(
          ringingFrameFor(a, Number(at)),
          ringingFrameFor(b, Number(bt)),
          Number(t),
        );
      }
      expect(firstDifference(buildRingingOps(frame, c.colors), c.ops)).toBeNull();
    });
  });
});
