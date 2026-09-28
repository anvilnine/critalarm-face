// Draws the face gallery shown in the root README: all 36 faces in the light
// palette, with their labels, as one PNG. Dev only.
//
//   npm run build
//   node scripts/readme-image.mjs
//
// Writes ../docs/images/faces.png.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { faceStateInfo, faceStates, renderFaceSvg } from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "..", "docs", "images", "faces.png");

const cols = 9;
const cell = 96;
const label = 18;
const parts = [];
faceStates.forEach((state, i) => {
  const x = (i % cols) * cell;
  const top = 8 + Math.floor(i / cols) * (cell + label);
  const svg = renderFaceSvg(state, { size: cell - 12, padding: 0.15, idPrefix: `r-${state}` });
  parts.push(`<g transform="translate(${x + 6} ${top})">${svg}</g>`);
  parts.push(
    `<text x="${x + cell / 2}" y="${top + cell - 2}" font-size="12" text-anchor="middle" fill="#6b5f55">${faceStateInfo(state).label}</text>`,
  );
});
const width = cols * cell;
const height = 8 + Math.ceil(faceStates.length / cols) * (cell + label);
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
  `<rect width="${width}" height="${height}" fill="#F7F2E9"/>${parts.join("")}</svg>`;

const png = new Resvg(svg, {
  fitTo: { mode: "zoom", value: 2 },
  font: { loadSystemFonts: true, defaultFontFamily: "Helvetica" },
})
  .render()
  .asPng();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`wrote docs/images/faces.png (${png.length} bytes)`);
