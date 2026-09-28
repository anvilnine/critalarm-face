import 'dart:math' as math;
import 'dart:ui' show Color, Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ops/face_op.dart';
import 'package:critalarm_face/src/ops/path_builder.dart';
import 'package:critalarm_face/src/palette.dart';

/// The colours and live values a face is painted with.
class FaceStyle {
  /// A style in the given colours.
  const FaceStyle({
    required this.fillColor,
    required this.strokeColor,
    required this.inkColor,
    this.tongueColor,
    this.lookDx = 0,
    this.spiralRotation = 0,
  });

  /// The colours from [palette], with the outline [palette] gives a face
  /// in its resting colours.
  factory FaceStyle.fromPalette(
    CritPalette palette, {
    Color? strokeColor,
    Color? tongueColor,
    double lookDx = 0,
    double spiralRotation = 0,
  }) => FaceStyle(
    fillColor: palette.fill,
    strokeColor: strokeColor ?? palette.stroke,
    inkColor: palette.ink,
    tongueColor: tongueColor,
    lookDx: lookDx,
    spiralRotation: spiralRotation,
  );

  /// The head.
  final Color fillColor;

  /// The head outline.
  final Color strokeColor;

  /// Brows, pupils, lids and mouths.
  final Color inkColor;

  /// Fills an open mouth that does not name its own colour. Null means
  /// [mouthCoral].
  final Color? tongueColor;

  /// Slides both pupils sideways, in box units. The watching face drifts
  /// its eyes with this.
  final double lookDx;

  /// Turns the swirl in a spiral eye, in radians.
  final double spiralRotation;
}

/// What a pupil is drawn in when it sits on the white of an eye. A light ink
/// (dark mode) would vanish on white, so it turns dark there.
Color pupilOnWhite(Color ink) =>
    ink.computeLuminance() > 0.5 ? CritColors.darkInk : ink;

/// Turns [shape] into draw ops in the 200 unit box, painted in [style].
///
/// The list starts with a save and ends with the matching restore. It does
/// not scale to a size on screen and does not apply [FaceShape.tilt] or
/// [FaceShape.nudge]: the widget does both around the outside, so the host
/// decides how big the face is and how it moves.
List<FaceOp> buildFaceOps(FaceShape shape, FaceStyle style) {
  final ops = <FaceOp>[const SaveOp()];

  // A squashed head takes everything drawn on it along, so the features
  // never slide off a head that has changed shape.
  if (shape.head.squashX != 1 || shape.head.squashY != 1) {
    ops
      ..add(const TranslateOp(100, 100))
      ..add(ScaleOp(shape.head.squashX, shape.head.squashY))
      ..add(const TranslateOp(-100, -100));
  }

  const head = RRectShape(12, 12, 176, 176, 66);
  ops
    ..add(DrawOp(head, OpPaint.fill(style.fillColor)))
    ..add(
      DrawOp(head, OpPaint.stroke(style.strokeColor, shape.head.strokeWidth)),
    );

  for (final brow in [shape.leftBrow, shape.rightBrow]) {
    _brow(ops, brow, style);
  }
  for (final eye in [shape.leftEye, shape.rightEye]) {
    _eye(ops, eye, style);
  }
  _mouth(ops, shape.mouth, style);
  for (final prop in shape.props) {
    _prop(ops, prop, style);
  }

  ops.add(const RestoreOp());
  return ops;
}

Color _alpha(Color c, double alpha) => c.withValues(alpha: c.a * alpha);

/// A curve through three points, where the middle one sits on the curve
/// itself. The control point is pulled back out so it does.
PathShape _through(List<Offset> p) {
  final control = p[1] * 2 - (p[0] + p[2]) / 2;
  return (OpPathBuilder()
        ..moveTo(p[0])
        ..quadTo(control, p[2]))
      .build();
}

void _brow(List<FaceOp> ops, BrowShape brow, FaceStyle style) {
  final alpha = brow.alpha.clamp(0.0, 1.0);
  if (alpha <= 0) return;
  ops.add(
    DrawOp(
      _through(brow.points),
      OpPaint.stroke(_alpha(style.inkColor, alpha), brow.width),
    ),
  );
}

void _eye(List<FaceOp> ops, EyeShape eye, FaceStyle style) {
  final open = (1 - eye.lid).clamp(0.0, 1.0);
  final shut = eye.lid.clamp(0.0, 1.0);
  final ink = style.inkColor;

  if (open > 0) {
    // A lid comes down over an eye, it does not fade through it. So the eye
    // is squeezed flat against the lid line as it shuts, and what is left of
    // it is what you see under a half closed lid.
    final lidMiddle = eye.resolvedLidPoints[1];
    final centre = Offset.lerp(eye.centre, lidMiddle, shut)!;
    final squeeze = open;

    final ball = OvalShape(
      centre.dx,
      centre.dy,
      eye.ball,
      eye.ball * eye.ballSquash * squeeze,
    );
    final pupil =
        centre +
        Offset(eye.pupilOffset.dx + style.lookDx, eye.pupilOffset.dy * squeeze);
    // A plain dot has no white showing at all. As the eye opens the white
    // and its ring fade up together, so the ring never draws itself tight
    // around a pupil it is the same size as.
    final white = eye.whiteShowing;

    if (white > 0) {
      // Most ringed eyes have a white behind the pupil. The alarm's wide ring
      // leaves the head showing through instead.
      final inside = eye.ballIsHead ? style.fillColor : CritColors.white;
      ops
        ..add(DrawOp(ball, OpPaint.fill(_alpha(inside, white))))
        // The pupil is kept inside the white, so an eye looking hard to one
        // side crowds the edge instead of leaking past it.
        ..add(const SaveOp())
        ..add(ClipOvalOp(ball));
    }

    // The pupil moves to its on-white colour as the white fades in, so a dot
    // eye opening into a ringed eye never flips colour in one frame.
    final pupilColor = eye.ballIsHead
        ? ink
        : Color.lerp(ink, pupilOnWhite(ink), white)!;
    if (eye.spiral > 0) {
      _spiral(ops, pupil, eye.pupilRadius, eye.spiral, pupilColor, style);
    } else if (eye.pupilRadius > 0) {
      ops.add(
        DrawOp(
          OvalShape(
            pupil.dx,
            pupil.dy,
            eye.pupilRadius,
            eye.pupilRadius * squeeze,
          ),
          OpPaint.fill(pupilColor),
        ),
      );
    }
    if (eye.shineRadius > 0) {
      final at =
          pupil + Offset(eye.shineOffset.dx, eye.shineOffset.dy * squeeze);
      ops.add(
        DrawOp(
          OvalShape(at.dx, at.dy, eye.shineRadius, eye.shineRadius * squeeze),
          const OpPaint.fill(CritColors.white),
        ),
      );
    }

    if (white > 0) {
      ops
        ..add(const RestoreOp())
        ..add(DrawOp(ball, OpPaint.stroke(_alpha(ink, white), eye.ballWidth)));
    }
  }

  if (shut > 0) {
    ops.add(
      DrawOp(
        _through(eye.resolvedLidPoints),
        OpPaint.stroke(_alpha(ink, shut), eye.lidWidth),
      ),
    );
  }
}

/// Two and a half turns of a swirl, for the dizzy eyes.
void _spiral(
  List<FaceOp> ops,
  Offset centre,
  double radius,
  double alpha,
  Color color,
  FaceStyle style,
) {
  if (alpha <= 0) return;
  final path = OpPathBuilder()..moveTo(centre);
  const steps = 48;
  const turns = 2.5;
  for (var i = 1; i <= steps; i++) {
    final t = i / steps;
    final angle = style.spiralRotation + t * turns * 2 * math.pi;
    final r = radius * t;
    path.lineTo(
      Offset(centre.dx + r * math.cos(angle), centre.dy + r * math.sin(angle)),
    );
  }
  ops.add(DrawOp(path.build(), OpPaint.stroke(_alpha(color, alpha), 4)));
}

void _mouth(List<FaceOp> ops, MouthShape mouth, FaceStyle style) {
  final m = mouth.points;
  // A smooth curve through the midpoints, so a wiggle reads as a wave and
  // not a zigzag.
  void trace(OpPathBuilder path) {
    path.moveTo(m.first);
    for (var i = 1; i < m.length - 1; i++) {
      path.quadTo(m[i], Offset.lerp(m[i], m[i + 1], 0.5)!);
    }
    path.lineTo(m.last);
  }

  final fill = mouth.fill.clamp(0.0, 1.0);
  if (fill > 0) {
    final inside = OpPathBuilder();
    trace(inside);
    inside.close();
    // A dark mouth follows the ink so it reads in both themes. Everything
    // else is a tongue, which is coral whatever the theme is doing.
    final colour =
        mouth.fillColor ??
        (mouth.fillsWithInk
            ? style.inkColor
            : (style.tongueColor ?? mouthCoral));
    ops.add(DrawOp(inside.build(), OpPaint.fill(_alpha(colour, fill))));
  }
  if (mouth.width > 0) {
    final line = OpPathBuilder();
    trace(line);
    ops.add(DrawOp(line.build(), OpPaint.stroke(style.inkColor, mouth.width)));
  }
}

void _prop(List<FaceOp> ops, PropShape prop, FaceStyle style) {
  final alpha = prop.alpha.clamp(0.0, 1.0);
  if (alpha <= 0 || prop.scale <= 0) return;
  final ink = _alpha(style.inkColor, alpha);

  switch (prop.kind) {
    case PropKind.popLines:
      // Three short lines fanned above the head.
      for (final degrees in const [-120.0, -90.0, -60.0]) {
        final angle = degrees * math.pi / 180;
        final dir = Offset(math.cos(angle), math.sin(angle));
        final line = OpPathBuilder()
          ..moveTo(prop.at + dir * 110)
          ..lineTo(prop.at + dir * (110 + 16 * prop.scale));
        ops.add(DrawOp(line.build(), OpPaint.stroke(ink, 8)));
      }

    case PropKind.zzz:
      // Three Z's climbing away, each smaller than the one before it.
      for (var i = 0; i < 3; i++) {
        final size = (16 - i * 4) * prop.scale;
        final at = prop.at + Offset(i * 13.0, -i * 15.0) * prop.scale;
        final z = OpPathBuilder()
          ..moveTo(at)
          ..lineTo(Offset(at.dx + size, at.dy))
          ..lineTo(Offset(at.dx, at.dy + size))
          ..lineTo(Offset(at.dx + size, at.dy + size));
        ops.add(DrawOp(z.build(), OpPaint.stroke(ink, 4 * prop.scale)));
      }

    case PropKind.puff:
      // A small cloud, traced as one outline so neither the fill nor the
      // line shows where its circles overlap.
      final cloud = circleUnionPath([
        for (final (at, r) in puffCircles)
          (prop.at + at * prop.scale, r * prop.scale),
      ]);
      ops
        ..add(DrawOp(cloud, OpPaint.fill(_alpha(CritColors.white, alpha))))
        ..add(DrawOp(cloud, OpPaint.stroke(ink, 4.5 * prop.scale)));

    case PropKind.heart:
      final s = prop.scale;
      final a = prop.at;
      final heart = OpPathBuilder()
        ..moveTo(Offset(a.dx, a.dy + 13 * s))
        ..cubicTo(
          Offset(a.dx - 16 * s, a.dy + 1 * s),
          Offset(a.dx - 9 * s, a.dy - 12 * s),
          Offset(a.dx, a.dy - 4 * s),
        )
        ..cubicTo(
          Offset(a.dx + 9 * s, a.dy - 12 * s),
          Offset(a.dx + 16 * s, a.dy + 1 * s),
          Offset(a.dx, a.dy + 13 * s),
        )
        ..close();
      ops.add(
        DrawOp(heart.build(), OpPaint.fill(_alpha(CritColors.heart, alpha))),
      );

    case PropKind.motionArcs:
      // A pair of curved lines either side of the head, for a shake.
      for (final side in const [-1.0, 1.0]) {
        for (final spread in const [0.0, 1.0]) {
          final r = (14 + spread * 9) * prop.scale;
          final arc = OpPathBuilder()
            ..arc(
              prop.at + Offset(side * 96, 0),
              r,
              side < 0 ? math.pi * 0.72 : -math.pi * 0.28,
              math.pi * 0.56,
            );
          ops.add(DrawOp(arc.build(), OpPaint.stroke(ink, 5 * prop.scale)));
        }
      }
  }
}

/// The circles a puff of breath is made of, as (offset from the prop's
/// middle, radius) at scale 1.
const List<(Offset, double)> puffCircles = [
  (Offset.zero, 14),
  (Offset(16, 6), 10),
  (Offset(-3, 14), 9),
];
