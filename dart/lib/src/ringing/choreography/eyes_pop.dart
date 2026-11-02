import 'dart:math' as math;
import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/motion.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// Eyes boinging out of the head and the jaw hitting the floor.
RingingFrame eyesPop(double t) {
  final pop =
      elastic(seg(t, 0.06, 0.4)) * (1 - easeInOutPoly(seg(t, 0.72, 0.94)));
  final brace = bump(seg(t, 0, 0.06));
  final (lb, rb) = brows(
    const Offset(52, 70),
    const Offset(68, 64),
    const Offset(84, 68),
    by: Offset(0, -28 * pop + 4 * brace),
    alpha: 1 - 0.3 * pop.clamp(0, 1),
  );
  return RingingFrame(
    face: FaceShape(
      leftEye: eye(
        Offset(70 - 8 * pop, 94 - 8 * pop),
        ball: 16 + 16 * pop,
        pupil: math.max(3, 9 - 5 * pop),
        shine: 3,
        width: 9,
      ),
      rightEye: eye(
        Offset(130 + 8 * pop, 94 - 8 * pop),
        ball: 16 + 16 * pop,
        pupil: math.max(3, 9 - 5 * pop),
        shine: 3,
        width: 9,
      ),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(
        ovalMouth(
          Offset(100, 142 + 20 * pop),
          12 + 7 * pop,
          math.max(4, 5 + 30 * pop),
        ),
        width: 10,
      ),
      head: HeadShape(
        squashX: 1 - 0.05 * pop - 0.03 * brace,
        squashY: 1 + 0.12 * pop - 0.05 * brace,
      ),
      props: [
        PropShape(
          PropKind.popLines,
          at: const Offset(100, 100),
          scale: pop.clamp(0, 1.2),
          alpha: pop.clamp(0, 1),
        ),
      ],
    ),
    tilt: deg(3) * wave(t, 6) * pop,
    fx: [
      RingFx(
        RingFxKind.exclaim,
        at: const Offset(100, -34),
        scale: pop.clamp(0, 1.3),
        alpha: pop.clamp(0, 1),
      ),
    ],
  );
}
