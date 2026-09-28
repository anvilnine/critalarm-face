import 'dart:math' as math;
import 'dart:ui';

import 'package:critalarm_face/critalarm_face.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('pupilOnWhite', () {
    const lightInk = Color(0xFFF7F1EA);
    const darkInk = Color(0xFF1A140F);

    test('a dark ink stays as it is', () {
      expect(pupilOnWhite(darkInk), darkInk);
    });

    test('a light ink turns dark, so the pupil shows on the white', () {
      final pupil = pupilOnWhite(lightInk);
      expect(pupil, isNot(lightInk));
      expect(pupil.computeLuminance(), lessThan(0.2));
    });
  });

  group('buildFaceOps', () {
    final style = FaceStyle.fromPalette(CritPalette.light);

    test('every face opens with a save and closes with a restore', () {
      for (final state in FaceState.values) {
        final ops = buildFaceOps(faceFor(state), style);
        expect(ops.first, isA<SaveOp>(), reason: state.name);
        expect(ops.last, isA<RestoreOp>(), reason: state.name);
        var depth = 0;
        for (final op in ops) {
          if (op is SaveOp) depth++;
          if (op is RestoreOp) depth--;
          expect(depth, greaterThanOrEqualTo(0), reason: state.name);
        }
        expect(depth, 0, reason: state.name);
      }
    });

    test('the head is filled and outlined first', () {
      final ops = buildFaceOps(calmFace, style);
      final head = ops.whereType<DrawOp>().take(2).toList();
      expect(head[0].shape, isA<RRectShape>());
      expect(head[0].paint.stroke, isFalse);
      expect(head[1].paint.stroke, isTrue);
      expect(head[1].paint.width, 10);
    });

    test('a squashed head adds the squash around the middle', () {
      final ops = buildFaceOps(yawnFace, style);
      expect(ops[1], isA<TranslateOp>());
      expect((ops[2] as ScaleOp).sx, 0.97);
      expect((ops[2] as ScaleOp).sy, 1.04);
    });

    test('an eye with white showing clips its pupil to the ball', () {
      final ops = buildFaceOps(watchingFace, style);
      expect(ops.whereType<ClipOvalOp>(), hasLength(2));
    });

    test('ops turn into JSON with a name on every op', () {
      for (final op in buildFaceOps(breatheOutFace, style)) {
        expect(op.toJson()['op'], isA<String>());
      }
    });
  });

  group('circleUnionPath', () {
    test('two overlapping circles make one loop of two arcs', () {
      final path = circleUnionPath([
        (Offset.zero, 10),
        (const Offset(10, 0), 10),
      ]);
      expect(path.commands.whereType<MoveTo>(), hasLength(1));
      expect(path.commands.whereType<ArcTo>(), hasLength(2));
      expect(path.commands.last, isA<ClosePath>());
      // Each circle shows two thirds of its rim.
      for (final arc in path.commands.whereType<ArcTo>()) {
        expect(arc.sweep, closeTo(4 * math.pi / 3, 1e-9));
      }
    });

    test('a circle inside another is dropped', () {
      final path = circleUnionPath([(Offset.zero, 10), (Offset.zero, 4)]);
      final arcs = path.commands.whereType<ArcTo>().toList();
      expect(arcs, hasLength(1));
      expect(arcs.single.radius, 10);
      expect(arcs.single.sweep, closeTo(2 * math.pi, 1e-9));
    });

    test('the puff outline is one closed loop', () {
      final path = circleUnionPath(puffCircles);
      expect(path.commands.whereType<MoveTo>(), hasLength(1));
      // The big circle shows two stretches of rim, between the small ones.
      expect(path.commands.whereType<ArcTo>(), hasLength(4));
    });
  });

  group('SeededRandom', () {
    test('matches mulberry32', () {
      // First outputs of the reference JavaScript mulberry32 for seed 1.
      final r = SeededRandom(1);
      expect(
        [for (var i = 0; i < 3; i++) r.nextUint32()],
        [2693262067, 11749833, 2265367787],
      );
    });

    test('the same seed gives the same numbers', () {
      final a = SeededRandom(42);
      final b = SeededRandom(42);
      for (var i = 0; i < 100; i++) {
        expect(a.nextInt(1000), b.nextInt(1000));
      }
    });

    test('nextInt stays in range', () {
      final r = SeededRandom(7);
      for (var i = 0; i < 1000; i++) {
        expect(r.nextInt(5), inInclusiveRange(0, 4));
      }
    });
  });
}
