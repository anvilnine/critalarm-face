import 'dart:math' as math;
import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// Bouncing off the floor, squashing on every landing.
RingingFrame bouncing(double t) {
  final height = 4 * t * (1 - t);
  final ground = math.min(t, 1 - t);
  final land = math.pow(1 - (ground / 0.12).clamp(0, 1), 2).toDouble();
  final squashY = 1 + 0.06 * height * (1 - land) - 0.16 * land;
  final squashX = 1 - 0.04 * height + 0.14 * land;
  final (lb, rb) = alarmBrows(lift: 8 * height);
  // Looking up on the way up and at the floor on the way down.
  final look = Offset(0, -4 * wave(t, 1, 0.25));
  return RingingFrame(
    face: FaceShape(
      leftEye: eye(
        const Offset(70, 94),
        ball: 17,
        pupil: 6,
        hollow: true,
        width: 11,
        look: look,
      ),
      rightEye: eye(
        const Offset(130, 94),
        ball: 17,
        pupil: 6,
        hollow: true,
        width: 11,
        look: look,
      ),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(
        ovalMouth(const Offset(100, 144), 13 + 5 * height, 6 + 16 * height),
      ),
      head: HeadShape(squashX: squashX, squashY: squashY, strokeWidth: 12),
    ),
    nudge: Offset(0, -40 * height + 88 * (1 - squashY)),
    tilt: deg(4) * wave(t, 1),
    fx: [
      RingFx(
        RingFxKind.speedLines,
        at: Offset(100, 212 - 40 * height),
        alpha: seg(t, 0.06, 0.14) * (1 - seg(t, 0.3, 0.45)),
      ),
      for (final side in const [-1.0, 1.0])
        RingFx(
          RingFxKind.steam,
          at: Offset(100 + side * (78 + 16 * land), 186),
          scale: 0.35 + 0.35 * land,
          alpha: land,
        ),
      const RingFx(RingFxKind.soundWaves, alpha: 0.7),
    ],
  );
}
