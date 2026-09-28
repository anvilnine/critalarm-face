## What changed

<!-- One or two lines. Link the issue if there is one. -->

## Checklist

- [ ] If Dart face code changed, I ran `fvm flutter test tool/export.dart` in `dart/` and committed the `spec/` changes.
- [ ] I did not edit `spec/faces.json` or `spec/fixtures/` by hand.
- [ ] `fvm flutter analyze` and `fvm flutter test` pass in `dart/` and `dart/example/`.
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass in `ts/`.
- [ ] A face change is made in both packages.
- [ ] I did not loosen the parity tolerance in `spec/SPEC.md`.
- [ ] User-facing changes have a line in both `CHANGELOG.md` files.
