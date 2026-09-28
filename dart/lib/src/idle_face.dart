import 'dart:async';
import 'dart:math' as math;

import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/face_state.dart';
import 'package:critalarm_face/src/face_widget.dart';
import 'package:critalarm_face/src/idle_face_controller.dart';
import 'package:critalarm_face/src/motion.dart';
import 'package:critalarm_face/src/palette.dart';
import 'package:flutter/material.dart';

/// A calm face that plays a small expression every few seconds and settles
/// back to calm. After a while with nobody touching it, it nods off, and a
/// tap wakes it.
///
/// It runs only while it is on screen, switched on, and the system allows
/// animations. Nothing keeps ticking once it is hidden or thrown away.
class IdleFace extends StatefulWidget {
  /// A face [size] wide and tall. Pass false to [isEnabled] for a plain calm
  /// face that never moves.
  const IdleFace({
    required this.size,
    this.isEnabled = true,
    this.palette,
    this.random,
    super.key,
  });

  /// Width and height.
  final double size;

  /// False keeps the face calm and runs nothing.
  final bool isEnabled;

  /// The colours. Null picks light or dark from the theme.
  final CritPalette? palette;

  /// Where the beats' randomness comes from. A `SeededRandom` makes the run
  /// of beats the same every time. Null uses Dart's own.
  final math.Random? random;

  @override
  State<IdleFace> createState() => _IdleFaceState();
}

class _IdleFaceState extends State<IdleFace>
    with SingleTickerProviderStateMixin {
  late final IdleFaceController _controller = IdleFaceController(
    random: widget.random,
  );
  late final AnimationController _morph = AnimationController(vsync: this);

  static final FaceShape _calm = faceFor(FaceState.calm);

  /// The face this beat is blending to.
  FaceShape _beat = _calm;

  /// And the one it is coming from, which is not always calm: a beat that
  /// follows straight on starts from whatever was on the face.
  FaceShape _from = _calm;

  IdleFacePhase _phase = IdleFacePhase.resting;

  /// What is on the face right now, part way through whatever it is doing.
  FaceShape _current() {
    final t = CritMotion.easeInOutCubic.transform(_morph.value);
    return switch (_phase) {
      IdleFacePhase.resting => _calm,
      IdleFacePhase.entering => FaceShape.lerp(_from, _beat, t),
      IdleFacePhase.holding || IdleFacePhase.dozing => _beat,
      IdleFacePhase.leaving => FaceShape.lerp(_from, _calm, t),
    };
  }

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChange);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(covariant IdleFace oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.isEnabled != widget.isEnabled) _sync();
  }

  @override
  void dispose() {
    _controller
      ..removeListener(_onChange)
      ..dispose();
    _morph.dispose();
    super.dispose();
  }

  /// Runs the loop only while the face is on screen, switched on and allowed
  /// to move. [TickerMode] is off for a screen that is covered or parked, so
  /// it also answers "is this face visible".
  void _sync() {
    final reduceMotion =
        MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    final ticking = TickerMode.valuesOf(context).enabled;
    final on = widget.isEnabled && ticking && !reduceMotion;
    if (on) {
      unawaited(_controller.start());
    } else {
      _controller.stop();
    }
  }

  void _onChange() {
    final phase = _controller.phase;
    if (phase == _phase) return;
    _phase = phase;

    switch (phase) {
      case IdleFacePhase.entering:
        // Whatever the face was showing is what the next one grows out of,
        // so two beats in a row melt into each other rather than cutting.
        _from = _current();
        _beat = faceFor(_controller.beat);
        _morph.duration = _controller.blend;
        unawaited(_morph.forward(from: 0));

      case IdleFacePhase.leaving:
        _from = _beat;
        _morph.duration = _controller.blend;
        unawaited(_morph.forward(from: 0));

      case IdleFacePhase.holding:
      case IdleFacePhase.dozing:
        _morph.value = 1;

      // Stopping mid beat lands here, which drops the face back to calm at
      // once. That only happens off screen, so nobody watches it happen.
      case IdleFacePhase.resting:
        _from = _calm;
        _morph.value = 0;
    }
    setState(() {});
  }

  Widget _face() {
    final resting = _phase == IdleFacePhase.resting;
    return FaceWidget(
      state: FaceState.calm,
      shape: resting ? null : _current(),
      size: widget.size,
      palette: widget.palette,
    );
  }

  @override
  Widget build(BuildContext context) => GestureDetector(
    behavior: HitTestBehavior.opaque,
    // Tapping a sleeping face wakes it. Tapping it any other time does
    // nothing, so this never eats a tap meant for something else.
    onTap: _controller.isDozing ? () => unawaited(_controller.wake()) : null,
    child: AnimatedBuilder(
      animation: _morph,
      builder: (context, _) => _face(),
    ),
  );
}
