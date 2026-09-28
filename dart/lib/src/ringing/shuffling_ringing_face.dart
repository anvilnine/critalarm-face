import 'dart:async';
import 'dart:math' as math;

import 'package:critalarm_face/src/motion.dart';
import 'package:critalarm_face/src/ops/build_ringing_ops.dart';
import 'package:critalarm_face/src/palette.dart';
import 'package:critalarm_face/src/ringing/ringing_choreography.dart';
import 'package:critalarm_face/src/ringing/ringing_face_painter.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';
import 'package:critalarm_face/src/ringing/ringing_style.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

/// Crit ringing in a random [RingingStyle], blending into another random one
/// every few seconds for as long as it is on screen.
///
/// [size] is the whole stage, as with `RingingFaceWidget`: the head takes the
/// middle 200/280 of it. With motion off (by [isLive] or the system setting)
/// it holds one random style still on its most telling moment.
class ShufflingRingingFace extends StatefulWidget {
  /// A shuffling ringing face on a stage [size] wide and tall.
  const ShufflingRingingFace({
    this.size = 160,
    this.isLive = true,
    this.palette,
    this.random,
    super.key,
  });

  /// Width and height of the stage.
  final double size;

  /// False holds the face still.
  final bool isLive;

  /// The colours. Null picks light or dark from the theme.
  final CritPalette? palette;

  /// Where the style picks come from. A `SeededRandom` gives the same order
  /// every time. Null uses Dart's own.
  final math.Random? random;

  @override
  State<ShufflingRingingFace> createState() => _ShufflingRingingFaceState();
}

class _ShufflingRingingFaceState extends State<ShufflingRingingFace>
    with SingleTickerProviderStateMixin {
  late final math.Random _random = widget.random ?? math.Random();
  late final Ticker _ticker = createTicker(_onTick);
  late RingingStyle _style =
      RingingStyle.values[_random.nextInt(RingingStyle.values.length)];
  Duration _styleStart = Duration.zero;
  RingingStyle? _next;
  Duration _nextStart = Duration.zero;
  Duration _now = Duration.zero;
  bool _reduceMotion = false;

  bool get _animating => widget.isLive && !_reduceMotion;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduceMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    _sync();
  }

  @override
  void didUpdateWidget(covariant ShufflingRingingFace oldWidget) {
    super.didUpdateWidget(oldWidget);
    _sync();
  }

  void _sync() {
    if (_animating && !_ticker.isActive) {
      // A ticker counts from zero every time it starts.
      _now = Duration.zero;
      _styleStart = Duration.zero;
      _next = null;
      unawaited(_ticker.start());
    } else if (!_animating && _ticker.isActive) {
      _ticker.stop();
    }
  }

  void _onTick(Duration elapsed) {
    setState(() {
      _now = elapsed;
      final next = _next;
      if (next == null) {
        if (_now - _styleStart >= CritMotion.ringingHold) {
          _next = nextRingingStyle(_style, _random);
          _nextStart = _now;
        }
      } else if (_now - _nextStart >= CritMotion.ringingBlend) {
        _style = next;
        _styleStart = _nextStart;
        _next = null;
      }
    });
  }

  /// Where [style] is in its loop, having started at [start].
  RingingFrame _frameAt(RingingStyle style, Duration start) {
    final loops = (_now - start).inMicroseconds / style.period.inMicroseconds;
    return ringingFrameFor(style, loops % 1);
  }

  RingingFrame get _frame {
    if (!_animating) return ringingFrameFor(_style, _style.stillT);
    final current = _frameAt(_style, _styleStart);
    final next = _next;
    if (next == null) return current;
    final progress =
        ((_now - _nextStart).inMicroseconds /
                CritMotion.ringingBlend.inMicroseconds)
            .clamp(0.0, 1.0);
    return RingingFrame.lerp(
      current,
      _frameAt(next, _nextStart),
      CritMotion.easeInOut.transform(progress),
    );
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final palette =
        widget.palette ??
        CritPalette.forBrightness(Theme.of(context).brightness);
    return RepaintBoundary(
      child: CustomPaint(
        size: Size.square(widget.size),
        painter: RingingFacePainter(
          frame: _frame,
          colors: RingingColors.fromPalette(palette),
        ),
      ),
    );
  }
}
