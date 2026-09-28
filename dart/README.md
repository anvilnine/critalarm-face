# critalarm_face

Crit, the [Crit Alarm](https://critalarm.app) mascot, for Flutter. 36 faces that blend into each
other, an idle face that keeps itself busy, and 18 ringing animations. No dependencies beyond
Flutter.

This is one of two packages in the [critalarm-face](https://github.com/anvilnine/critalarm-face)
repo. The other is the TypeScript port. The root README covers both, and how they stay in step.

## Install

Not on pub.dev yet. Use a git dependency pinned to a tag:

```yaml
dependencies:
  critalarm_face:
    git:
      url: https://github.com/anvilnine/critalarm-face.git
      path: dart
      ref: v0.1.0
```

Needs Flutter 3.44 or later.

## Usage

```dart
import 'package:critalarm_face/critalarm_face.dart';

// One face. With isLive on, six states move on their own
// (alarmed shakes, watching looks around, and so on).
const FaceWidget(state: FaceState.calm, size: 120);
const FaceWidget(state: FaceState.alarmed, size: 120, isLive: true);

// Calm, with a small expression every few seconds. Nods off when left alone.
const IdleFace(size: 120);

// An alarm going off, and one that moves through every style.
const RingingFaceWidget(style: RingingStyle.classic, size: 160);
const ShufflingRingingFace(size: 160);

// Any two faces blended.
FaceWidget(
  state: FaceState.calm,
  shape: FaceShape.lerp(faceFor(FaceState.calm), faceFor(FaceState.alarmed), 0.5),
);
```

Colours follow the theme, using `CritPalette.light` or `CritPalette.dark`. Pass `palette` to pick
one, or set single colours such as `fillColor`. The widgets hold still when the system asks for reduced motion.

## Draw ops

`buildFaceOps` and `buildRingingOps` turn a face into a flat list of `FaceOp`s. The painters in
this package replay them on a Flutter canvas, and the TypeScript package builds the same list.
[`spec/SPEC.md`](https://github.com/anvilnine/critalarm-face/blob/main/spec/SPEC.md) describes
every op and field.

## Example

[`example/`](example/) is a Flutter app with a gallery of every face, a blend playground, the idle
face and every ringing style.

## Development

```sh
fvm flutter test                    # includes a check that ../spec is up to date
fvm flutter analyze
fvm flutter test tool/export.dart   # rewrites ../spec/faces.json and ../spec/fixtures/
```

See [CONTRIBUTING.md](https://github.com/anvilnine/critalarm-face/blob/main/CONTRIBUTING.md).

## License

Apache-2.0.
