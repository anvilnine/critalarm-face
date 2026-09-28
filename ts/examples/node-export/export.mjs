// Exports every face, and every ringing style's still point, to SVG and PNG
// files. The use case: store panels, widgets, social images.
//
//   npm run build
//   node examples/node-export/export.mjs --size 512 --palette dark --out ./crit-faces
//
// Flags (all optional):
//   --size N       PNG width and height in pixels. Default 512.
//   --palette P    light or dark. Default light.
//   --padding F    Room round each face for props, as a fraction. Default 0.15.
//   --background C A CSS colour behind the face. Default transparent.
//   --out DIR      Where to write. Default examples/node-export/out.
//   --help         Print the flags and stop.
//
// SVG needs nothing but this package. PNG uses @resvg/resvg-js, a dev
// dependency of the package here; install it in your own project to do the
// same there.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { Resvg } from "@resvg/resvg-js";
import { faceStates, renderFaceSvg, renderRingingSvg, ringingStyles } from "../../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const usage = `Usage: node examples/node-export/export.mjs [flags]

Exports every face, and every ringing style's still point, to SVG and PNG.

Flags (all optional):
  --size N       PNG width and height in pixels. Default 512.
  --palette P    light or dark. Default light.
  --padding F    Room round each face for props, as a fraction. Default 0.15.
  --background C A CSS colour behind the face. Default transparent.
  --out DIR      Where to write. Default examples/node-export/out.
  --help         Print this and stop.
`;
let values;
try {
  ({ values } = parseArgs({
    options: {
      size: { type: "string", default: "512" },
      palette: { type: "string", default: "light" },
      padding: { type: "string", default: "0.15" },
      background: { type: "string" },
      out: { type: "string", default: join(here, "out") },
      help: { type: "boolean", short: "h" },
    },
  }));
} catch (error) {
  process.stderr.write(`${error.message}\n\n${usage}`);
  process.exit(1);
}
if (values.help) {
  process.stdout.write(usage);
  process.exit(0);
}

const size = Number(values.size);
const palette = values.palette === "dark" ? "dark" : "light";
const out = resolve(values.out);
const common = {
  size,
  palette,
  idPrefix: "crit",
  ...(values.background === undefined ? {} : { background: values.background }),
};

function write(name, svg) {
  writeFileSync(join(out, `${name}.svg`), svg);
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
  writeFileSync(join(out, `${name}.png`), png);
}

mkdirSync(join(out, "faces"), { recursive: true });
mkdirSync(join(out, "ringing"), { recursive: true });

for (const state of faceStates) {
  write(join("faces", state), renderFaceSvg(state, { ...common, padding: Number(values.padding) }));
}
for (const style of ringingStyles) {
  write(join("ringing", style), renderRingingSvg(style, undefined, common));
}

console.log(`Wrote ${faceStates.length} faces and ${ringingStyles.length} ringing faces to ${out}`);
