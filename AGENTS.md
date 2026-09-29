# critalarm-face

Rules for AI coding agents working in this repo. Read `README.md` and `CONTRIBUTING.md` too.

## Layout

| Path | What it holds |
|---|---|
| `dart/` | Flutter package `critalarm_face`. The reference for how Crit looks. |
| `dart/example/` | Flutter example app. |
| `dart/tool/export.dart` | Writes everything in `spec/` except `SPEC.md`. |
| `ts/` | npm package `@anvilnine/critalarm-face`, a port of the Dart package. |
| `spec/` | `SPEC.md` (hand-written), `faces.json` and `fixtures/` (generated). |
| `gallery/` | Every face and animation as SVG, PNG and WebP, written by `ts/scripts/gallery.mjs`. |

## Commands

Flutter goes through fvm (version in `.fvmrc`).

| Where | Command |
|---|---|
| `dart/`, `dart/example/` | `fvm flutter analyze`, `fvm flutter test` |
| `dart/` | `fvm flutter test tool/export.dart` (regenerate `spec/`) |
| `ts/` | `npm run typecheck`, `npm test`, `npm run build` |
| `ts/` | `npm run gallery` (regenerate `gallery/`) |

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

## Rules

- **Never hand-edit `spec/faces.json` or `spec/fixtures/`.** Change the Dart code, run the export,
  commit the result with the code.
- **Never hand-edit `gallery/`** apart from its `AGENTS.md` and `CLAUDE.md`. Run `npm run gallery`.
- **Never loosen the parity tolerance in `spec/SPEC.md`** to make a test pass. Fix the port.
- **A change to a face lands in both packages** in the same change, with both suites green.
- **Both packages share one version.** Keep `dart/pubspec.yaml` and `ts/package.json` equal.
- **Plain English** in docs, comments, identifiers and commit messages. Short sentences. No em
  dash (U+2014) or en dash (U+2013) characters in any tracked file.
- **This repo is public.** Nothing private goes in: no prices or plans, no keys or tokens, no Apple team
  ids, no personal paths or email addresses, and no server
  hostnames other than `critalarm.app`.
- CI runs on GitHub-hosted runners only. Never add a self-hosted runner to a workflow here.
- Pin third-party actions to a full commit SHA with the version in a comment.
