# Crit face spec

This file explains how Crit is drawn and animated, in enough detail to port
the face to another language. The Dart package in `dart/` is the reference.
Everything in this folder except this file is generated from it:

| File | What it holds |
|---|---|
| `faces.json` | Palettes, colours, timings, easing curves, every resting face, prop and extra kinds, ringing styles, idle beats, random samples. |
| `fixtures/ops.json` | Draw ops for every face (light and dark), blends between face pairs, and ringing frames. |
| `fixtures/shapes.json` | The numbers behind the blends and ringing frames in `ops.json`. |
| `fixtures/idle.json` | Three idle controller runs, event by event. |

Regenerate them from `dart/` with `fvm flutter test tool/export.dart`. The
Dart test `test/spec_up_to_date_test.dart` fails when they are stale.

A port is correct when it builds the same draw ops as `fixtures/ops.json` for
the same inputs. Pixels are compared per renderer; the ops are what must match
across languages.

## Numbers in the files

- Every fractional number is rounded to 6 decimal places, and whole numbers
  are written without a decimal point. Compare against the fixtures with an
  absolute tolerance of `1e-5`.
- A point is `[x, y]`.
- A colour is `[r, g, b, a]`, each 0 to 1, in sRGB. `[1, 0.788235, 0.235294, 1]`
  is `#FFC93C`.
- Angles are radians. y points down, so a positive angle turns clockwise on
  screen and angle 0 points right.
- `schemaVersion` is 1. It goes up when a field changes meaning or goes away.

## The box

A face is drawn in a 200 by 200 unit box with (0, 0) top left. Its middle is
(100, 100). The head is a rounded rectangle at x 12, y 12, 176 wide, 176 tall,
corner radius 66.

A ringing face is drawn on a 280 unit stage. The 200 unit box sits in its
middle, 40 units in from each side, which leaves room for sweat, stars and
steam around the head.

To show a face at `size` pixels, scale by `size / 200` (or `size / 280` for a
ringing stage) and replay the ops.

## Colours

`faces.json` `palettes` has `light` and `dark`, each with:

| Field | Used for |
|---|---|
| `fill` | The head. |
| `stroke` | The head outline on most faces. |
| `ink` | Brows, pupils, lids, mouth lines, props. |
| `high` | The outline of `worried`. |
| `crit` | The outline of `alarmed`; the outline, flush and red extras of a ringing face. |
| `cobalt` | The outline of `acked`. |

`strokeByState` names which palette field outlines each state. Everything else
uses `stroke`.

`colors` holds the fixed colours: `white` (eye whites, shines, puffs),
`darkInk` (a pupil on white when the ink is light), `mouthCoral` (the default
tongue), `heart`, `sweatBlue`, `tearBlue`, `gold`, `starYellow`, `blushPink`.

### Colour maths

These follow Flutter exactly. Channels are the 0 to 1 floats above.

- **lerp(a, b, t)**: each of r, g, b, a is `a * (1 - t) + b * t`, then clamped
  to 0..1.
- **withAlpha(c, k)**: the same colour with alpha `c.a * k`. Every "faded" or
  "alpha" in this spec means this.
- **luminance(c)**: each of r, g, b goes through
  `v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ^ 2.4`, then
  `0.2126 R + 0.7152 G + 0.0722 B`.
- **pupilOnWhite(ink)**: `darkInk` when `luminance(ink) > 0.5`, else `ink`.

## Numbers and lerp

`lerp(a, b, t)` for numbers is `a` when `a == b`, else `a * (1 - t) + b * t`.
Points lerp each coordinate the same way.

## A face (`FaceShape`)

`faces.json` `faces` maps each state name to its resting shape. Fields:

| Field | Meaning |
|---|---|
| `leftEye`, `rightEye` | See Eye. Left is the left of the screen. |
| `leftBrow`, `rightBrow` | See Brow. A face without brows still has both, with `alpha` 0. |
| `mouth` | See Mouth. |
| `head` | `squashX`, `squashY` (1 is normal size) and `strokeWidth` (outline pen). |
| `props` | Extras near the head. See Props. |
| `tilt` | Radians the whole head turns. Applied by the host, not the ops. |
| `nudge` | Box units the whole head moves. Applied by the host, not the ops. |

### Eye

| Field | Meaning |
|---|---|
| `centre` | Middle of the eye. |
| `ballRadius` | Radius of the white. 0 means a plain dot eye. |
| `ballSquash` | Height of the white against its width. 1 is round. |
| `ballWidth` | Pen width of the ring around the white. |
| `ballIsHead` | True fills the ring with the head colour instead of white. |
| `pupilRadius` | The dark middle. |
| `pupilOffset` | Where the pupil sits from `centre`. |
| `shineRadius`, `shineOffset` | A white dot on the pupil, offset from the pupil's middle. 0 radius draws none. |
| `spiral` | 0 to 1. Above 0 draws a swirl instead of a round pupil, at that alpha. |
| `lid` | 0 open, 1 shut. |
| `lidPoints` | Three points: left end, a point on the curve, right end. |
| `lidWidth` | Pen width of the lid. |

Worked-out values the ops and the lerp use:

- **ball** = `ballRadius > 0 ? ballRadius : pupilRadius`. A dot eye's white
  starts at the edge of its pupil.
- **whiteShowing** = `clamp((ball - pupilRadius) / 5, 0, 1)`.
- **isFlatLid** is true when all three `lidPoints` are exactly `[0, 0]`.
- **resolvedLidPoints** = `isFlatLid ? [centre + (-16, 0), centre, centre + (16, 0)] : lidPoints`.

### Brow

`points` (three, same layout as a lid), `width` (pen), `alpha` (0 to 1).

### Mouth

`points` is always 13 points, `width` is the pen (0 draws no line), `fill` is 0
to 1, `fillColor` is a colour or null, `fillsWithInk` is a boolean.

The 13 points go all the way round: the left corner, five points along the
lower lip, the right corner, five points back along the upper lip, then the
left corner of the upper lip. A closed mouth has both lips on the same curve.
With `lower(t)` and `upper(t)` for t from 0 (left) to 1 (right):

```
lipsMouth(lower, upper) = [
  lower(0), lower(1/6), lower(2/6), lower(3/6), lower(4/6), lower(5/6), lower(1),
  upper(5/6), upper(4/6), upper(3/6), upper(2/6), upper(1/6), upper(0),
]
sampleMouth(at)           = lipsMouth(at, at)
lineMouth(a, b)           = sampleMouth(t => lerp(a, b, t))
curveMouth(a, c, b)       = sampleMouth(t => quadAt(a, c, b, t))
ovalMouth(centre, rx, ry) = lipsMouth(
  t => centre + (rx cos(pi - pi t), ry sin(pi - pi t)),
  t => centre + (rx cos(pi + pi t), ry sin(pi + pi t)))
wedgeMouth(l, tip, r)     = lipsMouth(
  t => t <= 0.5 ? lerp(l, tip, 2t) : lerp(tip, r, 2t - 1),
  t => lerp(l, r, t))
quadAt(p0, p1, p2, t)     = p0 (1-t)^2 + p1 2(1-t)t + p2 t^2
```

The resting faces in `faces.json` are already evaluated. The helpers matter
for the ringing styles, which build mouths every frame.

The fill colour is `fillColor` when set, otherwise `ink` when `fillsWithInk`,
otherwise the style's tongue colour (default `mouthCoral`).

### Props

`kind` is one of `propKinds`: `popLines`, `zzz`, `puff`, `heart`,
`motionArcs`. `at` is where it sits, `scale` its size (1 normal), `alpha` 0 to 1.

## Blending two faces

`FaceShape.lerp(a, b, t)` blends part by part with the number lerp above,
with these exceptions:

- **Eye white**: `ballRadius` becomes `lerp(a.ball, b.ball, t)`, using the
  worked-out `ball`, not the raw field. A dot eye opening into a ringed eye
  grows its white out from behind the pupil.
- **Lid points**: lerp `a.resolvedLidPoints` to `b.resolvedLidPoints`.
- **`ballIsHead`** and **`fillsWithInk`**: `t < 0.5 ? a : b`. They flip at
  exactly 0.5, which takes `b`'s value.
- **`fillColor`**: both null gives null. One null fades the other: `a` null
  gives `b` with alpha times `t`; `b` null gives `a` with alpha times `1 - t`.
  Otherwise colour lerp.
- **Props** pair by kind. For each prop in `a`, in order, find the first prop
  in `b` with the same kind. If there is one, lerp them. If not, lerp it to its
  hidden copy. Then, for each prop in `b` whose kind is not in `a`, in order,
  lerp from its hidden copy to it. The hidden copy is the same kind and `at`
  with `scale` 0 and `alpha` 0. A prop lerp takes `a`'s kind and lerps `at`,
  `scale` and `alpha`.

`blinking` (used to make `blink` from `calm`) swaps each eye for a shut copy:
the same `centre`, `ballRadius`, `ballSquash`, `pupilRadius`, `pupilOffset`
and `lidWidth`, `lid` 1, `lidPoints` = `resolvedLidPoints`, and every other
field back to its default (`ballWidth` 7, `ballIsHead` false, shine 0, spiral
0). The shut copy is then passed through the eye lerp at t = 1, so its
`ballRadius` becomes `ball`. `fixtures/shapes.json` `blinking` has two worked
examples.

Field defaults, for building shapes: eye `ballRadius` 0, `ballSquash` 1,
`ballWidth` 7, `ballIsHead` false, `pupilRadius` 11, offsets (0, 0),
`shineRadius` 0, `spiral` 0, `lid` 0, `lidPoints` three `[0, 0]`, `lidWidth` 10.
Brow `width` 10, `alpha` 1; the resting brows are
`[[56,70],[71,70],[86,70]]` and `[[114,70],[129,70],[144,70]]` at alpha 0.
Mouth `width` 10, `fill` 0, `fillColor` null, `fillsWithInk` false. Head 1, 1,
10. Prop `at` (0, 0), `scale` 1, `alpha` 1.

## Draw ops

An op list is an array of objects with an `op` field. Replay them in order.

| `op` | Fields | Does |
|---|---|---|
| `save` | | Pushes the current transform and clip. |
| `restore` | | Pops back to the matching `save`. |
| `translate` | `dx`, `dy` | Moves the origin. |
| `rotate` | `radians` | Turns around the current origin, clockwise on screen. |
| `scale` | `sx`, `sy` | Scales around the current origin. |
| `clipOval` | `cx`, `cy`, `rx`, `ry` | Clips everything after it to that ellipse until the enclosing `restore`. |
| `fill` | `shape`, `color` | Fills the shape. Non-zero fill rule. |
| `stroke` | `shape`, `color`, `width`, `cap`, `join` | Strokes the outline. `cap` and `join` are always `round`. |

Shapes:

| `type` | Fields |
|---|---|
| `oval` | `cx`, `cy`, `rx`, `ry`. A circle has `rx == ry`. |
| `rrect` | `x`, `y`, `width`, `height`, `radius` (all four corners circular). |
| `path` | `commands`, each an array with its name first. |

Path commands:

| Command | Meaning |
|---|---|
| `["M", x, y]` | Start a new piece at (x, y). |
| `["L", x, y]` | Line to (x, y). |
| `["Q", cx, cy, x, y]` | Quadratic curve with control (cx, cy). |
| `["C", c1x, c1y, c2x, c2y, x, y]` | Cubic curve. |
| `["A", cx, cy, r, start, sweep]` | Circular arc round (cx, cy), from angle `start` for `sweep` radians (negative goes anticlockwise). If the path has a current point, first draw a line from it to the arc's start. If not, the arc starts the path. |
| `["Z"]` | Close the current piece. |

In HTML canvas, `A` is `ctx.arc(cx, cy, r, start, start + sweep, sweep < 0)`,
which already draws the joining line. In SVG, draw `L` to the start point, then
one or two `A` segments (split at a half turn; a full turn needs two).

### Face op order

`buildFaceOps(shape, style)`, where `style` has `fill`, `stroke`, `ink`,
`tongue` (null means `mouthCoral`), `lookDx` and `spiralRotation`
(`fixtures/ops.json` records the style for every case):

1. `save`.
2. If `head.squashX != 1` or `head.squashY != 1`: `translate 100 100`,
   `scale squashX squashY`, `translate -100 -100`.
3. Head: `fill` the head rrect with `fill`, then `stroke` it with `stroke` at
   `head.strokeWidth`.
4. Left brow, then right brow. For each, with `a = clamp(alpha, 0, 1)`, skip
   when `a <= 0`, else `stroke` the three point curve (below) with
   `withAlpha(ink, a)` at the brow's `width`.
5. Left eye, then right eye (below).
6. Mouth (below).
7. Each prop in order (below).
8. `restore`.

**Three point curve** through `p0, p1, p2`: `M p0`, `Q c p2` where
`c = 2 p1 - (p0 + p2) / 2`, so the curve passes through `p1`.

**Eye.** Let `open = clamp(1 - lid, 0, 1)`, `shut = clamp(lid, 0, 1)`.

If `open > 0`:

- `centre' = lerp(centre, resolvedLidPoints[1], shut)`. The eye squeezes
  toward the lid line as it shuts.
- The ball is the oval at `centre'` with `rx = ball`,
  `ry = ball * ballSquash * open`.
- The pupil sits at `centre' + (pupilOffset.x + lookDx, pupilOffset.y * open)`.
- `white = whiteShowing`.
- If `white > 0`: `fill` the ball with `withAlpha(ballIsHead ? fill : white, white)`,
  then `save`, then `clipOval` the ball.
- The pupil colour is `ink` when `ballIsHead`, else
  `lerp(ink, pupilOnWhite(ink), white)`.
- If `spiral > 0`: the swirl (below). Else if `pupilRadius > 0`: `fill` the
  oval at the pupil, `rx = pupilRadius`, `ry = pupilRadius * open`.
- If `shineRadius > 0`: `fill` with `white` the oval at
  `pupil + (shineOffset.x, shineOffset.y * open)`, `rx = shineRadius`,
  `ry = shineRadius * open`.
- If `white > 0`: `restore`, then `stroke` the ball with `withAlpha(ink, white)`
  at `ballWidth`.

If `shut > 0`: `stroke` the three point curve through `resolvedLidPoints` with
`withAlpha(ink, shut)` at `lidWidth`.

**Swirl**: a path from the pupil point `p` with radius `R`: `M p`, then for
`i` = 1 to 48, `t = i / 48`, angle `spiralRotation + t * 2.5 * 2 pi`,
`L p + R t (cos, sin)`. `stroke` it with `withAlpha(pupilColour, spiral)` at
width 4.

**Mouth.** The line path through the 13 points `m`: `M m[0]`, then for `i` = 1
to 11, `Q m[i] mid(m[i], m[i+1])`, then `L m[12]`. With
`f = clamp(fill, 0, 1)`:

- If `f > 0`: `fill` the same path plus `Z` with `withAlpha(fillColour, f)`.
- If `width > 0`: `stroke` the line path (no `Z`) with `ink` at `width`.

**Props.** Skip when `clamp(alpha, 0, 1) <= 0` or `scale <= 0`. `inkA` is
`withAlpha(ink, alpha)`, `s` is `scale`, `at` is the prop's `at`.

- `popLines`: for degrees -120, -90, -60, `d = (cos, sin)` of the angle,
  `stroke` `M at + 110 d`, `L at + (110 + 16 s) d` with `inkA` at 8.
- `zzz`: for `i` = 0, 1, 2: `size = (16 - 4 i) s`, `p = at + (13 i, -15 i) s`;
  `stroke` `M p`, `L p + (size, 0)`, `L p + (0, size)`, `L p + (size, size)`
  with `inkA` at `4 s`.
- `puff`: the outline of the circles in `faces.json` `puffCircles`, each moved
  to `at + circle.at * s` with radius `circle.radius * s`, merged into one shape
  (Cloud outlines, below). `fill` it with `withAlpha(white, alpha)`, then
  `stroke` it with `inkA` at `4.5 s`.
- `heart`: `M (at.x, at.y + 13s)`,
  `C (at.x - 16s, at.y + s) (at.x - 9s, at.y - 12s) (at.x, at.y - 4s)`,
  `C (at.x + 9s, at.y - 12s) (at.x + 16s, at.y + s) (at.x, at.y + 13s)`, `Z`;
  `fill` with `withAlpha(heart, alpha)`.
- `motionArcs`: for side -1 then 1, for spread 0 then 1:
  `r = (14 + 9 spread) s`; `stroke` the path `A (at.x + 96 side, at.y) r start 0.56 pi`
  with `start = side < 0 ? 0.72 pi : -0.28 pi`, `inkA` at `5 s`.

### Cloud outlines

A puff of breath and a puff of steam are several overlapping circles drawn as
one shape, so neither the fill nor the outline shows where they overlap. The
ops store that shape as arcs only:

1. For each circle `i`, in order: skip it if it lies inside another circle
   (`d + r_i <= r_j`; when two are identical, the earlier one is kept). For
   every circle `j` that overlaps it (`d < r_i + r_j` and neither inside the
   other), the covered span of `i`'s rim is
   `atan2(c_j - c_i) +/- acos((r_i^2 + d^2 - r_j^2) / (2 r_i d))`.
2. Wrap every span into 0..2 pi (splitting a span that crosses 2 pi), sort by
   start, merge overlapping ones. The gaps between merged spans are the parts
   of the rim that show, each an arc from the end of one span to the start of
   the next, the last one wrapping round (`to = first.start + 2 pi`). Gaps of
   `1e-9` or less are dropped. A circle nothing overlaps shows all of its rim
   (`start` 0, `sweep` 2 pi).
3. Chain the arcs: take the first unused arc, `M` its start point and `A` it.
   Then repeatedly take the unused arc whose start point is nearest this arc's
   end point, if within `1e-3`, and `A` it. When none is close, `Z` and start
   again with the next unused arc.

Crit's clouds have no holes, so each comes out as one loop.

## Ringing faces

A ringing face is a `RingingFrame`, computed from a style and a point `t` in
its loop (0 to 1, wrapping). Fields: `face` (a FaceShape), `tilt`, `nudge`,
`scale`, `flush` (0 to 1, how far the head fill has gone to the alarm red),
`flash` (0 to 1, how far fill and ink have swapped), `spin` (swirl turn),
`fx` (extras).

Each extra has `kind` (one of `ringFxKinds`), `at`, `scale`, `rotation`,
`alpha`, `onHead` (moves with the head), `inFront` (drawn over the head),
`phase` (0 to 1, drives some animations) and `extent` (width and height, used
by `teeth`).

`faces.json` `ringingStyles` lists the 18 styles with `periodMs` (one loop at
normal speed) and `stillT` (the point shown when motion is off).

### Choreography

The frame for each style is a plain function of `t`, in
`dart/lib/src/ringing/ringing_choreography.dart`. Port it line by line. The
timing helpers it uses:

```
frac(x)          = x - floor(x)
wave(t, n, ph=0) = sin(2 pi (t n + ph))
pulse(t, n, ph)  = 0.5 + 0.5 wave(t, n, ph)
seg(t, a, b)     = clamp((t - a) / (b - a), 0, 1)
ease(x)          = x < 0.5 ? 4x^3 : 1 - (-2x + 2)^3 / 2
elastic(x)       = x <= 0 ? 0 : x >= 1 ? 1 : 2^(-10x) sin((x - 0.075) 2 pi / 0.3) + 1
bump(x)          = sin(pi clamp(x, 0, 1))
snap(v, k=4)     = (e^(2kv) - 1) / (e^(2kv) + 1)
deg(d)           = d pi / 180
```

`ringingFrameFor(style, t)` first takes `frac(t)`. `fixtures/shapes.json`
`ringing` has every style at t 0, 0.25, 0.5, 0.75 and its `stillT`.

`RingingFrame.lerp(a, b, t)` lerps `face` (FaceShape lerp), `tilt`, `nudge`,
`scale`, `flush`, `flash`, `spin`, and sets `fx` to `a`'s extras with alpha
times `1 - t` followed by `b`'s with alpha times `t`. `shapes.json`
`ringingBlends` has examples.

### Ringing op order

`buildRingingOps(frame, colors)` with `colors` = `fill`, `stroke`, `ink`,
`accent`:

- `fill' = lerp(fill, accent, flush * 0.8)`
- `headFill = lerp(fill', ink, flash)`
- `ink' = lerp(ink, fill', flash)`

1. `save`, `translate 40 40`.
2. Extras with `!onHead && !inFront`.
3. `save`, `translate nudge` (frame `nudge` + face `nudge`), `translate 100 100`,
   `rotate` (frame `tilt` + face `tilt`), `scale` (`scale`, `scale`),
   `translate -100 -100`.
4. Extras with `onHead && !inFront`.
5. The face ops with style `fill = headFill`, `stroke = colors.stroke`,
   `ink = ink'`, `spiralRotation = spin`, no tongue, `lookDx` 0.
6. `save`, `translate 100 100`, `scale head.squashX head.squashY`,
   `translate -100 -100`; extras with `onHead && inFront`; `restore`; `restore`.
7. Extras with `!onHead && inFront`.
8. `restore`.

Each group keeps the order of `fx`.

### Extra ops

Skip an extra when `clamp(alpha, 0, 1) <= 0` or `scale <= 0`. Otherwise:
`save`, `translate at`, `rotate rotation`, `scale scale scale` (always all
three, even when they do nothing), the ops below, `restore`. `line` is
`withAlpha(ink', alpha)`; `a` is `alpha`.

| Kind | Ops |
|---|---|
| `soundWaves` | For side -1, 1; for i 0, 1, 2: `p = (phase + i/3) mod 1`, `r = 12 + 30p`; stroke `A (84 side, 0) r start 0.5pi` with `start = side < 0 ? 0.75pi : -0.25pi`, colour `withAlpha(line, 1 - p)`, width 6. |
| `sweat`, `tear` | Drop(9). Fill with `withAlpha(sweatBlue or tearBlue, a)`, stroke `line` 3, then fill oval (-2.5, 3) r 2.2 with `withAlpha(white, a)`. |
| `drip` | Drop(10, stretch 1.6). Fill `withAlpha(headFill, a)`, stroke `withAlpha(colors.stroke, a)` 4. |
| `steam` | Cloud outline of `steamCircles` (not scaled; the transform scales it). Fill `withAlpha(white, a * 0.95)`, stroke `withAlpha(line, 0.7)` 3.5. |
| `angerVein` | For i 0..3: `save`, `rotate i pi/2`, stroke `M 4 -16 Q 4 -4 16 -4` with `withAlpha(accent, a)` 6, `restore`. |
| `question` | Stroke `M -11 -12 C -11 -26 12 -27 12 -13 C 12 -3 0 -3 0 7` with `line` 7; fill oval (0, 19) r 4.5 with `line`. |
| `exclaim` | Bar `M -7 -26 L 7 -26 L 3 6 L -3 6 Z`, then dot oval (0, 16) r 5: each filled `withAlpha(accent, a)` then stroked `line` 3.5. |
| `star` | Ten points, i 0..9, radius 13 for even i and 5.5 for odd, angle `-pi/2 + i pi/5`: `M` the first, `L` the rest, `Z`. Fill `withAlpha(starYellow, a)`, stroke `line` 3. |
| `bell` | Stroke `M 0 0 L 0 14` `line` 7; dome `M -24 -6 Q -24 -36 0 -36 Q 24 -36 24 -6 Z` fill `withAlpha(gold, a)` then stroke `line` 5; fill oval (0, -38) r 4.5 `line`; stroke `M -12 -26 L -8 -30` `withAlpha(white, a * 0.9)` 3.5. |
| `hammer` | Stroke `M 0 0 L 0 -40` `line` 5; oval (0, -44) r 7 filled `withAlpha(gold, a)` then stroked `line` 4. |
| `bolt` | `M 4 -24 L -10 2 L 0 2 L -6 24 L 12 -6 L 2 -6 L 10 -24 Z`, fill `withAlpha(starYellow, a)`, stroke `line` 3.5. |
| `siren` | `sweep = phase 2 pi`. For offset 0, pi: `g = sweep + offset`, fill `M 0 -14 L (130 cos(g - 0.22), -14 + 58.5 sin(g - 0.22)) L (130 cos(g + 0.22), -14 + 58.5 sin(g + 0.22)) Z` with `withAlpha(accent, a * 0.28)`. Then fill rrect (-28, -2, 56, 14, r 4) with `line`; dome `M -20 0 L -20 -14 A 0 -14 20 pi pi L 20 0 Z` filled `withAlpha(accent, a * (0.75 + 0.25 cos(sweep)))` then stroked `line` 4.5; stroke `M -9 -18 L -9 -8` `withAlpha(white, a * 0.9)` 4. (The arc starts where the line before it ends, so its joining line has no length.) |
| `speedLines` | For (dx, len) in (-22, 18), (0, 28), (22, 18): stroke `M dx 0 L dx len` with `withAlpha(line, 0.8)` 5. |
| `teeth` | `w, h = extent`, `bend = phase`, `bent(u) = bend 4 (u - 0.5)^2`. Stroke `M (-w/2 + 3, bent(0.05))` then for i 1..10, `u = 0.05 + 0.09 i`, `L (-w/2 + w u, bent(u))`, `line` 3.5. For u 0.25, 0.5, 0.75: stroke `M (x, -h/2 + bent(u) + 2) L (x, h/2 + bent(u) - 2)` with `x = -w/2 + w u`, `line` 3.5. |
| `pulseRing` | Stroke rrect (-92, -92, 184, 184, r 70) with `withAlpha(accent, a)` 6. |
| `blush` | For side -1, 1: fill oval (48 side, 24) rx 12 ry 6.5 with `withAlpha(blushPink, a)`. |

`Drop(r, stretch = 1)`: with `tip = (0, -1.9 r stretch)`:
`M tip`, `Q (1.05 r, -0.4 r) (r, 0.4 r)`, `A (0, 0.4 r) r 0 pi`,
`Q (-1.05 r, -0.4 r) tip`, `Z`. The arc is the round bottom of the drop, a half
turn from the right side to the left.

## Motion

Easing curves in `faces.json` `motion.easing` are cubic Beziers from (0, 0) to
(1, 1) with control points `cubicBezier = [a, b, c, d]`, evaluated the way
Flutter does, which is not an exact solve:

```
transform(t):
  if t == 0 or t == 1: return t
  lo = 0, hi = 1
  loop:
    m = (lo + hi) / 2
    x = 3a(1-m)^2 m + 3c(1-m) m^2 + m^3
    if |t - x| < 0.001: return 3b(1-m)^2 m + 3d(1-m) m^2 + m^3
    if x < t: lo = m else hi = m
```

Each curve lists 21 samples to test against.

- `easeInOut` `[0.42, 0, 0.58, 1]`: the live face animations and the
  ringing shuffle blend.
- `easeInOutCubic` `[0.645, 0.045, 0.355, 1]`: idle face blends.

`motion.durationsMs` are the loop lengths. The live face widget does these,
around the outside of the ops (the ops never move):

| State | Controller | Per frame, `v` the controller value 0 to 1 |
|---|---|---|
| `alarmed` | `alarmedShake`, back and forth | rotate `baseTilt + deg(-3 + 6v)` around (0.5, 0.6) of the face. |
| `shocked` | `shockedShake`, back and forth | move down `-1 + 2v` pixels, rotate `baseTilt + deg(-2 + 4v)` around the middle. |
| `watching` | `watchingLook`, repeating | `lookDx = watchingLookDx(v)`, samples in `motion.watchingLookDx`: 0 until 0.4, eases to -18 by 0.5, holds, eases back from 0.9 to 1. |
| `dizzy` | `dizzySpin`, repeating | `spiralRotation = 2 pi v`, rotate `baseTilt + sin(4 pi v) deg(3)`. |
| `laughing` | `laughingBounce`, back and forth | move up `5 easeInOut(v)` pixels. |
| `confused` | `confusedSway`, back and forth | rotate `deg(-6 - 5 easeInOut(v))`. |

`baseTilt` is the widget's tilt, or the state's `defaultTilt` in `states`
(confused is -8 degrees), plus the shape's `tilt` when a shape is passed.

A shuffling ringing face shows a style for `ringingHold`, then picks the next
with `nextRingingStyle` and blends into it over `ringingBlend` with
`RingingFrame.lerp(current, next, easeInOut(progress))`, each style playing its
own loop from the moment it started. `nextRingingStyle(current, random)` picks
`k = random.nextInt(17)` and returns style `k` if `k < current.index`, else
style `k + 1`.

## Idle face

The idle face is calm, and every few seconds plays a beat: blends into
another face, holds it, and blends back. `faces.json` `idle` holds every
number below.

A beat has `face`, `weight`, `enterMs`, `holdMs`, `leaveMs` and an optional
`thenPlay` beat that follows straight on.

The controller runs this loop, starting with `awake = 0`:

1. `gap = minGapMs + random.nextInt(maxGapMs - minGapMs + 1)`. Wait `gap`.
   `awake += gap`.
2. If `awake >= (night ? dozeAfterAtNightMs : dozeAfterMs)`, nod off (below)
   and stop the loop.
3. Pick a beat: each beat's weight is `weight`, plus `nightLift` if it is night
   and the beat's face is in `tiredFaces`. `roll = random.nextInt(total)`; walk
   the beats in order subtracting each weight, and take the first that takes
   `roll` below 0.
4. Play it (below), then go to 1.

It is night when the hour is before `dayStarts` or at or after `dayEnds`.
The random number generator is drawn from exactly twice per loop, gap first.

Playing a beat `b` sets the phase and waits, reporting each change:

- `entering` with beat `b.face`, blend `b.enterMs`; wait `b.enterMs`.
- `holding`; wait `b.holdMs`.
- If `b.thenPlay` is `n`: `entering` with `n.face`, blend `n.enterMs`; wait;
  `holding`; wait `n.holdMs`; `leaving` with blend `n.leaveMs`; wait.
- Otherwise `leaving` with blend `b.leaveMs`; wait.
- `resting` with beat `calm`.

Nodding off: `entering` `sleepy` blend `sleepyEnterMs`, wait it; `holding`,
wait `sleepyHoldMs`; `entering` `dozing` blend `dozingEnterMs`, wait it; then
phase `dozing`, and nothing happens until a tap. A tap resets `awake` to 0,
plays the `waking` beat, and restarts the loop at step 1.

What the face shows: in `entering`, `lerp(from, beatFace, easeInOutCubic(p))`
where `p` runs 0 to 1 over the blend and `from` is whatever the face showed
the moment `entering` began (calm, or the previous beat mid way). In
`holding` and `dozing`, the beat face. In `leaving`,
`lerp(beatFace, calm, easeInOutCubic(p))`. In `resting`, calm.

`fixtures/idle.json` has three runs, each event with the virtual time in ms,
the phase, the beat face and the blend length. Waits take exactly their
length, so the times add up. A `{"tap": "wake"}` entry marks the tap.

## Randomness

Anything random takes a generator so runs can be repeated. The shared one is
mulberry32, all arithmetic on unsigned 32 bit integers:

```
state = seed mod 2^32
nextUint32():
  state = (state + 0x6D2B79F5) mod 2^32
  t = imul(state xor (state >>> 15), state or 1)
  t = t xor (t + imul(t xor (t >>> 7), t or 61))   (mod 2^32)
  return t xor (t >>> 14)
nextDouble() = nextUint32() / 2^32
nextInt(max) = floor(nextDouble() * max)
```

`imul` is the low 32 bits of the product. `faces.json` `random.samples` has
the first eight values for four seeds.
