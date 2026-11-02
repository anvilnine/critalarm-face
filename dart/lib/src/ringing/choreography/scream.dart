import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// Stretched tall, pinprick pupils, mouth wide open.
RingingFrame scream(double t) {
  final shriek = pulse(t, 2);
  final tremble = Offset(wave(t, 16) * 1.6, wave(t, 13, 0.3) * 1.2);
  final (lb, rb) = brows(
    const Offset(48, 56),
    const Offset(68, 44),
    const Offset(88, 52),
    by: Offset(0, -3 * shriek),
  );
  return RingingFrame(
    face: FaceShape(
      leftEye: eye(
        const Offset(70, 88),
        ball: 22,
        pupil: 3.5,
        width: 9,
        look: tremble * 0.8,
      ),
      rightEye: eye(
        const Offset(130, 88),
        ball: 22,
        pupil: 3.5,
        width: 9,
        look: tremble * 0.8,
      ),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(
        ovalMouth(const Offset(100, 147), 16 + 2 * shriek, 28 + 6 * shriek),
        width: 10,
      ),
      head: HeadShape(
        squashX: 0.9,
        squashY: 1.1 + 0.03 * shriek,
        strokeWidth: 12,
      ),
    ),
    tilt: deg(1.5) * wave(t, 10),
    nudge: tremble,
    fx: [
      for (var i = 0; i < 2; i++)
        () {
          final p = frac(t * 2 + i / 2);
          return RingFx(
            RingFxKind.pulseRing,
            scale: 1 + 0.45 * p,
            alpha: (1 - p) * seg(p, 0, 0.15) * 0.6,
            inFront: false,
          );
        }(),
      RingFx(RingFxKind.soundWaves, phase: frac(t * 3)),
      RingFx(
        RingFxKind.exclaim,
        at: const Offset(154, -12),
        scale: 0.8 + 0.2 * shriek,
        rotation: deg(12),
      ),
      RingFx(
        RingFxKind.exclaim,
        at: const Offset(178, 2),
        scale: 0.7 + 0.2 * (1 - shriek),
        rotation: deg(24),
      ),
    ],
  );
}
