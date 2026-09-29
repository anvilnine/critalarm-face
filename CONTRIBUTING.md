# Contributing

Bug reports, face requests and pull requests are welcome. Open an issue first for anything bigger
than a small fix, so we can agree on the shape before you write it.

## Setup

You need:

- Flutter 3.44.9, through [fvm](https://fvm.app). The version is pinned in `.fvmrc`.
- Node 22 or later.

```sh
fvm install
cd dart && fvm flutter pub get
cd example && fvm flutter pub get
cd ../../ts && npm ci
```

## Running the checks

From `dart/` and again from `dart/example/`:

```sh
fvm flutter analyze
fvm flutter test
```

From `ts/`:

```sh
npm run typecheck
npm test
npm run build
```

CI runs the same commands on every pull request.

## How the pieces fit

The Dart package in `dart/` is the reference. `dart/tool/export.dart` writes `spec/faces.json` and
`spec/fixtures/*.json` from it. The TypeScript package in `ts/` reads `faces.json` and its tests
compare the draw ops it builds against the fixtures. `spec/SPEC.md` explains every field and op.

## Adding or changing a face

1. Change the Dart code in `dart/lib/`.
2. From `dart/`, run `fvm flutter test tool/export.dart`. It rewrites `spec/faces.json` and
   `spec/fixtures/`.
3. Make the same change in `ts/src/`, then run both suites: `fvm flutter test` in `dart/`,
   `npm test` in `ts/`.
4. From `ts/`, run `npm run gallery`. It rewrites `gallery/` from the new spec.
5. Open `gallery/contact-sheet.png` and the new or changed files in `gallery/`, and check they
   look right.
6. Commit the code, `spec/` and `gallery/` together.

If you changed what a field or op means, update `spec/SPEC.md` too. `npm test` in `ts/` fails
while `gallery/` is out of date with `spec/faces.json`.

## The gallery

`gallery/` holds every face and animation as ready-to-use files: SVG and PNG stills, and animated
WebP loops. `ts/scripts/gallery.mjs` writes all of it. It renders with `@resvg/resvg-js` and
encodes the WebP files with `sharp`, both dev dependencies, so it needs no system tools on macOS
or Linux. Never edit the files in `gallery/` by hand, apart from `AGENTS.md` and `CLAUDE.md`.

## Rules

- **The files in `spec/` are generated.** Never edit `faces.json` or anything in `fixtures/` by
  hand. Change the Dart code and run the export. `SPEC.md` is the one hand-written file there.
  `dart/test/spec_up_to_date_test.dart` fails when the files are stale.
- **Never loosen the parity tolerance.** `spec/SPEC.md` sets the tolerance the TypeScript tests
  use against the fixtures. If a parity test fails, fix the port. Do not raise the tolerance to
  make it pass.
- **Keep the two packages on one version.** `dart/pubspec.yaml` and `ts/package.json` always carry
  the same version. Add a line to both `CHANGELOG.md` files for any change a user would notice.
- **Write docs in plain English.** Short sentences, no marketing tone, no em dashes or en dashes.

## Releases

A release bumps the version in `dart/pubspec.yaml` and `ts/package.json`, adds a `CHANGELOG.md`
entry in each package, and tags the commit `vX.Y.Z`. Maintainers do this.
