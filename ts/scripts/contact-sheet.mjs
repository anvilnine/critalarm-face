// Renders every face and a spread of ringing frames with the TypeScript
// port, to SVG and then PNG, so a person can compare them with the Dart
// package by eye. Dev only.
//
//   npm run build
//   node scripts/contact-sheet.mjs --out /some/folder [--dart /dart/sheets]
//
// Writes to --out:
//
//   gallery.svg, gallery.png   All 36 faces in light and dark, with labels,
//                              and every ringing style at t 0, 0.25, 0.5, 0.75
//                              and its still point.
//   ts-faces-light.png         The cases the Dart look test draws, laid out
//   ts-faces-dark.png          exactly like its contact sheets (four cases a
//   ts-ringing.png             row, 200 px cells), drawn by this port.
//
// With --dart pointing at the folder the Dart test writes its sheets to
// (run `CRIT_FACE_CONTACT_DIR=/that/folder fvm flutter test
// test/look_unchanged_test.dart` in dart/), it also writes:
//
//   compare-<group>.png        Per case: the Dart replay, this port, and the
//                              pixels that differ (red, darker is further).
//   compare.txt                Pixels off per case, worst first.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { Resvg } from "@resvg/resvg-js";
import {
  blendFaces,
  buildFaceOps,
  buildRingingOps,
  faceFor,
  faceStateInfo,
  faceStates,
  faceStyle,
  palettes,
  renderFaceSvg,
  renderRingingSvg,
  ringingColors,
  ringingFrameFor,
  ringingStyleInfo,
  ringingStyles,
  svgBody,
} from "../dist/index.js";
import { decodePng, encodePng } from "./png.mjs";

const { values } = parseArgs({
  options: {
    out: { type: "string" },
    dart: { type: "string" },
  },
});
if (values.out === undefined) {
  console.error("Usage: node scripts/contact-sheet.mjs --out <folder> [--dart <folder>]");
  process.exit(2);
}
const out = resolve(values.out);
mkdirSync(out, { recursive: true });

const SHEET_BG = "#F7F2E9";
const CELL = 200;
const PER_ROW = 4;

function render(svg) {
  const image = new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: "Helvetica" } }).render();
  return { width: image.width, height: image.height, pixels: image.pixels, png: image.asPng() };
}

// ---------------------------------------------------------------------------
// The gallery.
// ---------------------------------------------------------------------------

function gallery() {
  const cols = 9;
  const cell = 150;
  const label = 22;
  const parts = [];
  let y = 0;
  const heading = (text) => {
    parts.push(`<text x="16" y="${y + 30}" font-size="20" font-weight="700" fill="#1a140f">${text}</text>`);
    y += 44;
  };
  const grid = (items) => {
    items.forEach(([name, svg], i) => {
      const x = (i % cols) * cell;
      const top = y + Math.floor(i / cols) * (cell + label);
      parts.push(`<g transform="translate(${x + 10} ${top})">${svg}</g>`);
      parts.push(
        `<text x="${x + cell / 2}" y="${top + cell + 8}" font-size="13" text-anchor="middle" fill="#6b5f55">${name}</text>`,
      );
    });
    y += Math.ceil(items.length / cols) * (cell + label) + 12;
  };
  const face = (state, palette) =>
    renderFaceSvg(state, { size: 130, padding: 0.15, palette, idPrefix: `g-${palette}-${state}` });

  heading("Faces, light");
  grid(faceStates.map((s) => [faceStateInfo(s).label, face(s, "light")]));
  heading("Faces, dark");
  grid(faceStates.map((s) => [faceStateInfo(s).label, face(s, "dark")]));
  heading("Blends, calm to alarmed");
  grid(
    [0, 0.25, 0.5, 0.75, 1].map((t) => [
      `t ${t}`,
      renderFaceSvg(blendFaces("calm", "alarmed", t), {
        size: 130,
        padding: 0.15,
        idPrefix: `g-blend-${t}`,
      }),
    ]),
  );
  heading("Ringing, light: t 0, 0.25, 0.5, 0.75, then the still point");
  const ringing = [];
  for (const style of ringingStyles) {
    const info = ringingStyleInfo(style);
    for (const t of [0, 0.25, 0.5, 0.75, info.stillT]) {
      ringing.push([
        `${style} ${t === info.stillT ? "still" : t}`,
        renderRingingSvg(style, t, { size: 130, idPrefix: `g-${style}-${t}` }),
      ]);
    }
  }
  grid(ringing);

  const width = cols * cell;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${y}" viewBox="0 0 ${width} ${y}">` +
    `<rect width="${width}" height="${y}" fill="${SHEET_BG}"/>${parts.join("")}</svg>`
  );
}

const gallerySvg = gallery();
writeFileSync(join(out, "gallery.svg"), gallerySvg);
writeFileSync(join(out, "gallery.png"), render(gallerySvg).png);

// ---------------------------------------------------------------------------
// The Dart look test's cases, in its sheet layout.
// ---------------------------------------------------------------------------

const blendPairs = [
  ["calm", "shocked"],
  ["calm", "alarmed"],
  ["calm", "success"],
  ["dozing", "wakesUp"],
  ["breatheIn", "breatheOut"],
  ["happy", "laughing"],
  ["calm", "love"],
];

function faceCases(theme) {
  const palette = palettes[theme];
  const cases = [];
  const add = (name, shape, state, extra = {}) =>
    cases.push({
      name: `${theme}/${name}`,
      units: 200,
      ops: buildFaceOps(shape, faceStyle(palette, { state, ...extra })),
    });
  for (const s of faceStates) add(s, faceFor(s), s);
  add("watching-look", faceFor("watching"), "watching", { lookDx: -18 });
  add("dizzy-spin", faceFor("dizzy"), "dizzy", { spiralRotation: 1.3 });
  for (const [a, b] of blendPairs) {
    for (const t of [0.25, 0.5, 0.75]) add(`${a}-${b}-${t}`, blendFaces(a, b, t), "calm");
  }
  return cases;
}

function ringingCases() {
  const colors = ringingColors(palettes.light);
  const cases = [];
  for (const style of ringingStyles) {
    for (let i = 0; i <= 10; i++) {
      cases.push({
        name: `ringing/${style}-${(i / 10).toFixed(1)}`,
        units: 280,
        ops: buildRingingOps(ringingFrameFor(style, i / 10), colors),
      });
    }
  }
  return cases;
}

/**
 * The cases drawn the way the Dart sheet draws them: each twice, side by
 * side, unclipped, so anything that spills out of a cell spills the same
 * way. The third column stays empty.
 */
function dartLayoutSvg(cases) {
  const rows = Math.ceil(cases.length / PER_ROW);
  const width = CELL * 3 * PER_ROW;
  const height = CELL * rows;
  const defs = [];
  const body = [];
  cases.forEach((c, n) => {
    const x = (n % PER_ROW) * 3 * CELL;
    const y = Math.floor(n / PER_ROW) * CELL;
    for (const col of [0, 1]) {
      const drawn = svgBody(c.ops, `c${n}-${col}`);
      defs.push(drawn.defs);
      const k = CELL / c.units;
      body.push(`<g transform="translate(${x + col * CELL} ${y}) scale(${k})">${drawn.body}</g>`);
    }
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs>${defs.join("")}</defs><rect width="${width}" height="${height}" fill="${SHEET_BG}"/>${body.join("")}</svg>`
  );
}

const groups = {
  "faces-light": faceCases("light"),
  "faces-dark": faceCases("dark"),
  ringing: ringingCases(),
};

const report = [];
for (const [group, cases] of Object.entries(groups)) {
  const ts = render(dartLayoutSvg(cases));
  writeFileSync(join(out, `ts-${group}.png`), ts.png);

  const dartPath = values.dart === undefined ? undefined : join(resolve(values.dart), `${group}.png`);
  if (dartPath === undefined || !existsSync(dartPath)) continue;
  const dart = decodePng(readFileSync(dartPath));
  if (dart.width !== ts.width || dart.height !== ts.height) {
    report.push(`${group}: sheet sizes differ (Dart ${dart.width}x${dart.height}, TS ${ts.width}x${ts.height})`);
    continue;
  }

  // Per case: Dart replay | this port | difference.
  const sheet = { width: dart.width, height: dart.height, pixels: new Uint8Array(dart.pixels.length) };
  const put = (x, y, rgba) => sheet.pixels.set(rgba, (y * sheet.width + x) * 4);
  cases.forEach((c, n) => {
    const x0 = (n % PER_ROW) * 3 * CELL;
    const y0 = Math.floor(n / PER_ROW) * CELL;
    let off = 0;
    let worst = 0;
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const i = ((y0 + y) * dart.width + x0 + CELL + x) * 4;
        const a = dart.pixels.subarray(i, i + 4);
        const b = ts.pixels.subarray(i, i + 4);
        let d = 0;
        for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs((a[k] ?? 0) - (b[k] ?? 0)));
        worst = Math.max(worst, d);
        if (d > 24) off++;
        put(x0 + x, y0 + y, a);
        put(x0 + CELL + x, y0 + y, b);
        put(x0 + 2 * CELL + x, y0 + y, d === 0 ? [255, 255, 255, 255] : [255, 255 - d, 255 - d, 255]);
      }
    }
    report.push({ name: c.name, off, worst });
  });
  writeFileSync(join(out, `compare-${group}.png`), encodePng(sheet));
}

const rows = report.filter((r) => typeof r === "object").sort((a, b) => b.off - a.off);
if (rows.length > 0) {
  const lines = [
    "Pixels that differ by more than 24 (of 255) in any channel, Dart replay against this port,",
    "per 200x200 cell. Worst first.",
    "",
    ...report.filter((r) => typeof r === "string"),
    ...rows.map((r) => `${String(r.off).padStart(6)}  worst ${String(r.worst).padStart(3)}  ${r.name}`),
  ];
  writeFileSync(join(out, "compare.txt"), lines.join("\n") + "\n");
  const total = rows.reduce((s, r) => s + r.off, 0);
  console.log(`Compared ${rows.length} cases with Dart: ${total} pixels off in all, worst case ${rows[0].name} (${rows[0].off}).`);
}
console.log(`Wrote the contact sheets to ${out}`);
