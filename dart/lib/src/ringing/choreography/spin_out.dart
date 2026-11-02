import 'dart:math' as math;
import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/motion.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// A full spin, then wobbling to a stop with swirling eyes.
RingingFrame spinOut(double t) {
  final spinP = easeInOutPoly(seg(t, 0, 0.45));
  final w = seg(t, 0.45, 1);
  final wobble = math.sin(tau * 3 * w) * (1 - w);
  final swirl = seg(t, 0, 0.1) * (1 - seg(t, 0.72, 0.95));
  final (lb, rb) = alarmBrows(lift: -2 * swirl);
  EyeShape e(Offset c) => eye(
    c,
    ball: 17,
    pupil: 6 + 10 * swirl,
    hollow: true,
    width: 11,
    spiral: swirl,
  );
  final stars = seg(t, 0.4, 0.5) * (1 - seg(t, 0.85, 1));
  return RingingFrame(
    face: FaceShape(
      leftEye: e(const Offset(70, 94)),
      rightEye: e(const Offset(130, 94)),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(
        wavyOpen(const Offset(100, 145), 34, 10 + 10 * swirl, 2, t * 3),
        width: 10,
      ),
      head: const HeadShape(strokeWidth: 12),
    ),
    spin: tau * t * 3,
    tilt: tau * spinP + deg(14) * wobble,
    nudge: Offset(6 * wobble, 0),
    fx: [
      RingFx(
        RingFxKind.speedLines,
        at: const Offset(-6, 100),
        rotation: math.pi / 2,
        alpha: bump(seg(t, 0.05, 0.42)),
      ),
      RingFx(
        RingFxKind.speedLines,
        at: const Offset(206, 100),
        rotation: -math.pi / 2,
        alpha: bump(seg(t, 0.05, 0.42)),
      ),
      for (var i = 0; i < 3; i++)
        () {
          final a = tau * (t * 2 + i / 3);
          return RingFx(
            RingFxKind.star,
            at: Offset(100 + 70 * math.cos(a), 4 + 14 * math.sin(a)),
            scale: (0.7 + 0.2 * math.sin(a)) * stars,
            alpha: stars,
            rotation: a,
            inFront: math.sin(a) > 0,
          );
        }(),
    ],
  );
}
