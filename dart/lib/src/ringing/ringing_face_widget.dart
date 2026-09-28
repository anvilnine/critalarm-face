import 'dart:async';

import 'package:critalarm_face/src/ops/build_ringing_ops.dart';
import 'package:critalarm_face/src/palette.dart';
import 'package:critalarm_face/src/ringing/ringing_choreography.dart';
import 'package:critalarm_face/src/ringing/ringing_face_painter.dart';
import 'package:critalarm_face/src/ringing/ringing_style.dart';
import 'package:flutter/material.dart';

/// Crit ringing in one of the [RingingStyle]s, looping.
///
/// [size] is the whole stage, not just the head: the head takes the middle
/// 200/280 of it and the rest is room for sweat, stars and steam. With
/// motion off (by [isLive] or the system setting) it holds still on the
/// style's most telling moment, [RingingStylePresentation.stillT].
class RingingFaceWidget extends StatefulWidget {
  /// Crit ringing in [style], on a stage [size] wide and tall.
  const RingingFaceWidget({
    required this.style,
    this.size = 160,
    this.isLive = true,
    this.speed = 1,
    this.palette,
    this.fillColor,
    this.strokeColor,
    this.inkColor,
    this.accentColor,
    super.key,
  });

  /// Which animation.
  final RingingStyle style;

  /// Width and height of the stage.
  final double size;

  /// False holds the face still.
  final bool isLive;

  /// How fast the loop plays, 1 being its normal speed. Held between 0.1
  /// and 4.
  final double speed;

  /// The colours. Null picks light or dark from the theme.
  final CritPalette? palette;

  /// The head. Defaults to the palette's fill.
  final Color? fillColor;

  /// The head outline. Defaults to the alarm red.
  final Color? strokeColor;

  /// Brows, eyes and mouth. Defaults to the palette's ink.
  final Color? inkColor;

  /// The flush, the siren and the other red extras. Defaults to the alarm
  /// red.
  final Color? accentColor;

  @override
  State<RingingFaceWidget> createState() => _RingingFaceWidgetState();
}

class _RingingFaceWidgetState extends State<RingingFaceWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _loop = AnimationController(
    vsync: this,
    duration: _period,
  );
  bool _reduceMotion = false;

  Duration get _period {
    final ms = widget.style.period.inMilliseconds / widget.speed.clamp(0.1, 4);
    return Duration(milliseconds: ms.round());
  }

  bool get _animating => widget.isLive && !_reduceMotion;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduceMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    _sync();
  }

  @override
  void didUpdateWidget(covariant RingingFaceWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.style != widget.style || oldWidget.speed != widget.speed) {
      _loop.duration = _period;
      if (_loop.isAnimating) unawaited(_loop.repeat());
    }
    _sync();
  }

  void _sync() {
    if (_animating && !_loop.isAnimating) {
      unawaited(_loop.repeat());
    } else if (!_animating && _loop.isAnimating) {
      _loop.stop();
    }
  }

  @override
  void dispose() {
    _loop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final palette =
        widget.palette ??
        CritPalette.forBrightness(Theme.of(context).brightness);
    final colors = RingingColors(
      fillColor: widget.fillColor ?? palette.fill,
      strokeColor: widget.strokeColor ?? palette.crit,
      inkColor: widget.inkColor ?? palette.ink,
      accentColor: widget.accentColor ?? palette.crit,
    );

    return RepaintBoundary(
      child: SizedBox.square(
        dimension: widget.size,
        child: AnimatedBuilder(
          animation: _loop,
          builder: (context, _) {
            final t = _animating ? _loop.value : widget.style.stillT;
            return CustomPaint(
              size: Size.square(widget.size),
              painter: RingingFacePainter(
                frame: ringingFrameFor(widget.style, t),
                colors: colors,
              ),
            );
          },
        ),
      ),
    );
  }
}
