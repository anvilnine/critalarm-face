import 'dart:math' as math;
import 'dart:ui' show Color, Offset;

import 'package:critalarm_face/src/ops/build_face_ops.dart';
import 'package:critalarm_face/src/ops/face_op.dart';
import 'package:critalarm_face/src/ops/path_builder.dart';
import 'package:critalarm_face/src/palette.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// How wide the ringing stage is, in face units. The face's 200 unit box
/// sits in the middle, which leaves 40 units on every side for sweat, stars
/// and steam to fly into.
const double ringingStageUnits = 280;

/// The colours a ringing face is painted with.
class RingingColors {
  /// A set of ringing colours.
  const RingingColors({
    required this.fillColor,
    required this.strokeColor,
    required this.inkColor,
    required this.accentColor,
  });

  /// The colours from [palette]: its head and ink, with the alarm red for
  /// the outline and the red extras.
  factory RingingColors.fromPalette(CritPalette palette) => RingingColors(
    fillColor: palette.fill,
    strokeColor: palette.crit,
    inkColor: palette.ink,
    accentColor: palette.crit,
  );

  /// The head.
  final Color fillColor;

  /// The head outline.
  final Color strokeColor;

  /// Brows, pupils, lids and mouths.
  final Color inkColor;

  /// The alarm colour: the flush, the siren, the anger vein.
  final Color accentColor;
}

/// The circles a puff of steam is made of, as (middle, radius).
const List<(Offset, double)> steamCircles = [
  (Offset.zero, 14),
  (Offset(14, 5), 10),
  (Offset(-12, 6), 9),
  (Offset(2, -10), 9),
];

/// Turns one ringing [frame] into draw ops on the [ringingStageUnits] wide
/// stage, painted in [colors].
///
/// The order is: extras behind the head that stay put, then the head moved
/// by the frame's nudge, tilt and scale, with extras that ride on the head
/// drawn behind and in front of it, then extras in front that stay put. The
/// face itself is [buildFaceOps] nested inside.
List<FaceOp> buildRingingOps(RingingFrame frame, RingingColors colors) {
  final f = frame;
  final fill = Color.lerp(colors.fillColor, colors.accentColor, f.flush * 0.8)!;
  final headFill = Color.lerp(fill, colors.inkColor, f.flash)!;
  final ink = Color.lerp(colors.inkColor, fill, f.flash)!;
  final fx = _FxPainter(ink, headFill, colors);

  const inset = (ringingStageUnits - 200) / 2;
  final ops = <FaceOp>[const SaveOp(), const TranslateOp(inset, inset)];

  for (final x in f.fx) {
    if (!x.onHead && !x.inFront) fx.paint(ops, x);
  }

  final nudge = f.nudge + f.face.nudge;
  ops.addAll([
    const SaveOp(),
    TranslateOp(nudge.dx, nudge.dy),
    const TranslateOp(100, 100),
    RotateOp(f.tilt + f.face.tilt),
    ScaleOp(f.scale, f.scale),
    const TranslateOp(-100, -100),
  ]);

  for (final x in f.fx) {
    if (x.onHead && !x.inFront) fx.paint(ops, x);
  }

  final face = buildFaceOps(
    f.face,
    FaceStyle(
      fillColor: headFill,
      strokeColor: colors.strokeColor,
      inkColor: ink,
      spiralRotation: f.spin,
    ),
  );

  // Extras on the head squash with it, the way the features do.
  ops
    ..addAll(face)
    ..addAll([
      const SaveOp(),
      const TranslateOp(100, 100),
      ScaleOp(f.face.head.squashX, f.face.head.squashY),
      const TranslateOp(-100, -100),
    ]);
  for (final x in f.fx) {
    if (x.onHead && x.inFront) fx.paint(ops, x);
  }
  ops
    ..add(const RestoreOp())
    ..add(const RestoreOp());

  for (final x in f.fx) {
    if (!x.onHead && x.inFront) fx.paint(ops, x);
  }
  ops.add(const RestoreOp());
  return ops;
}

class _FxPainter {
  _FxPainter(this.ink, this.headFill, this.colors);

  final Color ink;
  final Color headFill;
  final RingingColors colors;

  static Color _a(Color c, double alpha) => c.withValues(alpha: c.a * alpha);

  static DrawOp _fill(OpShape shape, Color c) => DrawOp(shape, OpPaint.fill(c));

  static DrawOp _stroke(OpShape shape, Color c, double width) =>
      DrawOp(shape, OpPaint.stroke(c, width));

  static PathShape _line(Offset a, Offset b) =>
      (OpPathBuilder()
            ..moveTo(a)
            ..lineTo(b))
          .build();

  void paint(List<FaceOp> ops, RingFx fx) {
    final alpha = fx.alpha.clamp(0.0, 1.0);
    if (alpha <= 0 || fx.scale <= 0) return;
    final line = _a(ink, alpha);

    ops.addAll([
      const SaveOp(),
      TranslateOp(fx.at.dx, fx.at.dy),
      RotateOp(fx.rotation),
      ScaleOp(fx.scale, fx.scale),
    ]);

    switch (fx.kind) {
      case RingFxKind.soundWaves:
        // Three arcs either side of the head, rippling outward.
        for (final side in const [-1.0, 1.0]) {
          for (var i = 0; i < 3; i++) {
            final p = (fx.phase + i / 3) % 1;
            final r = 12 + p * 30;
            final arc = OpPathBuilder()
              ..arc(
                Offset(side * 84, 0),
                r,
                side < 0 ? math.pi * 0.75 : -math.pi * 0.25,
                math.pi * 0.5,
              );
            ops.add(_stroke(arc.build(), _a(line, 1 - p), 6));
          }
        }

      case RingFxKind.sweat:
      case RingFxKind.tear:
        final colour = fx.kind == RingFxKind.sweat
            ? CritColors.sweatBlue
            : CritColors.tearBlue;
        final drop = _dropPath(9);
        ops
          ..add(_fill(drop, _a(colour, alpha)))
          ..add(_stroke(drop, line, 3))
          ..add(
            _fill(
              const OvalShape(-2.5, 3, 2.2, 2.2),
              _a(CritColors.white, alpha),
            ),
          );

      case RingFxKind.drip:
        final drop = _dropPath(10, stretch: 1.6);
        ops
          ..add(_fill(drop, _a(headFill, alpha)))
          ..add(_stroke(drop, _a(colors.strokeColor, alpha), 4));

      case RingFxKind.steam:
        final cloud = circleUnionPath(steamCircles);
        ops
          ..add(_fill(cloud, _a(CritColors.white, alpha * 0.95)))
          ..add(_stroke(cloud, _a(line, 0.7), 3.5));

      case RingFxKind.angerVein:
        // Four bent strokes around a gap: the cartoon cross of a temper.
        final pen = _a(colors.accentColor, alpha);
        final bend =
            (OpPathBuilder()
                  ..moveTo(const Offset(4, -16))
                  ..quadTo(const Offset(4, -4), const Offset(16, -4)))
                .build();
        for (var i = 0; i < 4; i++) {
          ops.addAll([
            const SaveOp(),
            RotateOp(i * math.pi / 2),
            _stroke(bend, pen, 6),
            const RestoreOp(),
          ]);
        }

      case RingFxKind.question:
        final path = OpPathBuilder()
          ..moveTo(const Offset(-11, -12))
          ..cubicTo(
            const Offset(-11, -26),
            const Offset(12, -27),
            const Offset(12, -13),
          )
          ..cubicTo(
            const Offset(12, -3),
            const Offset(0, -3),
            const Offset(0, 7),
          );
        ops
          ..add(_stroke(path.build(), line, 7))
          ..add(_fill(const OvalShape(0, 19, 4.5, 4.5), line));

      case RingFxKind.exclaim:
        final bar =
            (OpPathBuilder()
                  ..moveTo(const Offset(-7, -26))
                  ..lineTo(const Offset(7, -26))
                  ..lineTo(const Offset(3, 6))
                  ..lineTo(const Offset(-3, 6))
                  ..close())
                .build();
        const dot = OvalShape(0, 16, 5, 5);
        for (final part in <OpShape>[bar, dot]) {
          ops
            ..add(_fill(part, _a(colors.accentColor, alpha)))
            ..add(_stroke(part, line, 3.5));
        }

      case RingFxKind.star:
        final star = OpPathBuilder();
        for (var i = 0; i < 10; i++) {
          final r = i.isEven ? 13.0 : 5.5;
          final a = -math.pi / 2 + i * math.pi / 5;
          final p = Offset(r * math.cos(a), r * math.sin(a));
          if (i == 0) {
            star.moveTo(p);
          } else {
            star.lineTo(p);
          }
        }
        star.close();
        final shape = star.build();
        ops
          ..add(_fill(shape, _a(CritColors.starYellow, alpha)))
          ..add(_stroke(shape, line, 3));

      case RingFxKind.bell:
        // A dome sitting on a short stem, which stands on the head.
        final dome =
            (OpPathBuilder()
                  ..moveTo(const Offset(-24, -6))
                  ..quadTo(const Offset(-24, -36), const Offset(0, -36))
                  ..quadTo(const Offset(24, -36), const Offset(24, -6))
                  ..close())
                .build();
        ops
          ..add(_stroke(_line(Offset.zero, const Offset(0, 14)), line, 7))
          ..add(_fill(dome, _a(CritColors.gold, alpha)))
          ..add(_stroke(dome, line, 5))
          ..add(_fill(const OvalShape(0, -38, 4.5, 4.5), line))
          ..add(
            _stroke(
              _line(const Offset(-12, -26), const Offset(-8, -30)),
              _a(CritColors.white, alpha * 0.9),
              3.5,
            ),
          );

      case RingFxKind.hammer:
        // Pivots at the top of the head and swings up between the bells.
        const knob = OvalShape(0, -44, 7, 7);
        ops
          ..add(_stroke(_line(Offset.zero, const Offset(0, -40)), line, 5))
          ..add(_fill(knob, _a(CritColors.gold, alpha)))
          ..add(_stroke(knob, line, 4));

      case RingFxKind.bolt:
        final bolt =
            (OpPathBuilder()
                  ..moveTo(const Offset(4, -24))
                  ..lineTo(const Offset(-10, 2))
                  ..lineTo(const Offset(0, 2))
                  ..lineTo(const Offset(-6, 24))
                  ..lineTo(const Offset(12, -6))
                  ..lineTo(const Offset(2, -6))
                  ..lineTo(const Offset(10, -24))
                  ..close())
                .build();
        ops
          ..add(_fill(bolt, _a(CritColors.starYellow, alpha)))
          ..add(_stroke(bolt, line, 3.5));

      case RingFxKind.siren:
        // Beams sweeping round behind a red dome.
        final sweep = fx.phase * 2 * math.pi;
        for (final offset in const [0.0, math.pi]) {
          final a = sweep + offset;
          final beam =
              (OpPathBuilder()
                    ..moveTo(const Offset(0, -14))
                    ..lineTo(
                      Offset(
                        130 * math.cos(a - 0.22),
                        -14 + 130 * math.sin(a - 0.22) * 0.45,
                      ),
                    )
                    ..lineTo(
                      Offset(
                        130 * math.cos(a + 0.22),
                        -14 + 130 * math.sin(a + 0.22) * 0.45,
                      ),
                    )
                    ..close())
                  .build();
          ops.add(_fill(beam, _a(colors.accentColor, alpha * 0.28)));
        }
        final dome = OpPathBuilder()
          ..moveTo(const Offset(-20, 0))
          ..lineTo(const Offset(-20, -14))
          ..arcToPoint(const Offset(-20, -14), const Offset(20, -14), 20)
          ..lineTo(const Offset(20, 0))
          ..close();
        final domeShape = dome.build();
        final glow = 0.75 + 0.25 * math.cos(sweep);
        ops
          ..add(_fill(const RRectShape(-28, -2, 56, 14, 4), line))
          ..add(_fill(domeShape, _a(colors.accentColor, alpha * glow)))
          ..add(_stroke(domeShape, line, 4.5))
          ..add(
            _stroke(
              _line(const Offset(-9, -18), const Offset(-9, -8)),
              _a(CritColors.white, alpha * 0.9),
              4,
            ),
          );

      case RingFxKind.speedLines:
        // Three lines trailing below where the head is heading.
        const lines = [(-22.0, 18.0), (0.0, 28.0), (22.0, 18.0)];
        for (final (dx, len) in lines) {
          ops.add(
            _stroke(_line(Offset(dx, 0), Offset(dx, len)), _a(line, 0.8), 5),
          );
        }

      case RingFxKind.teeth:
        // Drawn over a white mouth: a line along the bite and a few gaps
        // between the teeth, bent the same way the mouth is.
        final w = fx.extent.dx;
        final h = fx.extent.dy;
        final bend = fx.phase;
        double bent(double u) => bend * 4 * (u - 0.5) * (u - 0.5);
        final bite = OpPathBuilder()..moveTo(Offset(-w / 2 + 3, bent(0.05)));
        for (var i = 1; i <= 10; i++) {
          final u = 0.05 + 0.9 * i / 10;
          bite.lineTo(Offset(-w / 2 + w * u, bent(u)));
        }
        ops.add(_stroke(bite.build(), line, 3.5));
        for (final u in const [0.25, 0.5, 0.75]) {
          final x = -w / 2 + w * u;
          ops.add(
            _stroke(
              _line(
                Offset(x, -h / 2 + bent(u) + 2),
                Offset(x, h / 2 + bent(u) - 2),
              ),
              line,
              3.5,
            ),
          );
        }

      case RingFxKind.pulseRing:
        ops.add(
          _stroke(
            const RRectShape(-92, -92, 184, 184, 70),
            _a(colors.accentColor, alpha),
            6,
          ),
        );

      case RingFxKind.blush:
        for (final side in const [-1.0, 1.0]) {
          ops.add(
            _fill(
              OvalShape(side * 48, 24, 12, 6.5),
              _a(CritColors.blushPink, alpha),
            ),
          );
        }
    }
    ops.add(const RestoreOp());
  }

  /// A drop with its point up and its round end [r] across at the bottom.
  static PathShape _dropPath(double r, {double stretch = 1}) {
    final tip = Offset(0, -r * 1.9 * stretch);
    return (OpPathBuilder()
          ..moveTo(tip)
          ..quadTo(Offset(r * 1.05, -r * 0.4), Offset(r, r * 0.4))
          ..arcToPoint(Offset(r, r * 0.4), Offset(-r, r * 0.4), r)
          ..quadTo(Offset(-r * 1.05, -r * 0.4), tip)
          ..close())
        .build();
  }
}
