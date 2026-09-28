import 'dart:ui';

import 'package:critalarm_face/src/ops/face_op.dart';

/// Draws [ops] onto [canvas], in the canvas's current transform.
///
/// Scale the canvas first to fit the ops' units into the space you have:
/// `canvas.scale(size.width / 200)` for a face, or by the ringing stage
/// width for a ringing face.
void replayFaceOps(Canvas canvas, List<FaceOp> ops) {
  for (final op in ops) {
    switch (op) {
      case SaveOp():
        canvas.save();
      case RestoreOp():
        canvas.restore();
      case TranslateOp(:final dx, :final dy):
        canvas.translate(dx, dy);
      case RotateOp(:final radians):
        canvas.rotate(radians);
      case ScaleOp(:final sx, :final sy):
        canvas.scale(sx, sy);
      case ClipOvalOp(:final oval):
        canvas.clipPath(Path()..addOval(_rect(oval)));
      case DrawOp(:final shape, :final paint):
        _draw(canvas, shape, _paint(paint));
    }
  }
}

Paint _paint(OpPaint p) {
  final paint = Paint()..color = p.color;
  if (p.stroke) {
    paint
      ..style = PaintingStyle.stroke
      ..strokeWidth = p.width
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
  }
  return paint;
}

Rect _rect(OvalShape o) => Rect.fromCenter(
  center: Offset(o.cx, o.cy),
  width: o.rx * 2,
  height: o.ry * 2,
);

void _draw(Canvas canvas, OpShape shape, Paint paint) {
  switch (shape) {
    case OvalShape():
      canvas.drawOval(_rect(shape), paint);
    case RRectShape(
      :final x,
      :final y,
      :final width,
      :final height,
      :final radius,
    ):
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x, y, width, height),
          Radius.circular(radius),
        ),
        paint,
      );
    case PathShape(:final commands):
      canvas.drawPath(toFlutterPath(commands), paint);
  }
}

/// Builds a Flutter [Path] from path [commands].
Path toFlutterPath(List<PathCommand> commands) {
  final path = Path();
  for (final c in commands) {
    switch (c) {
      case MoveTo(:final x, :final y):
        path.moveTo(x, y);
      case LineTo(:final x, :final y):
        path.lineTo(x, y);
      case QuadTo(:final cx, :final cy, :final x, :final y):
        path.quadraticBezierTo(cx, cy, x, y);
      case CubicTo():
        path.cubicTo(c.c1x, c.c1y, c.c2x, c.c2y, c.x, c.y);
      case ArcTo(
        :final cx,
        :final cy,
        :final radius,
        :final start,
        :final sweep,
      ):
        path.arcTo(
          Rect.fromCircle(center: Offset(cx, cy), radius: radius),
          start,
          sweep,
          false,
        );
      case ClosePath():
        path.close();
    }
  }
  return path;
}
