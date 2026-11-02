import 'dart:math' as math;
import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/motion.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// Heavy lids, a long eye roll and a sigh.
RingingFrame annoyed(double t) {
  final env = bump(seg(t, 0.08, 0.62));
  final a = math.pi + math.pi * easeInOutPoly(seg(t, 0.12, 0.56));
  final look = Offset(math.cos(a), math.sin(a)) * 9 * env;
  final sigh = bump(seg(t, 0.6, 0.94));
  final (lb, rb) = brows(
    const Offset(52, 82),
    const Offset(70, 81),
    const Offset(88, 83),
    width: 12,
  );
  return RingingFrame(
    face: FaceShape(
      leftEye: eye(
        const Offset(70, 98),
        ball: 17,
        squash: 0.55,
        pupil: 8,
        look: look,
      ),
      rightEye: eye(
        const Offset(130, 98),
        ball: 17,
        squash: 0.55,
        pupil: 8,
        look: look,
      ),
      leftBrow: lb,
      rightBrow: BrowShape.lerp(
        rb,
        brow(
          const Offset(112, 70),
          const Offset(130, 62),
          const Offset(148, 68),
          width: 12,
        ),
        env,
      ),
      mouth: MouthShape.lerp(
        MouthShape(lineMouth(const Offset(84, 142), const Offset(118, 138))),
        inkMouth(ovalMouth(const Offset(110, 142), 7, 6), width: 9),
        sigh,
      ),
      head: HeadShape(squashY: 1 - 0.04 * sigh, squashX: 1 + 0.02 * sigh),
      props: [
        PropShape(
          PropKind.puff,
          at: Offset(144 + 22 * seg(t, 0.6, 0.94), 150),
          scale: sigh * 1.2,
          alpha: sigh,
        ),
      ],
    ),
    tilt: -deg(7) * env,
    nudge: Offset(0, -2 * env + 3 * sigh),
    fx: [
      RingFx(
        RingFxKind.soundWaves,
        phase: frac(t * 3),
        alpha: 0.45,
      ),
    ],
  );
}
