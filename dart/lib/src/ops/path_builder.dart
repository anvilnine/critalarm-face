import 'dart:math' as math;
import 'dart:ui' show Offset;

import 'package:critalarm_face/src/ops/face_op.dart';

/// Collects [PathCommand]s one call at a time, the way a canvas path is
/// built.
class OpPathBuilder {
  final List<PathCommand> _commands = [];

  /// Starts a new piece at [p].
  void moveTo(Offset p) => _commands.add(MoveTo(p.dx, p.dy));

  /// A straight line to [p].
  void lineTo(Offset p) => _commands.add(LineTo(p.dx, p.dy));

  /// A quadratic curve bending toward [control], ending at [end].
  void quadTo(Offset control, Offset end) =>
      _commands.add(QuadTo(control.dx, control.dy, end.dx, end.dy));

  /// A cubic curve through two control points, ending at [end].
  void cubicTo(Offset c1, Offset c2, Offset end) =>
      _commands.add(CubicTo(c1.dx, c1.dy, c2.dx, c2.dy, end.dx, end.dy));

  /// Part of a circle. See [ArcTo].
  void arc(Offset centre, double radius, double start, double sweep) =>
      _commands.add(ArcTo(centre.dx, centre.dy, radius, start, sweep));

  /// A circular arc from the current point [from] to [to] with [radius],
  /// the short way round, clockwise on screen when [clockwise] is true.
  ///
  /// This is what a canvas `arcToPoint` draws. It is stored as an [ArcTo]
  /// around the centre it works out, so every renderer draws the same arc.
  void arcToPoint(
    Offset from,
    Offset to,
    double radius, {
    bool clockwise = true,
  }) {
    final mid = (from + to) / 2;
    final chord = to - from;
    final half = chord.distance / 2;
    final r = math.max(radius, half);
    // How far the centre sits from the middle of the chord, on the side
    // that makes the short arc go the asked way round.
    final along = math.sqrt(math.max(0, r * r - half * half));
    final normal = half == 0
        ? Offset.zero
        : Offset(-chord.dy, chord.dx) / (half * 2);
    final centre = mid + normal * (clockwise ? along : -along);
    final start = math.atan2(from.dy - centre.dy, from.dx - centre.dx);
    final end = math.atan2(to.dy - centre.dy, to.dx - centre.dx);
    var sweep = end - start;
    if (clockwise) {
      while (sweep <= 0) {
        sweep += 2 * math.pi;
      }
    } else {
      while (sweep >= 0) {
        sweep -= 2 * math.pi;
      }
    }
    arc(centre, r, start, sweep);
  }

  /// Joins back to the start of the current piece.
  void close() => _commands.add(const ClosePath());

  /// The path so far.
  PathShape build() => PathShape(List.unmodifiable(_commands));
}

/// The outline of several overlapping circles merged into one shape, as a
/// path made only of arcs.
///
/// A puff of breath or a cloud of steam is a few circles. Filling each one
/// and stroking each outline would draw the lines where they overlap, and a
/// see-through fill would be darker where two circles cover the same spot.
/// So this walks the outside edge instead: each circle keeps the parts of
/// its rim no other circle covers, and those arcs are joined end to end.
/// The result fills and strokes as one shape in any renderer.
///
/// Circles fully inside another are dropped. A group with gaps that close
/// into a hole would trace the hole as a second loop; none of Crit's clouds
/// have one.
PathShape circleUnionPath(List<(Offset, double)> circles) {
  const tau = 2 * math.pi;
  final arcs = <_Arc>[];

  for (var i = 0; i < circles.length; i++) {
    final (ci, ri) = circles[i];
    if (ri <= 0) continue;
    final covered = <(double, double)>[];
    var hidden = false;
    for (var j = 0; j < circles.length; j++) {
      if (i == j) continue;
      final (cj, rj) = circles[j];
      if (rj <= 0) continue;
      final d = (cj - ci).distance;
      if (d >= ri + rj) continue;
      // Inside another circle. When two are the same, the first one wins.
      if (d + ri <= rj && (d + ri < rj || j < i)) {
        hidden = true;
        break;
      }
      if (d + rj <= ri) continue;
      final toward = math.atan2(cj.dy - ci.dy, cj.dx - ci.dx);
      final spread = math.acos(
        ((ri * ri + d * d - rj * rj) / (2 * ri * d)).clamp(-1.0, 1.0),
      );
      covered.add((toward - spread, toward + spread));
    }
    if (hidden) continue;
    if (covered.isEmpty) {
      arcs.add(_Arc(ci, ri, 0, tau));
      continue;
    }
    // Every covered span as a piece of 0 to 2 pi, then merged.
    final spans = <(double, double)>[];
    for (final (a, b) in covered) {
      final s = _wrap(a);
      final e = s + (b - a);
      if (e > tau) {
        spans
          ..add((s, tau))
          ..add((0, e - tau));
      } else {
        spans.add((s, e));
      }
    }
    spans.sort((x, y) => x.$1.compareTo(y.$1));
    final merged = <(double, double)>[];
    for (final span in spans) {
      if (merged.isNotEmpty && span.$1 <= merged.last.$2) {
        final last = merged.removeLast();
        merged.add((last.$1, math.max(last.$2, span.$2)));
      } else {
        merged.add(span);
      }
    }
    // The gaps between covered spans are the rim left showing. The last gap
    // wraps past 2 pi round to the first span.
    for (var k = 0; k < merged.length; k++) {
      final from = merged[k].$2;
      final to = k + 1 < merged.length ? merged[k + 1].$1 : merged[0].$1 + tau;
      if (to - from > 1e-9) arcs.add(_Arc(ci, ri, from, to - from));
    }
  }

  final path = OpPathBuilder();
  final left = [...arcs];
  while (left.isNotEmpty) {
    var arc = left.removeAt(0);
    path
      ..moveTo(arc.startPoint)
      ..arc(arc.centre, arc.radius, arc.start, arc.sweep);
    while (left.isNotEmpty) {
      // The next arc is the one starting where this one ends.
      final end = arc.endPoint;
      var best = 0;
      var bestGap = double.infinity;
      for (var k = 0; k < left.length; k++) {
        final gap = (left[k].startPoint - end).distance;
        if (gap < bestGap) {
          bestGap = gap;
          best = k;
        }
      }
      if (bestGap > 1e-3) break;
      arc = left.removeAt(best);
      path.arc(arc.centre, arc.radius, arc.start, arc.sweep);
    }
    path.close();
  }
  return path.build();
}

double _wrap(double a) {
  const tau = 2 * math.pi;
  final w = a % tau;
  return w < 0 ? w + tau : w;
}

class _Arc {
  _Arc(this.centre, this.radius, this.start, this.sweep);

  final Offset centre;
  final double radius;
  final double start;
  final double sweep;

  Offset _at(double angle) =>
      centre + Offset(math.cos(angle), math.sin(angle)) * radius;

  Offset get startPoint => _at(start);
  Offset get endPoint => _at(start + sweep);
}
