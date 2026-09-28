# @anvilnine/critalarm-face

Crit, the [Crit Alarm](https://critalarm.app) mascot, for the web and Node. 36 faces that blend
into each other, an idle loop, and 18 ringing animations, drawn to SVG or a 2D canvas. No runtime
dependencies. ESM only, Node 22 or later, and any current browser.

This is one of two packages in the [critalarm-face](https://github.com/anvilnine/critalarm-face)
repo. The root README covers both. This one is a port of the Dart package there. Both build the same list of draw ops for the same
face, and the tests check every case in `spec/fixtures` against the Dart output, so Crit looks the
same in the app, on the web and in a video.

## Install

Not published to npm yet. Build it from the repo and install the tarball:

```sh
git clone https://github.com/anvilnine/critalarm-face.git
cd critalarm-face/ts
npm ci
npm run build
npm pack
# In your project:
npm install /path/to/critalarm-face/ts/anvilnine-critalarm-face-0.1.0.tgz
```

Once it is on npm, this becomes `npm install @anvilnine/critalarm-face`.

## Usage

A face as an SVG string, in Node or the browser:

```ts
import { renderFaceSvg, blendFaces } from "@anvilnine/critalarm-face";

const calm = renderFaceSvg("calm", { size: 128, palette: "dark" });
const halfway = renderFaceSvg(blendFaces("calm", "alarmed", 0.5), { size: 128 });
```

A live face in a page. It plays the state's motion (alarmed shakes, watching looks around) and
blends when the state changes:

```ts
import { mountFace } from "@anvilnine/critalarm-face";

const face = mountFace(document.querySelector("#crit")!, { state: "calm", size: 160 });
face.setState("alarmed");
```

The idle face and a ringing face:

```ts
import { mountIdleFace, mountRingingFace } from "@anvilnine/critalarm-face";

mountIdleFace(document.querySelector("#idle")!, { size: 120 });
mountRingingFace(document.querySelector("#alarm")!, { style: "shuffle", size: 200 });
```

All three `mount` functions hold still when the system asks for reduced motion.

## Lower level

- `buildFaceOps(shape, style)` and `buildRingingOps(frame, colors)` return the draw ops.
- `toSvg(ops)` replays them as SVG text. `drawToCanvas(ctx, ops)` replays them on a
  `CanvasRenderingContext2D`, an `OffscreenCanvas` context, or anything with the same methods.
- `ringingFrameFor(style, t)`, `lerpFace`, `lerpRingingFrame`, `idleTimeline` and
  `IdleFaceTracker` give frames on a clock you control, for video.

[`spec/SPEC.md`](https://github.com/anvilnine/critalarm-face/blob/main/spec/SPEC.md) explains every
field and op.

## Examples

Run these from this folder after `npm install`:

| Example | Command |
|---|---|
| Browser page: gallery, blend slider, live, idle and ringing faces | `npm run example` |
| Every face to SVG and PNG | `npm run build && node examples/node-export/export.mjs --size 512` |
| Numbered PNG frames for a video, plus the ffmpeg command | `npm run build && node examples/video-frames/render.mjs --fps 60` |

The PNG examples use `@resvg/resvg-js`, a dev dependency here.

## Development

```sh
npm test          # parity with the Dart fixtures, plus SVG and canvas checks
npm run typecheck
npm run build
npm run contact-sheet -- --out /tmp/crit-sheets --dart /tmp/dart-sheets
npm run readme-image  # redraws ../docs/images/faces.png
```

`spec/faces.json` is copied into `src/generated/` before each of these. Never edit the copy.

See [CONTRIBUTING.md](https://github.com/anvilnine/critalarm-face/blob/main/CONTRIBUTING.md)
for the full flow when a face changes.

## License

Apache-2.0.
