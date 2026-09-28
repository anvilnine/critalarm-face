import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/ops/build_face_ops.dart';
import 'package:critalarm_face/src/ops/replay.dart';
import 'package:flutter/rendering.dart';

/// Paints one [FaceShape], scaled from its 200 unit box to fit the canvas.
///
/// It builds the draw ops with [buildFaceOps] and replays them, so it draws
/// exactly what any other renderer of the same ops draws.
class FacePainter extends CustomPainter {
  /// Paints [shape] in [style].
  const FacePainter({required this.shape, required this.style});

  /// What to draw.
  final FaceShape shape;

  /// The colours and live values to draw it with.
  final FaceStyle style;

  @override
  void paint(Canvas canvas, Size size) {
    canvas
      ..save()
      ..scale(size.width / 200);
    replayFaceOps(canvas, buildFaceOps(shape, style));
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant FacePainter oldDelegate) =>
      oldDelegate.shape != shape ||
      oldDelegate.style.fillColor != style.fillColor ||
      oldDelegate.style.strokeColor != style.strokeColor ||
      oldDelegate.style.inkColor != style.inkColor ||
      oldDelegate.style.tongueColor != style.tongueColor ||
      oldDelegate.style.lookDx != style.lookDx ||
      oldDelegate.style.spiralRotation != style.spiralRotation;
}
