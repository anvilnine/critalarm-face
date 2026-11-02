import 'dart:math' as math;
import 'dart:ui' show Color, Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

// ---------------------------------------------------------------------------
// Part helpers.
// ---------------------------------------------------------------------------

/// An eye at [centre]. [ball] is the radius of the white (0 for none), and
/// [hollow] draws the white as the head's colour.
EyeShape eye(
  Offset centre, {
  double ball = 0,
  double pupil = 11,
  Offset look = Offset.zero,
  bool hollow = false,
  double shine = 0,
  double squash = 1,
  double spiral = 0,
  double lid = 0,
  List<Offset>? lidPoints,
  double width = 10,
}) => EyeShape(
  centre: centre,
  ballRadius: ball,
  ballSquash: squash,
  ballWidth: width,
  ballIsHead: hollow,
  pupilRadius: pupil,
  pupilOffset: look,
  shineRadius: shine,
  shineOffset: const Offset(-4, -4),
  spiral: spiral,
  lid: lid,
  lidPoints: lidPoints ?? restingLid(centre),
  lidWidth: width,
);

/// A brow through three points, moved by [by].
BrowShape brow(
  Offset a,
  Offset b,
  Offset c, {
  Offset by = Offset.zero,
  double width = 11,
  double alpha = 1,
}) => BrowShape([a + by, b + by, c + by], width: width, alpha: alpha);

/// A pair of brows mirrored across the middle of the face. [a], [b] and [c]
/// describe the left one, outer end first.
(BrowShape, BrowShape) brows(
  Offset a,
  Offset b,
  Offset c, {
  Offset by = Offset.zero,
  double width = 11,
  double alpha = 1,
}) {
  Offset m(Offset p) => Offset(200 - p.dx, p.dy);
  return (
    brow(a, b, c, by: by, width: width, alpha: alpha),
    brow(m(c), m(b), m(a), by: by, width: width, alpha: alpha),
  );
}

/// Brows slammed down toward the nose, the way the alarm has always worn
/// them.
(BrowShape, BrowShape) alarmBrows({double lift = 0, double width = 11}) =>
    brows(
      const Offset(50, 58),
      const Offset(67, 63),
      const Offset(84, 68),
      by: Offset(0, -lift),
      width: width,
    );

/// Brows pulled up in the middle, for fear and sorrow.
(BrowShape, BrowShape) worriedBrows({double lift = 0, double width = 11}) =>
    brows(
      const Offset(48, 74),
      const Offset(65, 63),
      const Offset(86, 56),
      by: Offset(0, -lift),
      width: width,
    );

/// A boxy open mouth [w] by [h] around [centre], for gritted teeth. [bend]
/// pulls the corners down (positive) or up (negative).
List<Offset> gritMouth(Offset centre, double w, double h, {double bend = 0}) {
  Offset at(double u, double y) => Offset(
    centre.dx - w / 2 + w * u,
    y + bend * 4 * (u - 0.5) * (u - 0.5),
  );
  return lipsMouth(
    (u) => at(u, centre.dy + h / 2),
    (u) => at(u, centre.dy - h / 2),
  );
}

/// An open mouth whose lips ripple. [shift] slides the ripple along.
List<Offset> wavyOpen(
  Offset centre,
  double w,
  double h,
  double amp,
  double shift, {
  double waves = 2,
}) {
  double env(double u) => math.sqrt(math.sin(math.pi * u).clamp(0, 1));
  double ripple(double u, double off) =>
      amp * math.sin(tau * (waves * u + shift) + off);
  return lipsMouth(
    (u) => Offset(
      centre.dx - w / 2 + w * u,
      centre.dy + env(u) * h / 2 + ripple(u, 0),
    ),
    (u) => Offset(
      centre.dx - w / 2 + w * u,
      centre.dy - env(u) * h / 2 + ripple(u, 1.3),
    ),
  );
}

/// A shut mouth along a wave, for dazed and melting faces.
List<Offset> wavyLine(
  Offset centre,
  double w,
  double amp,
  double shift, {
  double waves = 1.5,
  double frown = 0,
}) => sampleMouth(
  (u) => Offset(
    centre.dx - w / 2 + w * u,
    centre.dy + amp * math.sin(tau * (waves * u + shift)) - frown * bump(u),
  ),
);

/// A mouth filled with ink through [points].
MouthShape inkMouth(List<Offset> points, {double width = 11}) =>
    MouthShape(points, width: width, fill: 1, fillsWithInk: true);

/// The white of the teeth.
const Color teethWhite = Color(0xFFFFFFFF);

/// A mouth filled with teeth white through [points].
MouthShape teethMouth(List<Offset> points) =>
    MouthShape(points, fill: 1, fillColor: teethWhite);

/// A row of teeth in the mouth at [centre], [w] by [h], bent by [bend].
RingFx teeth(Offset centre, double w, double h, {double bend = 0}) => RingFx(
  RingFxKind.teeth,
  at: centre,
  extent: Offset(w, h),
  phase: bend,
  onHead: true,
);

/// Rebuilds [face] with a different head, props, or both.
FaceShape withParts(
  FaceShape face, {
  HeadShape? head,
  List<PropShape>? props,
}) => FaceShape(
  leftEye: face.leftEye,
  rightEye: face.rightEye,
  mouth: face.mouth,
  leftBrow: face.leftBrow,
  rightBrow: face.rightBrow,
  head: head ?? face.head,
  props: props ?? face.props,
  tilt: face.tilt,
  nudge: face.nudge,
);

/// A drop flung along an arc from [from], [p] of the way through its flight.
/// It points back the way it came, so it reads as flying.
RingFx flung(
  RingFxKind kind,
  Offset from,
  Offset velocity,
  double gravity,
  double p, {
  double scale = 1,
  double alpha = 1,
}) {
  final at = from + velocity * p + Offset(0, gravity * p * p);
  final vx = velocity.dx;
  final vy = velocity.dy + 2 * gravity * p;
  return RingFx(
    kind,
    at: at,
    scale: scale,
    rotation: math.atan2(-vy, -vx) + math.pi / 2,
    alpha: alpha * (1 - seg(p, 0.7, 1)) * seg(p, 0, 0.08),
  );
}
