import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// Red in the face, teeth gritted, steam off both sides.
RingingFrame rage(double t) {
  final throb = pulse(t, 4);
  final (lb, rb) = brows(
    const Offset(46, 68),
    const Offset(66, 77),
    const Offset(88, 88),
    by: Offset(0, 2 * throb),
    width: 13,
  );
  const mouthAt = Offset(100, 147);
  return RingingFrame(
    face: FaceShape(
      leftEye: eye(
        const Offset(70, 100),
        ball: 15,
        squash: 0.72,
        pupil: 8,
        look: const Offset(4, 0),
      ),
      rightEye: eye(
        const Offset(130, 100),
        ball: 15,
        squash: 0.72,
        pupil: 8,
        look: const Offset(-4, 0),
      ),
      leftBrow: lb,
      rightBrow: rb,
      mouth: teethMouth(gritMouth(mouthAt, 60, 20, bend: 6)),
      head: const HeadShape(strokeWidth: 13),
    ),
    nudge: Offset(wave(t, 14) * 2.2, wave(t, 11, 0.2) * 0.8),
    scale: 1 + 0.025 * throb,
    flush: 0.45 + 0.4 * throb,
    fx: [
      teeth(mouthAt, 60, 20, bend: 6),
      RingFx(
        RingFxKind.angerVein,
        at: const Offset(150, 42),
        scale: 0.75 + 0.35 * throb,
        onHead: true,
      ),
      for (final side in const [-1.0, 1.0])
        for (var i = 0; i < 2; i++)
          () {
            final p = frac(t * 2 + i / 2 + (side > 0 ? 0.25 : 0));
            return RingFx(
              RingFxKind.steam,
              at: Offset(100 + side * (86 + 34 * p), 52 - 44 * p),
              scale: 0.5 + 0.9 * p,
              alpha: (1 - p) * seg(p, 0, 0.1),
            );
          }(),
    ],
  );
}
