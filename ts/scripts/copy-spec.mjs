// Copies ../spec/faces.json into the package as a TypeScript module, so the
// data ships inside dist/ and loads in any browser or bundler without JSON
// import support. The spec file is the source of truth: never edit the copy.
//
// Runs before every build, test and typecheck (see package.json).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "..", "spec", "faces.json");
const target = join(here, "..", "src", "generated", "spec-data.ts");

const data = JSON.parse(readFileSync(source, "utf8"));

const out = `// Generated from spec/faces.json by scripts/copy-spec.mjs. Do not edit.

import type { SpecData } from "../types.js";

const specData: SpecData = ${JSON.stringify(data)};

export default specData;
`;

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, out);
