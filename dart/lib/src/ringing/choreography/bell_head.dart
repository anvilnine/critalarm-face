import 'dart:math' as math;
import 'dart:ui' show Offset;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ringing/choreography/parts.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';

/// Alarm clock bells on top of the head, wincing at every hit.
RingingFrame bellHead(double t) {
  final swing = wave(t, 2);
  final hit = math.pow(swing.abs(), 6).toDouble();
  final side = swing.sign;
  final open = ovalMouth(const Offset(100, 144), 16, 20);
  final grit = gritMouth(const Offset(100, 144), 50, 16, bend: 4);
  final (lb, rb) = alarmBrows(lift: -4 * hit);
  EyeShape wince(Offset c, {required bool struck}) => eye(
    c,
    ball: 17,
    pupil: 6,
    hollow: true,
    width: 11,
    lid: hit * (struck ? 0.9 : 0.3),
    lidPoints: [c + const Offset(-14, 2), c, c + const Offset(14, 2)],
  );
  return RingingFrame(
    face: FaceShape(
      leftEye: wince(const Offset(70, 96), struck: side < 0),
      rightEye: wince(const Offset(130, 96), struck: side > 0),
      leftBrow: lb,
      rightBrow: rb,
      mouth: MouthShape.lerp(
        inkMouth(open),
        teethMouth(grit),
        hit,
      ),
      head: const HeadShape(strokeWidth: 12),
    ),
    tilt: -side * deg(5) * hit,
    nudge: Offset(-side * 3 * hit, 3 * hit),
    fx: [
      RingFx(
        RingFxKind.bell,
        at: const Offset(56, 2),
        rotation: deg(-28) + (side < 0 ? deg(-10) * hit : 0),
        onHead: true,
        inFront: false,
      ),
      RingFx(
        RingFxKind.bell,
        at: const Offset(144, 2),
        rotation: deg(28) + (side > 0 ? deg(10) * hit : 0),
        onHead: true,
        inFront: false,
      ),
      RingFx(
        RingFxKind.hammer,
        at: const Offset(100, 14),
        rotation: deg(45) * swing,
        onHead: true,
        inFront: false,
      ),
      teeth(const Offset(100, 144), 50, 16, bend: 4).faded(hit),
      RingFx(
        RingFxKind.star,
        at: Offset(100 + side * 70, -26),
        scale: 0.9 * hit,
        alpha: hit,
        rotation: t * tau,
      ),
      RingFx(
        RingFxKind.soundWaves,
        phase: frac(t * 2),
        alpha: 0.4 + 0.6 * hit,
      ),
    ],
  );
}
