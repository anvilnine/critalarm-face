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
| `docs/images/` | README image, drawn by `ts/scripts/readme-image.mjs`. |

## Commands

Flutter goes through fvm (version in `.fvmrc`).

| Where | Command |
|---|---|
| `dart/`, `dart/example/` | `fvm flutter analyze`, `fvm flutter test` |
| `dart/` | `fvm flutter test tool/export.dart` (regenerate `spec/`) |
| `ts/` | `npm run typecheck`, `npm test`, `npm run build` |

## Rules

- **Never hand-edit `spec/faces.json` or `spec/fixtures/`.** Change the Dart code, run the export,
  commit the result with the code.
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
