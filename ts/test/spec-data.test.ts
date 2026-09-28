// The small pieces faces.json carries samples for: random numbers, easing
// curves and the watching face's look. Also checks the bundled copy of
// faces.json is the spec file, and that the fixture comparison really
// catches drift.

import { describe, expect, it } from "vitest";
import {
  easeInOut,
  easeInOutCubic,
  faceStates,
  ringingStyles,
  SeededRandom,
  spec,
  watchingLookDx,
} from "../src/index.js";
import { firstDifference, readSpec, TOLERANCE } from "./helpers.js";

const faces = readSpec<typeof spec>("faces.json");

describe("faces.json", () => {
  it("is bundled unchanged", () => {
    expect(spec).toEqual(faces);
  });

  it("has 36 faces and 18 ringing styles", () => {
    expect(faceStates).toHaveLength(36);
    expect(ringingStyles).toHaveLength(18);
  });

  it.each(faces.random.samples.map((s) => [s.seed, s.uint32] as const))(
    "mulberry32 seed %i",
    (seed, expected) => {
      const r = new SeededRandom(seed);
      expect(Array.from({ length: expected.length }, () => r.nextUint32())).toEqual(expected);
    },
  );

  it.each([
    ["easeInOut", easeInOut],
    ["easeInOutCubic", easeInOutCubic],
  ] as const)("%s samples", (name, curve) => {
    const samples = faces.motion.easing[name].samples;
    expect(firstDifference(samples.map(([t]) => [t, curve(t)]), samples)).toBeNull();
  });

  it("watching look samples", () => {
    const samples = faces.motion.watchingLookDx;
    expect(firstDifference(samples.map(([t]) => [t, watchingLookDx(t)]), samples)).toBeNull();
  });
});

describe("the fixture comparison", () => {
  it("fails on a number off by twice the tolerance", () => {
    expect(firstDifference({ a: [1, 2 + 2 * TOLERANCE] }, { a: [1, 2] })).not.toBeNull();
  });

  it("fails on a missing op, an extra key or a changed name", () => {
    expect(firstDifference([{ op: "save" }], [{ op: "save" }, { op: "restore" }])).not.toBeNull();
    expect(firstDifference({ op: "save", x: 1 }, { op: "save" })).not.toBeNull();
    expect(firstDifference({ op: "fill" }, { op: "stroke" })).not.toBeNull();
  });

  it("passes within the tolerance", () => {
    expect(firstDifference([1 + TOLERANCE / 2], [1])).toBeNull();
  });
});
