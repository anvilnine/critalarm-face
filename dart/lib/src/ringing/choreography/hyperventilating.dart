import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// Short fast breaths, cheeks puffing in and out.
RingingFrame hyperventilating(double t) {
  final breath = pulse(t, 3);
  final out = 1 - breath;
  final (lb, rb) = worriedBrows(lift: 3 * breath);
  final look = Offset(wave(t, 9) * 1.5, 0);
  return RingingFrame(
    face: FaceShape(
      leftEye: eye(
        const Offset(70, 94),
        ball: 20,
        pupil: 6,
        shine: 2.5,
        look: look,
      ),
      rightEye: eye(
        const Offset(130, 94),
        ball: 20,
        pupil: 6,
        shine: 2.5,
        look: look,
      ),
      leftBrow: lb,
      rightBrow: rb,
      mouth: MouthShape.lerp(
        inkMouth(ovalMouth(const Offset(106, 146), 5, 4), width: 9),
        inkMouth(ovalMouth(const Offset(100, 146), 10, 12), width: 9),
        breath,
      ),
      head: HeadShape(squashX: 1 + 0.07 * out, squashY: 1 + 0.03 * breath),
      props: [
        PropShape(
          PropKind.puff,
          at: Offset(142 + 16 * out, 152),
          scale: out,
          alpha: out * out,
        ),
      ],
    ),
    nudge: Offset(0, -2.5 * breath),
    fx: [
      const RingFx(RingFxKind.blush, alpha: 0.55, onHead: true),
      for (var i = 0; i < 2; i++)
        () {
          final p = frac(t * 2 + i / 2);
          return RingFx(
            RingFxKind.sweat,
            at: Offset(i == 0 ? 156 : 44, 46 + 34 * p),
            scale: 0.75,
            alpha: (1 - p) * seg(p, 0, 0.1),
            onHead: true,
          );
        }(),
    ],
  );
}
