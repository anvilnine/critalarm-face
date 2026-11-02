import 'dart:math' as math;
import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// Swirl eyes and stars circling a wobbling head.
RingingFrame dizzy(double t) {
  final (lb, rb) = worriedBrows(
    lift: -4 + 3 * wave(t, 2),
    width: 10,
  );
  return RingingFrame(
    face: FaceShape(
      leftEye: eye(const Offset(70, 94), pupil: 17, spiral: 1),
      rightEye: eye(const Offset(130, 94), pupil: 17, spiral: 1),
      leftBrow: lb,
      rightBrow: rb,
      mouth: MouthShape(
        wavyOpen(const Offset(100, 146), 50, 12, 3.5, t * 2, waves: 1.5),
        width: 9,
        fill: 1,
      ),
    ),
    spin: -tau * t * 2,
    tilt: deg(9) * wave(t, 1, 0.25),
    nudge: Offset(math.cos(tau * t) * 7, math.sin(tau * t) * 4),
    fx: [
      for (var i = 0; i < 3; i++)
        () {
          final a = tau * (t * 2 + i / 3);
          return RingFx(
            RingFxKind.star,
            at: Offset(100 + 76 * math.cos(a), 6 + 16 * math.sin(a)),
            scale: 0.75 + 0.25 * math.sin(a),
            rotation: a * 2,
            inFront: math.sin(a) > 0,
            onHead: true,
          );
        }(),
    ],
  );
}
