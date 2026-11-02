import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// Shrunk down, shaking, teeth chattering.
RingingFrame terrified(double t) {
  final tremble = Offset(wave(t, 15) * 2.4, wave(t, 17, 0.2) * 1.4);
  final chatter = pulse(t, 10);
  final look = Offset(snap(wave(t, 2), 3) * 7, -5) + tremble * 0.5;
  final (lb, rb) = brows(
    const Offset(46, 78),
    const Offset(63, 64),
    const Offset(84, 54),
    width: 10,
  );
  final mouthH = 6 + 9 * chatter;
  const mouthAt = Offset(100, 147);
  return RingingFrame(
    face: FaceShape(
      leftEye: eye(
        const Offset(68, 96),
        ball: 20,
        pupil: 7,
        shine: 3,
        look: look,
      ),
      rightEye: eye(
        const Offset(132, 96),
        ball: 20,
        pupil: 7,
        shine: 3,
        look: look,
      ),
      leftBrow: lb,
      rightBrow: rb,
      mouth: teethMouth(gritMouth(mouthAt, 50, mouthH, bend: 4)),
    ),
    scale: 0.86,
    nudge: tremble + const Offset(0, 8),
    tilt: deg(2) * wave(t, 11),
    fx: [
      teeth(mouthAt, 50, mouthH, bend: 4),
      for (var i = 0; i < 2; i++)
        () {
          final p = frac(t + i / 2);
          return RingFx(
            RingFxKind.sweat,
            at: Offset(i == 0 ? 40 : 160, 54 + 30 * p),
            scale: 0.8,
            alpha: (1 - p) * seg(p, 0, 0.1),
            onHead: true,
          );
        }(),
    ],
  );
}
