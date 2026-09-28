import 'dart:ui' show Color, Offset;

/// A flat list of drawing steps that paints a face.
///
/// Painting Crit is split in two. A pure step turns a face into a list of
/// these ops, and a small replay step puts them on a canvas. The ops use only
/// plain numbers and a handful of shapes that an SVG or HTML canvas can draw
/// exactly, so a renderer in another language can replay the same list and
/// get the same picture. `spec/SPEC.md` describes every op.
///
/// All coordinates are in the face's own units: the 200 unit box for a face,
/// the 280 unit stage for a ringing face.
sealed class FaceOp {
  const FaceOp();

  /// This op as JSON, in the shape `spec/SPEC.md` describes.
  Map<String, Object?> toJson();
}

/// Remembers the current transform and clip, to be put back by the matching
/// [RestoreOp].
final class SaveOp extends FaceOp {
  /// Saves the transform and clip.
  const SaveOp();

  @override
  Map<String, Object?> toJson() => {'op': 'save'};
}

/// Puts back the transform and clip from the matching [SaveOp].
final class RestoreOp extends FaceOp {
  /// Restores the transform and clip.
  const RestoreOp();

  @override
  Map<String, Object?> toJson() => {'op': 'restore'};
}

/// Moves everything drawn after it by [dx], [dy].
final class TranslateOp extends FaceOp {
  /// A move by [dx], [dy].
  const TranslateOp(this.dx, this.dy);

  /// How far right.
  final double dx;

  /// How far down.
  final double dy;

  @override
  Map<String, Object?> toJson() => {'op': 'translate', 'dx': dx, 'dy': dy};
}

/// Turns everything drawn after it by [radians] around the current origin.
/// Positive turns clockwise on screen, since y points down.
final class RotateOp extends FaceOp {
  /// A turn of [radians].
  const RotateOp(this.radians);

  /// How far to turn.
  final double radians;

  @override
  Map<String, Object?> toJson() => {'op': 'rotate', 'radians': radians};
}

/// Scales everything drawn after it around the current origin.
final class ScaleOp extends FaceOp {
  /// A scale by [sx] across and [sy] down.
  const ScaleOp(this.sx, this.sy);

  /// How much wider.
  final double sx;

  /// How much taller.
  final double sy;

  @override
  Map<String, Object?> toJson() => {'op': 'scale', 'sx': sx, 'sy': sy};
}

/// Limits everything drawn after it to the inside of an ellipse, until the
/// next [RestoreOp] that pops past it.
final class ClipOvalOp extends FaceOp {
  /// A clip to [oval].
  const ClipOvalOp(this.oval);

  /// The ellipse to draw inside.
  final OvalShape oval;

  @override
  Map<String, Object?> toJson() => {'op': 'clipOval', ...oval._fields()};
}

/// Paints one shape, filled or stroked.
final class DrawOp extends FaceOp {
  /// Paints [shape] with [paint].
  const DrawOp(this.shape, this.paint);

  /// What to paint.
  final OpShape shape;

  /// How to paint it.
  final OpPaint paint;

  @override
  Map<String, Object?> toJson() => {
    'op': paint.stroke ? 'stroke' : 'fill',
    'shape': shape.toJson(),
    ...paint._fields(),
  };
}

/// The paint for one [DrawOp]: a colour, and a pen width when it is stroked.
///
/// Every stroke in Crit has round ends and round corners, so those are
/// fixed rather than stored.
final class OpPaint {
  /// Fills the inside of the shape with [color].
  const OpPaint.fill(this.color) : stroke = false, width = 0;

  /// Draws the outline of the shape with a pen [width] wide in [color].
  const OpPaint.stroke(this.color, this.width) : stroke = true;

  /// The colour, alpha included.
  final Color color;

  /// True draws the outline, false fills the inside.
  final bool stroke;

  /// Pen width. Zero for a fill.
  final double width;

  Map<String, Object?> _fields() => {
    'color': colorToJson(color),
    if (stroke) ...{'width': width, 'cap': 'round', 'join': 'round'},
  };
}

/// A shape a [DrawOp] paints.
sealed class OpShape {
  const OpShape();

  /// This shape as JSON.
  Map<String, Object?> toJson();
}

/// An ellipse centred on ([cx], [cy]) with radii [rx] and [ry]. A circle is
/// an oval with both radii equal.
final class OvalShape extends OpShape {
  /// An ellipse.
  const OvalShape(this.cx, this.cy, this.rx, this.ry);

  /// A circle of [radius] around [centre].
  OvalShape.circle(Offset centre, double radius)
    : this(centre.dx, centre.dy, radius, radius);

  /// Middle, across.
  final double cx;

  /// Middle, down.
  final double cy;

  /// Half the width.
  final double rx;

  /// Half the height.
  final double ry;

  Map<String, Object?> _fields() => {'cx': cx, 'cy': cy, 'rx': rx, 'ry': ry};

  @override
  Map<String, Object?> toJson() => {'type': 'oval', ..._fields()};
}

/// A rectangle with its top left at ([x], [y]), [width] by [height], with
/// every corner rounded to a circle of [radius].
final class RRectShape extends OpShape {
  /// A rounded rectangle.
  const RRectShape(this.x, this.y, this.width, this.height, this.radius);

  /// Left edge.
  final double x;

  /// Top edge.
  final double y;

  /// Width.
  final double width;

  /// Height.
  final double height;

  /// Corner radius.
  final double radius;

  @override
  Map<String, Object?> toJson() => {
    'type': 'rrect',
    'x': x,
    'y': y,
    'width': width,
    'height': height,
    'radius': radius,
  };
}

/// A path made of [commands].
final class PathShape extends OpShape {
  /// A path.
  const PathShape(this.commands);

  /// The steps that trace it, in order.
  final List<PathCommand> commands;

  @override
  Map<String, Object?> toJson() => {
    'type': 'path',
    'commands': [for (final c in commands) c.toJson()],
  };
}

/// One step of a [PathShape].
sealed class PathCommand {
  const PathCommand();

  /// This step as a JSON array, its name first.
  List<Object> toJson();
}

/// Starts a new piece of path at ([x], [y]).
final class MoveTo extends PathCommand {
  /// A move.
  const MoveTo(this.x, this.y);

  /// Across.
  final double x;

  /// Down.
  final double y;

  @override
  List<Object> toJson() => ['M', x, y];
}

/// A straight line to ([x], [y]).
final class LineTo extends PathCommand {
  /// A line.
  const LineTo(this.x, this.y);

  /// Across.
  final double x;

  /// Down.
  final double y;

  @override
  List<Object> toJson() => ['L', x, y];
}

/// A quadratic curve bending toward ([cx], [cy]) and ending at ([x], [y]).
final class QuadTo extends PathCommand {
  /// A quadratic curve.
  const QuadTo(this.cx, this.cy, this.x, this.y);

  /// Control point, across.
  final double cx;

  /// Control point, down.
  final double cy;

  /// End, across.
  final double x;

  /// End, down.
  final double y;

  @override
  List<Object> toJson() => ['Q', cx, cy, x, y];
}

/// A cubic curve with two control points, ending at ([x], [y]).
final class CubicTo extends PathCommand {
  /// A cubic curve.
  const CubicTo(this.c1x, this.c1y, this.c2x, this.c2y, this.x, this.y);

  /// First control point, across.
  final double c1x;

  /// First control point, down.
  final double c1y;

  /// Second control point, across.
  final double c2x;

  /// Second control point, down.
  final double c2y;

  /// End, across.
  final double x;

  /// End, down.
  final double y;

  @override
  List<Object> toJson() => ['C', c1x, c1y, c2x, c2y, x, y];
}

/// Part of a circle around ([cx], [cy]) with [radius], starting [start]
/// radians round and going [sweep] radians further. Angles start at the
/// positive x axis and grow clockwise on screen, since y points down.
///
/// When the path already has a current point, a straight line joins it to
/// the start of the arc first, the way HTML canvas `arc()` behaves. When it
/// has none, the arc starts the path.
final class ArcTo extends PathCommand {
  /// An arc.
  const ArcTo(this.cx, this.cy, this.radius, this.start, this.sweep);

  /// Middle, across.
  final double cx;

  /// Middle, down.
  final double cy;

  /// Radius.
  final double radius;

  /// Where it starts, in radians.
  final double start;

  /// How far it goes, in radians. Negative goes anticlockwise.
  final double sweep;

  @override
  List<Object> toJson() => ['A', cx, cy, radius, start, sweep];
}

/// Joins the current piece of path back to where it started.
final class ClosePath extends PathCommand {
  /// A close.
  const ClosePath();

  @override
  List<Object> toJson() => ['Z'];
}

/// A colour as four numbers from 0 to 1: red, green, blue, alpha.
List<double> colorToJson(Color c) => [c.r, c.g, c.b, c.a];
