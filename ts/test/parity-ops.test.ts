// The key test: for every case in spec/fixtures/ops.json, the TypeScript port
// builds the same draw ops as the Dart package, within the 1e-5 tolerance
// SPEC.md sets.

import { describe, expect, it } from "vitest";
import {
  buildFaceOps,
  buildRingingOps,
  faceFor,
  lerpFace,
  lerpRingingFrame,
  ringingFrameFor,
  type FaceOp,
  type FaceState,
  type FaceStyle,
  type RingingColors,
  type RingingStyleName,
} from "../src/index.js";
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

describe("ops.json", () => {
  it("is schema version 1", () => {
    expect(fixture.schemaVersion).toBe(1);
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
