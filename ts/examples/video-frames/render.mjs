// Renders a deterministic frame sequence to numbered PNGs: Crit goes from
// calm to alarmed (shaking), then to acked. Every frame is worked out from
// its frame number on a fixed clock, so the same flags always give the same
// files. This is the path for marketing videos.
//
//   npm run build
//   node examples/video-frames/render.mjs --fps 60 --size 720 --out ./frames
//
// Flags (all optional):
//   --fps N        Frames per second. Default 60.
//   --size N       Width and height in pixels. Default 720.
//   --palette P    light or dark. Default light.
//   --background C A CSS colour behind the face. Default transparent.
//   --out DIR      Where to write. Default examples/video-frames/out.
//
// It prints the ffmpeg command that turns the frames into a WebM.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { Resvg } from "@resvg/resvg-js";
import {
  defaultTilt,
  easeInOut,
  faceFor,
  lerpColor,
  lerpFace,
  palettes,
  renderFaceSvg,
  strokeFor,
} from "../../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: {
    fps: { type: "string", default: "60" },
    size: { type: "string", default: "720" },
    palette: { type: "string", default: "light" },
    background: { type: "string" },
    out: { type: "string", default: join(here, "out") },
  },
});

const fps = Number(values.fps);
const size = Number(values.size);
const paletteName = values.palette === "dark" ? "dark" : "light";
const palette = palettes[paletteName];
const out = resolve(values.out);

// The scene, in order. A hold shows a state with its live motion; a blend
// moves from the state before it to the next one.
const scene = [
  { hold: "calm", ms: 600 },
  { blendTo: "alarmed", ms: 500 },
  { hold: "alarmed", ms: 1800 },
  { blendTo: "acked", ms: 600 },
  { hold: "acked", ms: 1200 },
];

/** The SVG for the moment `ms` into the scene. */
function frameAt(ms) {
  let start = 0;
  let state = "calm";
  for (const step of scene) {
    if (ms < start + step.ms || step === scene[scene.length - 1]) {
      const local = Math.min(ms - start, step.ms);
      const common = { size, palette: paletteName, padding: 0.15, idPrefix: "f" };
      if (values.background !== undefined) common.background = values.background;
      if (step.hold !== undefined) {
        return renderFaceSvg(step.hold, { ...common, elapsedMs: local });
      }
      // A blend: shape, outline colour and tilt all move together.
      const t = easeInOut(local / step.ms);
      const still = (s) => ({ ...faceFor(s), tilt: 0, nudge: [0, 0] });
      return renderFaceSvg(lerpFace(still(state), still(step.blendTo), t), {
        ...common,
        state: step.blendTo,
        stroke: lerpColor(strokeFor(palette, state), strokeFor(palette, step.blendTo), t),
        tilt: defaultTilt(state) * (1 - t) + defaultTilt(step.blendTo) * t,
      });
    }
    start += step.ms;
    state = step.hold ?? step.blendTo;
  }
  throw new Error("unreachable");
}

const totalMs = scene.reduce((sum, s) => sum + s.ms, 0);
const frames = Math.round((totalMs / 1000) * fps);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (let i = 0; i < frames; i++) {
  const svg = frameAt((i * 1000) / fps);
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
  writeFileSync(join(out, `frame_${String(i + 1).padStart(5, "0")}.png`), png);
}

console.log(`Wrote ${frames} frames (${totalMs} ms at ${fps} fps) to ${out}`);
console.log("Make a WebM (keeps transparency) with:");
console.log(
  `  ffmpeg -y -framerate ${fps} -i "${join(out, "frame_%05d.png")}" ` +
    `-c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30 "${join(out, "crit.webm")}"`,
);
