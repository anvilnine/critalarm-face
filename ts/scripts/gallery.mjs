// Writes ../gallery/: every face as SVG and PNG in both palettes, an
// animated WebP of every face that moves, of every ringing style and of the
// idle face, a labelled contact sheet, a README that shows them all, and a
// manifest the tests read to tell whether the gallery is out of date.
//
//   npm run gallery
//
// Every frame is worked out from a fixed clock and a fixed seed, so the same
// spec always gives the same pictures. Files in the folders this script owns
// that it did not write this run (a face that was removed, say) are deleted.
// gallery/AGENTS.md and gallery/CLAUDE.md are hand-written and left alone.

import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import {
  faceStateInfo,
  faceStates,
  idleFaceAt,
  idleTimeline,
  livePose,
  renderFaceSvg,
  renderRingingSvg,
  ringingStyleInfo,
  ringingStyles,
  spec,
} from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const out = join(root, "gallery");
const specFile = join(root, "spec", "faces.json");
const version = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")).version;

const STILL_SIZE = 512;
const MOTION_SIZE = 256;
const FPS = 30;
// Room round the head for props that reach past it. The lines over
// success reach 30 units above the 200 unit box, so 0.15 would touch the edge.
const PADDING = 0.18;
const IDLE_SEED = 5;
const IDLE_MS = 10000;

/** calm stays calm, lookLeft becomes look-left. */
const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

// No text in a face, so skip the system font scan, which is most of the time.
const toPng = (svg) => Buffer.from(new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng());

// ---------------------------------------------------------------------------
// Live motion: which faces move, and how long one loop is.
// ---------------------------------------------------------------------------

const samePose = (a, b) =>
  ["rotate", "dx", "dy", "lookDx"].every((k) => Math.abs(a[k] - b[k]) < 1e-6) &&
  Math.abs(Math.cos(a.spiralRotation) - Math.cos(b.spiralRotation)) < 1e-6 &&
  Math.abs(Math.sin(a.spiralRotation) - Math.sin(b.spiralRotation)) < 1e-6;

/**
 * The length of one loop of `state`'s live motion in milliseconds, or null
 * when the face holds still. Found by testing each motion duration from the
 * spec, and twice each (a back and forth loop), for the shortest that
 * repeats, so it follows livePose without copying its table.
 */
function motionLoopMs(state) {
  const tilt = faceStateInfo(state).defaultTilt ?? 0;
  const pose = (ms) => livePose(state, ms, tilt);
  const still = pose(0);
  let moves = false;
  for (let ms = 0; ms < 10000 && !moves; ms += 5) moves = !samePose(pose(ms), still);
  if (!moves) return null;
  const d = spec.motion.durationsMs;
  const candidates = [...new Set(Object.entries(d)
    .filter(([k]) => !k.startsWith("ringing"))
    .flatMap(([, v]) => [v, 2 * v]))].sort((a, b) => a - b);
  // Test the whole span of the longest loop, so a face that holds still for
  // a while (watching) is not taken for a short loop.
  const span = candidates.at(-1);
  for (const period of candidates) {
    let repeats = true;
    for (let ms = 0; ms < span && repeats; ms += 3) repeats = samePose(pose(ms), pose(ms + period));
    if (repeats) return period;
  }
  throw new Error(`No loop length found for ${state}`);
}

// ---------------------------------------------------------------------------
// Animated WebP.
// ---------------------------------------------------------------------------

/** Frame count and per-frame delays (whole ms, summing to `loopMs`) for one loop. */
function timing(loopMs) {
  const count = Math.max(1, Math.round((loopMs * FPS) / 1000));
  const delays = [];
  for (let i = 0; i < count; i++) {
    delays.push(Math.round(((i + 1) * loopMs) / count) - Math.round((i * loopMs) / count));
  }
  return { count, delays, atMs: (i) => (i * loopMs) / count };
}

// Lossless: on flat colours it comes out smaller than lossy at quality 80
// or 90, and the edges stay clean.
const encodeWebp = (pngs, delays) =>
  sharp(pngs, { join: { animated: true } })
    .webp({ lossless: true, effort: 4, loop: 0, delay: delays })
    .toBuffer();

// ---------------------------------------------------------------------------
// Writing.
// ---------------------------------------------------------------------------

const written = [];

function write(path, data, entry) {
  const full = join(out, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, data);
  written.push({ path, ...entry, bytes: statSync(full).size });
}

// Stills.
for (const palette of ["light", "dark"]) {
  for (const state of faceStates) {
    const svg = renderFaceSvg(state, {
      size: STILL_SIZE,
      padding: PADDING,
      palette,
      idPrefix: `${palette}-${kebab(state)}`,
      title: `Crit, ${faceStateInfo(state).label}`,
    });
    const base = `faces/${palette}/${kebab(state)}`;
    write(`${base}.svg`, `${svg}\n`, { kind: "still", state, palette, format: "svg" });
    write(`${base}.png`, toPng(svg), { kind: "still", state, palette, format: "png" });
  }
}

// Live motion.
const moving = [];
for (const state of faceStates) {
  const loopMs = motionLoopMs(state);
  if (loopMs === null) continue;
  moving.push(state);
  const { count, delays, atMs } = timing(loopMs);
  const pngs = [];
  for (let i = 0; i < count; i++) {
    pngs.push(
      toPng(renderFaceSvg(state, { size: MOTION_SIZE, padding: PADDING, elapsedMs: atMs(i), idPrefix: "m" })),
    );
  }
  write(`motion/${kebab(state)}.webp`, await encodeWebp(pngs, delays), {
    kind: "motion",
    state,
    palette: "light",
    format: "webp",
    frames: count,
    loopMs,
  });
}

// Ringing. Some styles reach past the 280 unit stage (startled jumps, the
// siren's beam sweeps), so every loop is drawn in one square box that holds
// all of them, measured from the frames, with the same scale for every style.
const ringingLoops = ringingStyles.map((style) => {
  const loopMs = ringingStyleInfo(style).periodMs;
  return { style, loopMs, ...timing(loopMs) };
});
const ringingBox = (() => {
  const stage = 280;
  const room = stage / 2;
  const side = stage + 2 * room;
  let [x0, y0, x1, y1] = [side, side, 0, 0];
  for (const { style, count } of ringingLoops) {
    for (let i = 0; i < count; i++) {
      const inner = renderRingingSvg(style, i / count, { size: stage, idPrefix: "b" });
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}">` +
        `${inner.replace("<svg ", `<svg overflow="visible" x="${room}" y="${room}" `)}</svg>`;
      const { pixels } = new Resvg(svg, { font: { loadSystemFonts: false } }).render();
      for (let y = 0; y < side; y++) {
        for (let x = 0; x < side; x++) {
          if (pixels[(y * side + x) * 4 + 3] === 0) continue;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x + 1);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y + 1);
        }
      }
    }
  }
  const size = Math.max(x1 - x0, y1 - y0) + 8;
  return { x: (x0 + x1 - size) / 2 - room, y: (y0 + y1 - size) / 2 - room, size };
})();

for (const { style, loopMs, count, delays } of ringingLoops) {
  const pngs = [];
  for (let i = 0; i < count; i++) {
    const inner = renderRingingSvg(style, i / count, { idPrefix: "r" });
    const b = ringingBox;
    pngs.push(
      toPng(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${MOTION_SIZE}" height="${MOTION_SIZE}" viewBox="${b.x} ${b.y} ${b.size} ${b.size}">` +
          `${inner.replace("<svg ", '<svg overflow="visible" ')}</svg>`,
      ),
    );
  }
  write(`ringing/${kebab(style)}.webp`, await encodeWebp(pngs, delays), {
    kind: "ringing",
    style,
    palette: "light",
    format: "webp",
    frames: count,
    loopMs,
  });
}

// Idle. Starts and ends on calm, so it loops without a jump.
{
  const timeline = idleTimeline({ seed: IDLE_SEED, durationMs: IDLE_MS });
  const { count, delays, atMs } = timing(IDLE_MS);
  const pngs = [];
  for (let i = 0; i < count; i++) {
    const ms = atMs(i);
    const last = timeline.filter((e) => e.atMs <= ms).at(-1);
    const face = last === undefined || last.phase === "resting" ? "calm" : idleFaceAt(timeline, ms);
    pngs.push(toPng(renderFaceSvg(face, { size: MOTION_SIZE, padding: PADDING, idPrefix: "i" })));
  }
  write("idle.webp", await encodeWebp(pngs, delays), {
    kind: "idle",
    palette: "light",
    format: "webp",
    frames: count,
    loopMs: IDLE_MS,
    seed: IDLE_SEED,
  });
}

// Contact sheet: every face, light, with its label and file name.
{
  const cols = 6;
  const cell = 160;
  const label = 40;
  const parts = [];
  faceStates.forEach((state, i) => {
    const x = (i % cols) * cell;
    const top = 16 + Math.floor(i / cols) * (cell + label);
    const svg = renderFaceSvg(state, { size: cell - 16, padding: PADDING, idPrefix: `s-${state}` });
    parts.push(`<g transform="translate(${x + 8} ${top})">${svg}</g>`);
    parts.push(
      `<text x="${x + cell / 2}" y="${top + cell + 2}" font-size="15" font-weight="700" text-anchor="middle" fill="#1a140f">${faceStateInfo(state).label}</text>`,
      `<text x="${x + cell / 2}" y="${top + cell + 22}" font-size="12" text-anchor="middle" fill="#6b5f55">${kebab(state)}</text>`,
    );
  });
  const width = cols * cell;
  const height = 16 + Math.ceil(faceStates.length / cols) * (cell + label);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="#F7F2E9"/>${parts.join("")}</svg>`;
  const png = new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: "Helvetica" } })
    .render()
    .asPng();
  write("contact-sheet.png", png, { kind: "sheet", palette: "light", format: "png" });
}

// README.
{
  const img = (src, alt, w) => `<img src="${src}" alt="${alt}" width="${w}">`;
  const lines = [
    "# Crit gallery",
    "",
    "Generated by `ts/scripts/gallery.mjs`. Do not edit by hand: run `cd ts && npm run gallery`.",
    "See [AGENTS.md](AGENTS.md) for when to run it.",
    "",
    "Every face in both palettes as SVG and as a 512 px PNG with a transparent background, plus",
    "animated WebP loops (256 px, 30 fps, transparent) of every face that moves, every ringing",
    "style and the idle face. There are no GIFs: GIF has only on or off transparency, so the edges",
    "look rough, and the files come out bigger.",
    "",
    "![All faces](contact-sheet.png)",
    "",
    "## Faces",
    "",
    "| Face | Light | Dark | Moving |",
    "|---|---|---|---|",
  ];
  for (const state of faceStates) {
    const k = kebab(state);
    const info = faceStateInfo(state);
    const cellFor = (p) =>
      `[${img(`faces/${p}/${k}.png`, `${info.label}, ${p}`, 96)}](faces/${p}/${k}.png)<br>` +
      `[svg](faces/${p}/${k}.svg) [png](faces/${p}/${k}.png)`;
    const motion = moving.includes(state)
      ? `[${img(`motion/${k}.webp`, `${info.label}, moving`, 96)}](motion/${k}.webp)`
      : "";
    lines.push(`| **${info.label}**<br>\`${k}\` | ${cellFor("light")} | ${cellFor("dark")} | ${motion} |`);
  }
  lines.push("", "## Ringing", "", "One full loop of each style.", "", "| Style | Loop |", "|---|---|");
  for (const style of ringingStyles) {
    const k = kebab(style);
    const info = ringingStyleInfo(style);
    lines.push(
      `| **${info.label}**<br>\`${k}\`<br>${info.periodMs} ms | [${img(`ringing/${k}.webp`, info.label, 128)}](ringing/${k}.webp) |`,
    );
  }
  lines.push(
    "",
    "## Idle",
    "",
    `Ten seconds of the idle face, seed ${IDLE_SEED}.`,
    "",
    img("idle.webp", "Crit, idle", 128),
    "",
  );
  write("README.md", lines.join("\n"), { kind: "readme", format: "md" });
}

// Delete anything in the owned folders that this run did not write.
const keep = new Set(written.map((f) => f.path));
for (const dir of ["faces", "motion", "ringing"]) {
  const walk = (d) => {
    for (const name of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, name.name);
      if (name.isDirectory()) walk(p);
      else if (!keep.has(relative(out, p).split("\\").join("/"))) {
        rmSync(p);
        console.log(`removed stale ${relative(root, p)}`);
      }
    }
  };
  walk(join(out, dir));
}

const manifest = {
  version,
  specSha256: createHash("sha256").update(readFileSync(specFile)).digest("hex"),
  files: written,
};
writeFileSync(join(out, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const total = written.reduce((sum, f) => sum + f.bytes, 0);
const largest = written.reduce((a, b) => (b.bytes > a.bytes ? b : a));
console.log(
  `wrote ${written.length} files to gallery/ (${(total / 1e6).toFixed(2)} MB, largest ${largest.path} ${largest.bytes} bytes)`,
);
