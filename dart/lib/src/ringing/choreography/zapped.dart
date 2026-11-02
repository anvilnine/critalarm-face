import 'dart:math' as math;
import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// Flickering between light and dark with bolts all around, then smoking.
RingingFrame zapped(double t) {
  final zap = seg(t, 0, 0.04) * (1 - seg(t, 0.52, 0.6));
  final flicker = wave(t, 18) > 0 ? 1.0 : 0.0;
  final jolt = Offset(wave(t, 23) * 3, wave(t, 19, 0.3) * 3) * zap;
  const mouthAt = Offset(100, 146);

  final shocked = FaceShape(
    leftEye: eye(
      const Offset(68, 94),
      ball: 22,
      pupil: 3,
      width: 9,
      look: jolt * 0.6,
    ),
    rightEye: eye(
      const Offset(132, 94),
      ball: 22,
      pupil: 3,
      width: 9,
      look: jolt * 0.6,
    ),
    leftBrow: brow(
      const Offset(46, 58),
      const Offset(66, 46),
      const Offset(88, 56),
    ),
    rightBrow: brow(
      const Offset(112, 56),
      const Offset(134, 46),
      const Offset(154, 58),
    ),
    mouth: teethMouth(gritMouth(mouthAt, 66, 22, bend: -5)),
    head: const HeadShape(strokeWidth: 13),
  );
  final dazed = FaceShape(
    leftEye: eye(
      const Offset(70, 96),
      ball: 15,
      squash: 0.6,
      pupil: 7,
      look: const Offset(5, 1),
    ),
    rightEye: eye(
      const Offset(130, 96),
      ball: 15,
      squash: 0.6,
      pupil: 7,
      look: const Offset(-5, -1),
    ),
    leftBrow: brow(
      const Offset(54, 78),
      const Offset(70, 76),
      const Offset(86, 78),
    ),
    rightBrow: brow(
      const Offset(114, 78),
      const Offset(130, 76),
      const Offset(146, 78),
    ),
    mouth: MouthShape(wavyLine(const Offset(100, 144), 44, 4, t * 2)),
  );
  const bolts = [
    (Offset(14, 30), -0.5),
    (Offset(186, 24), 0.6),
    (Offset(4, 150), -2.2),
    (Offset(196, 146), 2.4),
    (Offset(100, -22), 0.1),
  ];
  return RingingFrame(
    face: FaceShape.lerp(dazed, shocked, zap),
    nudge: jolt,
    tilt: deg(3) * wave(t, 13) * zap,
    flash: 0.9 * flicker * zap,
    fx: [
      teeth(mouthAt, 66, 22, bend: -5).faded(zap),
      for (var i = 0; i < bolts.length; i++)
        RingFx(
          RingFxKind.bolt,
          at: bolts[i].$1,
          rotation: bolts[i].$2,
          scale: 0.9 + 0.2 * pulse(t, 7, i / 5),
          alpha: zap * (wave(t, 12, i / 5) > -0.2 ? 1 : 0),
        ),
      for (var i = 0; i < 3; i++)
        () {
          final p = frac(t * 2 + i / 3);
          return RingFx(
            RingFxKind.steam,
            at: Offset(70 + i * 30 + 10 * math.sin(tau * p), 8 - 40 * p),
            scale: 0.5 + 0.7 * p,
            alpha: (1 - zap) * (1 - p) * seg(p, 0, 0.15) * 0.9,
          );
        }(),
    ],
  );
}
