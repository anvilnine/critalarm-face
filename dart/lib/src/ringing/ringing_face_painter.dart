import 'package:critalarm_face/src/ops/build_ringing_ops.dart';
import 'package:critalarm_face/src/ops/replay.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';
import 'package:flutter/rendering.dart';

/// Paints one [RingingFrame] on a square stage.
///
/// The stage is [ringingStageUnits] wide in face units, with the face's 200
/// unit box in the middle, so the extras have room to fly off the head
/// without being cut off. It builds the ops with [buildRingingOps] and
/// replays them.
class RingingFacePainter extends CustomPainter {
  /// Paints [frame] in [colors].
  const RingingFacePainter({required this.frame, required this.colors});

  /// What to draw.
  final RingingFrame frame;

  /// The colours to draw it in.
  final RingingColors colors;

  @override
  void paint(Canvas canvas, Size size) {
    canvas
      ..save()
      ..scale(size.width / ringingStageUnits);
    replayFaceOps(canvas, buildRingingOps(frame, colors));
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant RingingFacePainter oldDelegate) =>
      oldDelegate.frame != frame ||
      oldDelegate.colors.fillColor != colors.fillColor ||
      oldDelegate.colors.strokeColor != colors.strokeColor ||
      oldDelegate.colors.inkColor != colors.inkColor ||
      oldDelegate.colors.accentColor != colors.accentColor;
}
