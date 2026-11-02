import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/motion.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// Melting into a puddle of drips, then snapping back.
RingingFrame meltdown(double t) {
  final down = easeInOutPoly(seg(t, 0.05, 0.6));
  final back = elastic(seg(t, 0.76, 1));
  final m = down * (1 - back);
  final squashY = 1 - 0.3 * m;
  final squashX = 1 + 0.2 * m;
  final (lb, rb) = brows(
    const Offset(52, 66),
    const Offset(68, 62),
    const Offset(86, 60),
    by: Offset(0, 12 * m),
  );
  final drips = <RingFx>[];
  const dripXs = [48.0, 86.0, 124.0, 158.0];
  for (var i = 0; i < dripXs.length; i++) {
    final p = frac(t * 2 + i * 0.27);
    drips.add(
      RingFx(
        RingFxKind.drip,
        at: Offset(100 + (dripXs[i] - 100) * squashX, 184 + 34 * p * p),
        scale: 0.7 + 0.4 * m,
        alpha: seg(m, 0.15, 0.5) * (1 - p),
      ),
    );
  }
  return RingingFrame(
    face: FaceShape(
      leftEye: eye(
        Offset(66 - 6 * m, 94 + 10 * m),
        ball: 17,
        squash: 1 - 0.4 * m,
        pupil: 7,
        shine: 2.5,
        look: Offset(0, 5 * m),
      ),
      rightEye: eye(
        Offset(134 + 6 * m, 94 + 10 * m),
        ball: 17,
        squash: 1 - 0.4 * m,
        pupil: 7,
        shine: 2.5,
        look: Offset(0, 5 * m),
      ),
      leftBrow: lb,
      rightBrow: rb,
      mouth: MouthShape(
        wavyLine(
          Offset(100, 144 + 8 * m),
          48 + 12 * m,
          3 * m,
          t * 4,
          waves: 2,
          frown: 8,
        ),
      ),
      head: HeadShape(squashX: squashX, squashY: squashY),
    ),
    nudge: Offset(0, 88 * (1 - squashY)),
    tilt: deg(2) * wave(t, 6) * m,
    flush: 0.5 * m.clamp(0, 1),
    fx: [
      ...drips,
      RingFx(
        RingFxKind.sweat,
        at: Offset(150, 44 + 20 * frac(t * 2)),
        scale: 0.8,
        alpha: m.clamp(0, 1) * (1 - frac(t * 2)),
        onHead: true,
      ),
    ],
  );
}
