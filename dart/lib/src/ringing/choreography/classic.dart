import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// The alarm face as it has always been, with a proper shout and shake.
RingingFrame classic(double t) {
  final shout = pulse(t, 3);
  final jitter = Offset(wave(t, 12) * 1.2, wave(t, 9, 0.25));
  final (lb, rb) = alarmBrows(lift: 4 * shout);
  return RingingFrame(
    face: FaceShape(
      leftEye: eye(
        const Offset(70, 94),
        ball: 17 + 2 * shout,
        pupil: 6,
        hollow: true,
        width: 11,
        look: jitter,
      ),
      rightEye: eye(
        const Offset(130, 94),
        ball: 17 + 2 * shout,
        pupil: 6,
        hollow: true,
        width: 11,
        look: jitter,
      ),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(
        ovalMouth(const Offset(100, 142), 14 + 5 * shout, 14 + 10 * shout),
      ),
      head: const HeadShape(strokeWidth: 12),
    ),
    tilt: deg(4) * wave(t, 6),
    scale: 1 + 0.03 * shout,
    fx: [RingFx(RingFxKind.soundWaves, phase: frac(t * 2))],
  );
}
