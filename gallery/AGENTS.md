# gallery

Every Crit face and animation as files people can use straight away. `README.md` in this folder
shows them all.

## What is here

| Path | What it holds |
|---|---|
| `faces/light/`, `faces/dark/` | Every face state as SVG and as a 512 px PNG, transparent. |
| `motion/` | An animated WebP loop of each face that moves when live (shake, look, spin, bounce, sway). |
| `ringing/` | One full loop of each ringing style, as animated WebP. |
| `idle.webp` | Ten seconds of the idle face, from a fixed seed. |
| `contact-sheet.png` | Every face in the light palette, labelled. |
| `README.md` | A table of every file, so the folder reads well on GitHub. |
| `manifest.json` | The package version, a hash of `spec/faces.json`, and every file with its size. |

File names are the state and style names from `spec/faces.json` in kebab case: `lookLeft` becomes
`look-left.png`.

## Every file is generated

`ts/scripts/gallery.mjs` writes everything here apart from this file and `CLAUDE.md`. Never edit
the other files by hand. The script deletes files it no longer writes, such as a removed face.

Regenerate with:

```sh
cd ts && npm run gallery
```

## When to run it

Run it after any change to `spec/faces.json`: a new or changed face, ringing style, palette,
timing or live motion. `ts/test/gallery.test.ts` fails in `npm test` when the hash in
`manifest.json` does not match `spec/faces.json`, when a face or ringing style has no files, or
when a listed file is missing.

The output is the same on every run for the same spec, since every frame comes from a fixed clock
and a fixed seed. The test does not compare image bytes, because encoders can differ between
machines.

## How to review

1. Open `contact-sheet.png` and check every face looks like Crit, with nothing cut off.
2. Open `README.md` on GitHub, or the new or changed files, and play the WebP loops.
3. Commit `gallery/` in the same commit as the `spec/` change.

## Size budget

Keep the whole folder under 15 MB and each WebP under about 400 KB. It is about 5.5 MB now. If a
new animation pushes past that, lower the WebP size or frame rate in `gallery.mjs` rather than
dropping files.
