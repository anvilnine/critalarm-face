import 'dart:math' as math;
import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// Head rocking side to side under a stream of question marks.
RingingFrame confused(double t) {
  final sway = wave(t, 1);
  final k = 0.5 + 0.5 * sway;
  final leftHigh = [
    const Offset(48, 64),
    const Offset(66, 50),
    const Offset(86, 58),
  ];
  final leftLow = [
    const Offset(50, 72),
    const Offset(68, 72),
    const Offset(86, 74),
  ];
  final rightHigh = [
    const Offset(114, 58),
    const Offset(134, 50),
    const Offset(152, 64),
  ];
  final rightLow = [
    const Offset(114, 74),
    const Offset(132, 72),
    const Offset(150, 72),
  ];
  final look = Offset(sway * 5, -6);
  return RingingFrame(
    face: FaceShape(
      leftEye: eye(
        const Offset(68, 96),
        ball: 16 + 5 * k,
        pupil: 7 + 2 * k,
        shine: 3,
        look: look,
      ),
      rightEye: eye(
        const Offset(132, 97),
        ball: 21 - 5 * k,
        pupil: 9 - 2 * k,
        shine: 3,
        look: look,
      ),
      leftBrow: BrowShape(lerpPoints(leftLow, leftHigh, k)),
      rightBrow: BrowShape(lerpPoints(rightHigh, rightLow, k)),
      mouth: MouthShape(
        sampleMouth(
          (u) => Offset(
            80 + 42 * u,
            143 + 5 * math.sin(tau * (1.5 * u + t)) + 8 * (u - 0.5) * sway,
          ),
        ),
      ),
    ),
    tilt: deg(12) * sway,
    nudge: Offset(sway * 6, 0),
    fx: [
      for (var i = 0; i < 3; i++)
        () {
          final p = frac(t + i / 3);
          const spots = [Offset(34, 0), Offset(166, -6), Offset(100, -26)];
          return RingFx(
            RingFxKind.question,
            at: spots[i] + Offset(0, -12 * p),
            scale: elastic(seg(p, 0, 0.3)) * (1 - seg(p, 0.8, 1)),
            rotation: deg(14) * math.sin(tau * (t * 2 + i / 3)),
          );
        }(),
    ],
  );
}
