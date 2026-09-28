/// Crit, the Crit Alarm mascot.
///
/// Start with `FaceWidget` for one expression, `IdleFace` for a face that
/// keeps itself busy, and `RingingFaceWidget` for an alarm going off. Every
/// face is a `FaceShape`, and any two can be blended with `FaceShape.lerp`.
///
/// To draw Crit somewhere else, `buildFaceOps` and `buildRingingOps` turn a
/// face into a flat list of `FaceOp`s that an SVG or HTML canvas renderer
/// can replay. `spec/SPEC.md` in the repository describes them.
library;

export 'src/face_painter.dart';
export 'src/face_rig.dart';
export 'src/face_shape.dart';
export 'src/face_state.dart';
export 'src/face_widget.dart';
export 'src/idle_face.dart';
export 'src/idle_face_controller.dart';
export 'src/motion.dart';
export 'src/ops/build_face_ops.dart';
export 'src/ops/build_ringing_ops.dart';
export 'src/ops/face_op.dart';
export 'src/ops/path_builder.dart' show circleUnionPath;
export 'src/ops/replay.dart';
export 'src/palette.dart';
export 'src/ringing/ringing_choreography.dart';
export 'src/ringing/ringing_face_painter.dart';
export 'src/ringing/ringing_face_widget.dart';
export 'src/ringing/ringing_frame.dart';
export 'src/ringing/ringing_style.dart';
export 'src/ringing/shuffling_ringing_face.dart';
export 'src/seeded_random.dart';
