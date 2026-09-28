import 'dart:async';
import 'dart:math' as math;

import 'package:critalarm_face/src/face_painter.dart';
import 'package:critalarm_face/src/face_shape.dart';
import 'package:critalarm_face/src/face_state.dart';
import 'package:critalarm_face/src/motion.dart';
import 'package:critalarm_face/src/ops/build_face_ops.dart';
import 'package:critalarm_face/src/palette.dart';
import 'package:flutter/material.dart';

/// Crit, showing one [FaceState], at any size.
///
/// With [isLive] on, six states move on their own: alarmed shakes, shocked
/// jitters, watching looks around, dizzy spins its eyes, laughing bounces
/// and confused sways. The system "reduce motion" setting holds them still.
///
/// Colours come from [palette], or from [CritPalette.light] or
/// [CritPalette.dark] to match the theme. Each colour can be set on its own.
class FaceWidget extends StatefulWidget {
  /// Crit showing [state], [size] wide and tall.
  const FaceWidget({
    required this.state,
    this.size = 120.0,
    this.isLive = false,
    this.shape,
    this.palette,
    this.fillColor,
    this.strokeColor,
    this.inkColor,
    this.tongueColor,
    this.tiltAngle,
    super.key,
  });

  /// Which expression. Also picks the outline colour (see
  /// [CritPalette.strokeFor]) and the live animation.
  final FaceState state;

  /// Width and height.
  final double size;

  /// True plays the state's live animation, if it has one.
  final bool isLive;

  /// Draws this shape instead of [state]'s own, standing still. The colours
  /// still follow [state]. Its tilt and nudge are applied, which is how a
  /// blend between two faces is shown.
  final FaceShape? shape;

  /// The colours. Null picks light or dark from the theme.
  final CritPalette? palette;

  /// The head. Overrides the palette.
  final Color? fillColor;

  /// The head outline. Overrides the palette and the per-state outline.
  final Color? strokeColor;

  /// Brows, pupils, lids and mouths. Overrides the palette.
  final Color? inkColor;

  /// An open mouth that does not name its own colour. Coral by default.
  final Color? tongueColor;

  /// Head tilt in radians. Null uses [FaceStatePresentation.defaultTilt]
  /// (-8 degrees for confused, 0 for the rest).
  final double? tiltAngle;

  @override
  State<FaceWidget> createState() => _FaceWidgetState();
}

class _FaceWidgetState extends State<FaceWidget> with TickerProviderStateMixin {
  AnimationController? _shakeController;
  AnimationController? _lookController;
  AnimationController? _dizzyController;
  AnimationController? _bounceController;
  AnimationController? _tiltSwayController;

  /// The system "reduce motion" setting, as last read. Null before the
  /// first read.
  bool? _reduceMotion;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduceMotion =
        MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (reduceMotion != _reduceMotion) {
      _reduceMotion = reduceMotion;
      _updateControllers();
    }
  }

  @override
  void didUpdateWidget(covariant FaceWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.state != widget.state ||
        oldWidget.isLive != widget.isLive ||
        (oldWidget.shape == null) != (widget.shape == null)) {
      _updateControllers();
    }
  }

  void _disposeControllers() {
    _shakeController?.dispose();
    _shakeController = null;
    _lookController?.dispose();
    _lookController = null;
    _dizzyController?.dispose();
    _dizzyController = null;
    _bounceController?.dispose();
    _bounceController = null;
    _tiltSwayController?.dispose();
    _tiltSwayController = null;
  }

  AnimationController _repeat(Duration duration, {bool reverse = false}) {
    final controller = AnimationController(vsync: this, duration: duration);
    unawaited(controller.repeat(reverse: reverse));
    return controller;
  }

  void _updateControllers() {
    _disposeControllers();
    // A still face needs no clock. build() draws it without the controllers.
    if (!widget.isLive || widget.shape != null || _reduceMotion == true) {
      return;
    }

    switch (widget.state) {
      case FaceState.alarmed:
        _shakeController = _repeat(CritMotion.alarmedShake, reverse: true);
      case FaceState.shocked:
        _shakeController = _repeat(CritMotion.shockedShake, reverse: true);
      case FaceState.watching:
        _lookController = _repeat(CritMotion.watchingLook);
      case FaceState.dizzy:
        _dizzyController = _repeat(CritMotion.dizzySpin);
      case FaceState.laughing:
        _bounceController = _repeat(CritMotion.laughingBounce, reverse: true);
      case FaceState.confused:
        _tiltSwayController = _repeat(CritMotion.confusedSway, reverse: true);
      // The rest hold still.
      // ignore: no_default_cases
      default:
        break;
    }
  }

  @override
  void dispose() {
    _disposeControllers();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final palette =
        widget.palette ??
        CritPalette.forBrightness(Theme.of(context).brightness);
    final reduceMotion =
        MediaQuery.maybeOf(context)?.disableAnimations ?? false;

    final fill = widget.fillColor ?? palette.fill;
    final stroke = widget.strokeColor ?? palette.strokeFor(widget.state);
    final ink = widget.inkColor ?? palette.ink;
    final shape = widget.shape;
    final drawn = shape ?? faceFor(widget.state);

    // A shape can turn and shift the whole head. That happens out here
    // rather than in the painter so the head and everything drawn on it move
    // together.
    final baseTilt =
        (widget.tiltAngle ?? widget.state.defaultTilt) + (shape?.tilt ?? 0);

    Widget painted({double lookDx = 0.0, double spiralRotation = 0.0}) {
      return SizedBox(
        width: widget.size,
        height: widget.size,
        child: CustomPaint(
          size: Size(widget.size, widget.size),
          painter: FacePainter(
            shape: drawn,
            style: FaceStyle(
              fillColor: fill,
              strokeColor: stroke,
              inkColor: ink,
              tongueColor: widget.tongueColor,
              lookDx: lookDx,
              spiralRotation: spiralRotation,
            ),
          ),
        ),
      );
    }

    Widget applyTilt(Widget child, double tilt) {
      if (tilt == 0.0) return child;
      return Transform.rotate(angle: tilt, child: child);
    }

    // The nudge is written in the 200 unit box, so it is scaled to the size
    // on screen.
    Widget applyNudge(Widget child) {
      final nudge = shape?.nudge ?? Offset.zero;
      if (nudge == Offset.zero) return child;
      return Transform.translate(
        offset: nudge * (widget.size / 200),
        child: child,
      );
    }

    if (reduceMotion || !widget.isLive || shape != null) {
      return applyNudge(applyTilt(painted(), baseTilt));
    }

    final shake = _shakeController;
    final look = _lookController;
    final dizzy = _dizzyController;
    final bounce = _bounceController;
    final sway = _tiltSwayController;

    // Alarmed: shake from -3 to +3 degrees, pivoting low on the head.
    if (widget.state == FaceState.alarmed && shake != null) {
      return AnimatedBuilder(
        animation: shake,
        builder: (context, child) {
          final angle = baseTilt + (-3.0 + shake.value * 6.0) * math.pi / 180.0;
          return Transform.rotate(
            angle: angle,
            alignment: const FractionalOffset(0.5, 0.6),
            child: painted(),
          );
        },
      );
    }

    // Shocked: a fast jitter.
    if (widget.state == FaceState.shocked && shake != null) {
      return AnimatedBuilder(
        animation: shake,
        builder: (context, child) {
          final progress = shake.value;
          final angle = baseTilt + (-2.0 + progress * 4.0) * math.pi / 180.0;
          return Transform.translate(
            offset: Offset(0, -1.0 + progress * 2.0),
            child: Transform.rotate(angle: angle, child: painted()),
          );
        },
      );
    }

    // Watching: the pupils drift left, wait, and come back.
    if (widget.state == FaceState.watching && look != null) {
      return AnimatedBuilder(
        animation: look,
        builder: (context, child) =>
            applyTilt(painted(lookDx: watchingLookDx(look.value)), baseTilt),
      );
    }

    // Dizzy: the swirl eyes spin and the head sways.
    if (widget.state == FaceState.dizzy && dizzy != null) {
      return AnimatedBuilder(
        animation: dizzy,
        builder: (context, child) {
          final t = dizzy.value;
          final swayAngle =
              baseTilt + math.sin(t * 4 * math.pi) * (3.0 * math.pi / 180.0);
          return Transform.rotate(
            angle: swayAngle,
            child: painted(spiralRotation: t * 2 * math.pi),
          );
        },
      );
    }

    // Laughing: a giggle bounce.
    if (widget.state == FaceState.laughing && bounce != null) {
      return AnimatedBuilder(
        animation: bounce,
        builder: (context, child) {
          final progress = CritMotion.easeInOut.transform(bounce.value);
          return Transform.translate(
            offset: Offset(0, -5.0 * progress),
            child: applyTilt(painted(), baseTilt),
          );
        },
      );
    }

    // Confused: the head cocks between -6 and -11 degrees.
    if (widget.state == FaceState.confused && sway != null) {
      return AnimatedBuilder(
        animation: sway,
        builder: (context, child) {
          final progress = CritMotion.easeInOut.transform(sway.value);
          final angle = (-6.0 - progress * 5.0) * math.pi / 180.0;
          return Transform.rotate(
            angle: widget.tiltAngle ?? angle,
            child: painted(),
          );
        },
      );
    }

    return applyTilt(painted(), baseTilt);
  }
}

/// How far the watching face's pupils have drifted at point [t] (0 to 1) of
/// its [CritMotion.watchingLook] loop, in box units.
///
/// They rest in the middle, ease 18 units left between 0.4 and 0.5, wait
/// there, and ease back between 0.9 and 1.
double watchingLookDx(double t) {
  if (t < 0.4) return 0;
  if (t < 0.5) return -18.0 * CritMotion.easeInOut.transform((t - 0.4) / 0.1);
  if (t < 0.9) return -18;
  return -18.0 * (1 - CritMotion.easeInOut.transform((t - 0.9) / 0.1));
}
