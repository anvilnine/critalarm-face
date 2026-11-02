import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/motion.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// Dozing, then launched off the ground by the ring.
RingingFrame startled(double t) {
  final awake =
      easeInOutPoly(seg(t, 0.4, 0.45)) * (1 - easeInOutPoly(seg(t, 0.8, 0.98)));
  final air = seg(t, 0.42, 0.72);
  final height = 4 * air * (1 - air);
  final land = bump(seg(t, 0.72, 0.8));
  final breathe = wave(t, 2) * (1 - awake);
  final squashY = 1 - 0.12 * land + 0.06 * height + 0.015 * breathe;
  final blended = FaceShape.lerp(dozingFace, shockedFace, awake);
  final zzz = PropShape(
    PropKind.zzz,
    at: Offset(150 + 4 * wave(t, 2), 34 - 6 * pulse(t, 2)),
    alpha: 1 - awake,
    scale: (1 - awake) * (0.9 + 0.1 * pulse(t, 2)),
  );
  return RingingFrame(
    face: withParts(
      blended,
      head: HeadShape(
        squashX: 1 + 0.1 * land - 0.03 * height,
        squashY: squashY,
        strokeWidth: 10 + 2 * awake,
      ),
      props: [zzz],
    ),
    tilt: deg(4) * wave(t, 20) * height + 0.06 * (1 - awake),
    nudge: Offset(0, -48 * height + 88 * (1 - squashY)),
    fx: [
      RingFx(
        RingFxKind.exclaim,
        at: const Offset(100, -30),
        scale: elastic(seg(t, 0.44, 0.56)) * 1.1 * (1 - seg(t, 0.72, 0.8)),
        alpha: seg(t, 0.44, 0.46) * (1 - seg(t, 0.72, 0.8)),
        onHead: true,
      ),
      RingFx(
        RingFxKind.speedLines,
        at: Offset(100, 214 - 48 * height),
        alpha: seg(t, 0.43, 0.47) * (1 - seg(t, 0.52, 0.57)),
      ),
      RingFx(
        RingFxKind.soundWaves,
        phase: frac(t * 4),
        alpha: awake,
      ),
      for (final side in const [-1.0, 1.0])
        RingFx(
          RingFxKind.steam,
          at: Offset(100 + side * (70 + 26 * land), 188),
          scale: 0.4 + 0.4 * land,
          alpha: land,
        ),
    ],
  );
}
