import 'dart:math' as math;
import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// Wailing, with tears arcing out of both eyes.
RingingFrame sobbing(double t) {
  final sob = math.pow(pulse(t, 3), 2).toDouble();
  final (lb, rb) = worriedBrows(lift: 3 * sob);
  return RingingFrame(
    face: FaceShape(
      leftEye: eye(
        const Offset(70, 92),
        lid: 1,
        lidPoints: const [Offset(54, 90), Offset(70, 97), Offset(86, 88)],
      ),
      rightEye: eye(
        const Offset(130, 92),
        lid: 1,
        lidPoints: const [Offset(114, 88), Offset(130, 97), Offset(146, 90)],
      ),
      leftBrow: lb,
      rightBrow: rb,
      mouth: inkMouth(
        lipsMouth(
          (u) => quadAt(
            const Offset(68, 158),
            Offset(100, 166 + 4 * sob),
            const Offset(132, 158),
            u,
          ),
          (u) => quadAt(
            const Offset(68, 158),
            Offset(100, 124 - 8 * sob),
            const Offset(132, 158),
            u,
          ),
        ),
        width: 10,
      ),
      head: HeadShape(squashX: 1 + 0.03 * sob, squashY: 1 - 0.04 * sob),
    ),
    nudge: Offset(0, 4 * sob),
    fx: [
      for (final side in const [-1.0, 1.0])
        for (var i = 0; i < 4; i++)
          flung(
            RingFxKind.tear,
            Offset(100 + side * 44, 92),
            Offset(side * 56, -34),
            130,
            frac(t * 2 + i / 4 + (side > 0 ? 0.125 : 0)),
            scale: 0.8,
          ),
      for (final side in const [-1.0, 1.0])
        () {
          final p = frac(t * 3 + (side > 0 ? 0.5 : 0));
          return RingFx(
            RingFxKind.tear,
            at: Offset(100 + side * 34, 104 + 42 * p),
            scale: 0.6,
            alpha: (1 - p) * seg(p, 0, 0.1),
            onHead: true,
          );
        }(),
    ],
  );
}
