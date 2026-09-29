// Checks gallery/ matches the spec: the manifest was written from the current
// spec/faces.json, it lists the files every face and ringing style needs,
// and every file it lists is on disk. It never compares image bytes, since
// encoders differ from one machine to the next.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { faceStates, livePose, ringingStyles } from "../src/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const gallery = join(root, "gallery");
const rerun = "gallery is out of date, run `cd ts && npm run gallery`";

interface ManifestFile {
  readonly path: string;
  readonly kind: string;
  readonly bytes: number;
}

const manifest = JSON.parse(readFileSync(join(gallery, "manifest.json"), "utf8")) as {
  readonly specSha256: string;
  readonly files: readonly ManifestFile[];
};
const listed = new Set(manifest.files.map((f) => f.path));

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** True when the state's live pose changes over time. */
function moves(state: (typeof faceStates)[number]): boolean {
  const still = livePose(state, 0, 0);
  for (let ms = 0; ms < 10000; ms += 5) {
    const p = livePose(state, ms, 0);
    if (
      p.rotate !== still.rotate ||
      p.dx !== still.dx ||
      p.dy !== still.dy ||
      p.lookDx !== still.lookDx ||
      p.spiralRotation !== still.spiralRotation
    ) {
      return true;
    }
  }
  return false;
}

describe("gallery", () => {
  it("was made from the current spec/faces.json", () => {
    const hash = createHash("sha256")
      .update(readFileSync(join(root, "spec", "faces.json")))
      .digest("hex");
    expect(manifest.specSha256, rerun).toBe(hash);
  });

  it("lists every file each face and ringing style needs", () => {
    const expected = ["contact-sheet.png", "idle.webp", "README.md"];
    for (const state of faceStates) {
      for (const palette of ["light", "dark"]) {
        for (const ext of ["svg", "png"]) expected.push(`faces/${palette}/${kebab(state)}.${ext}`);
      }
      if (moves(state)) expected.push(`motion/${kebab(state)}.webp`);
    }
    for (const style of ringingStyles) expected.push(`ringing/${kebab(style)}.webp`);
    const missing = expected.filter((p) => !listed.has(p));
    expect(missing, rerun).toEqual([]);
  });

  it("has every listed file on disk", () => {
    const missing = manifest.files.filter((f) => !existsSync(join(gallery, f.path))).map((f) => f.path);
    expect(missing, rerun).toEqual([]);
  });
});
