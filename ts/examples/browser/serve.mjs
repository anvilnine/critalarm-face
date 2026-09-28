// Serves the browser example with Node's own http module, no dependencies.
// Run `npm run example` from ts/, which builds dist/ first.
//
// It serves the whole ts/ folder so the page can import ../../dist/index.js
// the same way it would from any static host.

import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = normalize(join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
const port = Number(process.env.PORT ?? 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/") {
    res.writeHead(302, { location: "/examples/browser/" });
    res.end();
    return;
  }
  let path = normalize(join(root, decodeURIComponent(url.pathname)));
  if (path !== root && !path.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (statSync(path).isDirectory()) path = join(path, "index.html");
    statSync(path);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
    return;
  }
  res.writeHead(200, {
    "content-type": types[extname(path)] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(path).pipe(res);
}).listen(port, () => {
  console.log(`Crit examples at http://localhost:${port}/examples/browser/`);
});
