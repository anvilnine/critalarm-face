// Draws every face with the Crit Alarm app's original painter and with the
// draw op replay, and checks the pixels match. This is what proves the split
// into ops did not change how Crit looks.
//
// Set CRIT_FACE_CONTACT_DIR to a folder to also write contact sheets there:
// each face drawn by the original painter, by the replay, and the difference
// between them.

import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:critalarm_face/critalarm_face.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import 'reference/reference_face_painter.dart';
import 'reference/reference_ringing_face_painter.dart';

const double _px = 200;

class _Case {
  _Case(this.name, this.reference, this.replay);

  final String name;
  final CustomPainter reference;
  final CustomPainter replay;
}

Future<Uint8List> _pixels(CustomPainter painter) async {
  final recorder = ui.PictureRecorder();
  painter.paint(Canvas(recorder), const Size(_px, _px));
  final image = await recorder.endRecording().toImage(
    _px.toInt(),
    _px.toInt(),
  );
  final data = await image.toByteData();
  image.dispose();
  return data!.buffer.asUint8List();
}

/// How many pixels differ by more than [tolerance] in any channel, and the
/// largest difference seen.
(int, int) _compare(Uint8List a, Uint8List b, {int tolerance = 24}) {
  var off = 0;
  var worst = 0;
  for (var i = 0; i < a.length; i += 4) {
    var pixelWorst = 0;
    for (var c = 0; c < 4; c++) {
      final d = (a[i + c] - b[i + c]).abs();
      if (d > pixelWorst) pixelWorst = d;
    }
    if (pixelWorst > worst) worst = pixelWorst;
    if (pixelWorst > tolerance) off++;
  }
  return (off, worst);
}

List<_Case> _faceCases(CritPalette palette, String theme) {
  final cases = <_Case>[];
  void add(
    String name,
    FaceShape shape,
    FaceState colorsOf, {
    double lookDx = 0,
    double spin = 0,
  }) {
    final stroke = palette.strokeFor(colorsOf);
    cases.add(
      _Case(
        '$theme/$name',
        ReferenceFacePainter(
          state: colorsOf,
          fillColor: palette.fill,
          strokeColor: stroke,
          inkColor: palette.ink,
          lookDx: lookDx,
          spiralRotation: spin,
          shape: shape,
        ),
        FacePainter(
          shape: shape,
          style: FaceStyle(
            fillColor: palette.fill,
            strokeColor: stroke,
            inkColor: palette.ink,
            lookDx: lookDx,
            spiralRotation: spin,
          ),
        ),
      ),
    );
  }

  for (final state in FaceState.values) {
    add(state.name, faceFor(state), state);
  }
  add('watching-look', watchingFace, FaceState.watching, lookDx: -18);
  add('dizzy-spin', dizzyFace, FaceState.dizzy, spin: 1.3);
  for (final (a, b) in blendPairs) {
    for (final t in const [0.25, 0.5, 0.75]) {
      add(
        '${a.name}-${b.name}-$t',
        FaceShape.lerp(faceFor(a), faceFor(b), t),
        FaceState.calm,
      );
    }
  }
  return cases;
}

/// Pairs that cover the blend rules: a dot eye opening into a ringed one,
/// props growing in and fading out, and the halfway flips.
const List<(FaceState, FaceState)> blendPairs = [
  (FaceState.calm, FaceState.shocked),
  (FaceState.calm, FaceState.alarmed),
  (FaceState.calm, FaceState.success),
  (FaceState.dozing, FaceState.wakesUp),
  (FaceState.breatheIn, FaceState.breatheOut),
  (FaceState.happy, FaceState.laughing),
  (FaceState.calm, FaceState.love),
];

List<_Case> _ringingCases() {
  const palette = CritPalette.light;
  return [
    for (final style in RingingStyle.values)
      for (var i = 0; i <= 10; i++)
        () {
          final frame = ringingFrameFor(style, i / 10);
          return _Case(
            'ringing/${style.name}-${i / 10}',
            ReferenceRingingFacePainter(
              frame: frame,
              fillColor: palette.fill,
              strokeColor: palette.crit,
              inkColor: palette.ink,
              accentColor: palette.crit,
            ),
            RingingFacePainter(
              frame: frame,
              colors: RingingColors.fromPalette(palette),
            ),
          );
        }(),
  ];
}

Future<void> _writeSheet(String path, List<_Case> cases) async {
  // Four cases a row, each as original, replay, difference.
  const cell = _px;
  const perRow = 4;
  final rows = (cases.length / perRow).ceil();
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  const width = cell * 3 * perRow;
  final height = cell * rows;
  canvas.drawRect(
    Rect.fromLTWH(0, 0, width, height),
    Paint()..color = const Color(0xFFF7F2E9),
  );
  for (var n = 0; n < cases.length; n++) {
    final c = cases[n];
    final x = (n % perRow) * 3 * cell;
    final y = (n ~/ perRow) * cell;
    for (final (col, painter) in [(0, c.reference), (1, c.replay)]) {
      canvas
        ..save()
        ..translate(x + col * cell, y);
      painter.paint(canvas, const Size(cell, cell));
      canvas.restore();
    }
    // The difference: red wherever the two disagree.
    final a = await _pixels(c.reference);
    final b = await _pixels(c.replay);
    for (var i = 0; i < a.length; i += 4) {
      var d = 0;
      for (var k = 0; k < 4; k++) {
        final v = (a[i + k] - b[i + k]).abs();
        if (v > d) d = v;
      }
      if (d == 0) continue;
      final p = i ~/ 4;
      canvas.drawRect(
        Rect.fromLTWH(x + 2 * cell + p % _px.toInt(), y + p ~/ _px, 1, 1),
        Paint()..color = Color.fromARGB(255, 255, 255 - d, 255 - d),
      );
    }
  }
  final image = await recorder.endRecording().toImage(
    width.toInt(),
    height.toInt(),
  );
  final png = await image.toByteData(format: ui.ImageByteFormat.png);
  File(path).writeAsBytesSync(png!.buffer.asUint8List());
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final groups = {
    'faces-light': _faceCases(CritPalette.light, 'light'),
    'faces-dark': _faceCases(CritPalette.dark, 'dark'),
    'ringing': _ringingCases(),
  };

  for (final MapEntry(key: group, value: cases) in groups.entries) {
    test(
      '$group: the op replay draws what the original painter drew',
      () async {
        final report = <String>[];
        for (final c in cases) {
          final (off, worst) = _compare(
            await _pixels(c.reference),
            await _pixels(c.replay),
          );
          // Edge pixels may land a shade apart where the same curve is built
          // a different way. The most seen is 54 pixels, on the cusps of a
          // puff or steam cloud, whose outline is traced from arcs here and
          // merged by Skia in the app. A changed shape shows as hundreds.
          if (off > 60) report.add('${c.name}: $off pixels off, worst $worst');
        }
        final dir = Platform.environment['CRIT_FACE_CONTACT_DIR'];
        if (dir != null) {
          Directory(dir).createSync(recursive: true);
          await _writeSheet('$dir/$group.png', cases);
        }
        expect(report, isEmpty, reason: report.join('\n'));
      },
    );
  }
}
