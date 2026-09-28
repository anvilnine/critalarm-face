// Every blended face and ringing frame in spec/fixtures/shapes.json, rebuilt
// in TypeScript and compared field by field.

import { describe, expect, it } from "vitest";
import {
  blinking,
  faceFor,
  lerpFace,
  lerpRingingFrame,
  ringingFrameFor,
  type FaceShape,
  type FaceState,
  type RingingFrame,
  type RingingStyleName,
} from "../src/index.js";
import { firstDifference, readSpec } from "./helpers.js";

const fixture = readSpec<{
  blends: { from: FaceState; to: FaceState; t: number; shape: FaceShape }[];
  blinking: Record<FaceState, FaceShape>;
  ringing: { style: RingingStyleName; t: number; frame: RingingFrame }[];
  ringingBlends: {
    from: RingingStyleName;
    to: RingingStyleName;
    fromT: number;
    toT: number;
    t: number;
    frame: RingingFrame;
  }[];
}>("fixtures/shapes.json");

describe("shapes.json", () => {
  describe("blends", () => {
    it.each(fixture.blends.map((c) => [`${c.from}-${c.to}@${c.t}`, c] as const))("%s", (_, c) => {
      const shape = lerpFace(faceFor(c.from), faceFor(c.to), c.t);
      expect(firstDifference(shape, c.shape)).toBeNull();
    });
  });

  describe("blinking", () => {
    it.each(Object.entries(fixture.blinking))("%s", (state, expected) => {
      expect(firstDifference(blinking(faceFor(state as FaceState)), expected)).toBeNull();
    });
  });

  describe("ringing", () => {
    it.each(fixture.ringing.map((c) => [`${c.style}@${c.t}`, c] as const))("%s", (_, c) => {
      expect(firstDifference(ringingFrameFor(c.style, c.t), c.frame)).toBeNull();
    });
  });

  describe("ringingBlends", () => {
    it.each(fixture.ringingBlends.map((c) => [`${c.from}-${c.to}`, c] as const))("%s", (_, c) => {
      const frame = lerpRingingFrame(
        ringingFrameFor(c.from, c.fromT),
        ringingFrameFor(c.to, c.toT),
        c.t,
      );
      expect(firstDifference(frame, c.frame)).toBeNull();
    });
  });

  it("blink is calm with its eyes shut", () => {
    expect(firstDifference(blinking(faceFor("calm")), faceFor("blink"))).toBeNull();
  });
});
