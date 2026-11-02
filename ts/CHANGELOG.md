## Unreleased

- Ten new faces from the Dart package: `groggy`, `deadpan`, `relieved`, `nervous`, `crying`, `angry`, `embarrassed`, `starstruck`, `whistling` and `exhausted`.
- Seven new prop kinds to draw them: `sweat`, `tears`, `blush`, `teeth`, `starEyes`, `note` and `eyeBags`.
- Fixed `mountFace` with `live: false`: the animation loop kept running after a blend ended. A `stop` called from inside a frame now holds.
- Fixed `mountFace` with `morphMs: 0` hanging the page. A `morphMs` of 0 or below now switches state at once. `cubicBezier` also returns 0 for any input that is not above 0, such as NaN.

## 0.1.0

- First release: a port of the Dart package with 36 faces, blending, the idle face, 18 ringing styles, draw ops, and SVG and canvas renderers. Parity tests check every case in `spec/fixtures`.
- `mountFace` is live and blends between states by default. The Dart `FaceWidget` is still by default and switches at once.
