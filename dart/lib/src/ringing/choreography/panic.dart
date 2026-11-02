import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// Pupils darting, sweat flying, a wobbling scream.
RingingFrame panic(double t) {
  final dart = snap(wave(t, 4));
  final look = Offset(dart * 9, 2 * wave(t, 8));
  final scream = pulse(t, 4);
  final (lb, rb) = worriedBrows(lift: 3 * pulse(t, 8));
  return RingingFrame(
    face: FaceShape(
      leftEye: eye(
        const Offset(68, 96),
        ball: 21,
        pupil: 8,
        shine: 3,
        look: look,
      ),
      rightEye: eye(
        const Offset(132, 96),
        ball: 21,
        pupil: 8,
        shine: 3,
        look: look,
      ),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(
        wavyOpen(
          const Offset(100, 147),
          56,
          18 + 6 * scream,
          2.5,
          t * 3,
        ),
        width: 10,
      ),
      head: const HeadShape(strokeWidth: 11),
    ),
    tilt: deg(2.5) * wave(t, 5),
    nudge: Offset(wave(t, 10) * 2.5, wave(t, 7, 0.3) * 1.5),
    fx: [
      for (var i = 0; i < 4; i++)
        flung(
          RingFxKind.sweat,
          Offset(i.isEven ? 34 : 166, 58 + (i ~/ 2) * 14),
          Offset(i.isEven ? -46 : 46, -40),
          110,
          frac(t * 2 + i / 4),
          scale: 0.9,
        ),
      RingFx(
        RingFxKind.exclaim,
        at: const Offset(100, -14),
        scale: 0.9 + 0.2 * pulse(t, 4),
        rotation: deg(10) * wave(t, 2),
      ),
    ],
  );
}
