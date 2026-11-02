import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// A siren on its head and a mouth going wee-oo.
RingingFrame siren(double t) {
  final wee = pulse(t, 2);
  final (lb, rb) = brows(
    const Offset(52, 62),
    const Offset(68, 56),
    const Offset(86, 60),
    by: Offset(0, -7 * wee),
  );
  final look = Offset(0, -3 * wee);
  return RingingFrame(
    face: FaceShape(
      leftEye: eye(
        const Offset(70, 96),
        ball: 17,
        pupil: 6,
        hollow: true,
        width: 11,
        look: look,
      ),
      rightEye: eye(
        const Offset(130, 96),
        ball: 17,
        pupil: 6,
        hollow: true,
        width: 11,
        look: look,
      ),
      leftBrow: lb,
      rightBrow: rb,
      mouth: MouthShape.lerp(
        inkMouth(ovalMouth(const Offset(100, 146), 11, 17)),
        inkMouth(ovalMouth(const Offset(100, 143), 27, 9)),
        wee,
      ),
      head: const HeadShape(strokeWidth: 12),
    ),
    scale: 1 + 0.04 * wee,
    flush: 0.35 * wee,
    fx: [
      RingFx(
        RingFxKind.pulseRing,
        scale: 1.05 + 0.25 * wee,
        alpha: 0.5 * wee,
        inFront: false,
      ),
      RingFx(
        RingFxKind.siren,
        at: const Offset(100, 4),
        phase: frac(t * 2),
        onHead: true,
        inFront: false,
      ),
      RingFx(RingFxKind.soundWaves, phase: frac(t * 2)),
    ],
  );
}
