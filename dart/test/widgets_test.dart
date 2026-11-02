// FaceWidget, IdleFace and RingingFaceWidget: built, updated and thrown away.
//
// A running AnimationController keeps a frame callback scheduled, so
// `transientCallbackCount` is how these tests see whether a ticker is alive.
// A widget that is disposed with a ticker still running throws, and a timer
// still pending when a test ends fails it, which covers the rest.

import 'package:critalarm_face/critalarm_face.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child, {bool reduceMotion = false}) => MaterialApp(
  home: MediaQuery(
    data: MediaQueryData(disableAnimations: reduceMotion),
    child: Material(child: Center(child: child)),
  ),
);

/// Takes everything off screen, which disposes every state.
Future<void> _unmount(WidgetTester tester) async {
  await tester.pumpWidget(const SizedBox());
}

int _tickers(WidgetTester tester) => tester.binding.transientCallbackCount;

FacePainter _facePainter(WidgetTester tester) {
  final paint = tester.widget<CustomPaint>(
    find.descendant(
      of: find.byType(FaceWidget),
      matching: find.byType(CustomPaint),
    ),
  );
  return paint.painter! as FacePainter;
}

_FrameNumbers _ringingPainter(WidgetTester tester) {
  final paint = tester.widget<CustomPaint>(
    find.descendant(
      of: find.byType(RingingFaceWidget),
      matching: find.byType(CustomPaint),
    ),
  );
  return _FrameNumbers((paint.painter! as RingingFacePainter).frame);
}

/// The numbers of a ringing frame that move, so two frames can be compared.
class _FrameNumbers {
  _FrameNumbers(RingingFrame frame)
    : numbers = [
        frame.tilt,
        frame.nudge.dx,
        frame.nudge.dy,
        frame.scale,
        frame.flush,
        frame.flash,
        frame.spin,
      ];

  final List<double> numbers;
}

/// The states whose live animation runs a controller.
const List<FaceState> _moving = [
  FaceState.alarmed,
  FaceState.shocked,
  FaceState.watching,
  FaceState.dizzy,
  FaceState.laughing,
  FaceState.confused,
];

void main() {
  group('FaceWidget', () {
    testWidgets('builds a painter of the size and state it is given', (
      tester,
    ) async {
      await tester.pumpWidget(
        _host(const FaceWidget(state: FaceState.worried, size: 90)),
      );

      final box = tester.getSize(
        find
            .descendant(
              of: find.byType(FaceWidget),
              matching: find.byType(SizedBox),
            )
            .first,
      );
      expect(box, const Size(90, 90));
      expect(_facePainter(tester).shape, faceFor(FaceState.worried));
      expect(_tickers(tester), 0);
      await _unmount(tester);
    });

    testWidgets('a still face runs no ticker', (tester) async {
      for (final state in _moving) {
        await tester.pumpWidget(_host(FaceWidget(state: state)));
        await tester.pump(const Duration(milliseconds: 100));
        expect(_tickers(tester), 0, reason: '$state with isLive false');
      }
      await _unmount(tester);
    });

    testWidgets('every moving state runs a ticker and releases it on dispose', (
      tester,
    ) async {
      for (final state in _moving) {
        await tester.pumpWidget(_host(FaceWidget(state: state, isLive: true)));
        await tester.pump(const Duration(milliseconds: 100));
        expect(_tickers(tester), greaterThan(0), reason: '$state is live');

        await _unmount(tester);
        expect(_tickers(tester), 0, reason: '$state after dispose');
      }
    });

    testWidgets('a state that holds still runs no ticker when live', (
      tester,
    ) async {
      await tester.pumpWidget(
        _host(const FaceWidget(state: FaceState.calm, isLive: true)),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(_tickers(tester), 0);
      await _unmount(tester);
    });

    testWidgets('moves while live', (tester) async {
      await tester.pumpWidget(
        _host(const FaceWidget(state: FaceState.alarmed, isLive: true)),
      );
      Transform rotation() => tester.widget<Transform>(
        find
            .descendant(
              of: find.byType(FaceWidget),
              matching: find.byType(Transform),
            )
            .first,
      );
      final before = rotation().transform.storage.toList();
      await tester.pump(const Duration(milliseconds: 200));
      expect(rotation().transform.storage.toList(), isNot(before));
      await _unmount(tester);
    });

    testWidgets('changing state swaps the animation and the face', (
      tester,
    ) async {
      await tester.pumpWidget(
        _host(const FaceWidget(state: FaceState.alarmed, isLive: true)),
      );
      expect(_tickers(tester), greaterThan(0));

      await tester.pumpWidget(
        _host(const FaceWidget(state: FaceState.watching, isLive: true)),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(_facePainter(tester).shape, faceFor(FaceState.watching));
      expect(_tickers(tester), greaterThan(0));

      await tester.pumpWidget(
        _host(const FaceWidget(state: FaceState.calm, isLive: true)),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(_facePainter(tester).shape, faceFor(FaceState.calm));
      expect(_tickers(tester), 0);
      await _unmount(tester);
    });

    testWidgets('turning isLive off stops the ticker, and on starts it', (
      tester,
    ) async {
      await tester.pumpWidget(
        _host(const FaceWidget(state: FaceState.dizzy, isLive: true)),
      );
      expect(_tickers(tester), greaterThan(0));

      await tester.pumpWidget(
        _host(const FaceWidget(state: FaceState.dizzy)),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(_tickers(tester), 0);

      await tester.pumpWidget(
        _host(const FaceWidget(state: FaceState.dizzy, isLive: true)),
      );
      expect(_tickers(tester), greaterThan(0));
      await _unmount(tester);
    });

    testWidgets('a shape stands still and wins over the state', (tester) async {
      final shape = faceFor(FaceState.shocked);
      await tester.pumpWidget(
        _host(FaceWidget(state: FaceState.alarmed, isLive: true, shape: shape)),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(_facePainter(tester).shape, shape);
      expect(_tickers(tester), 0);

      // Dropping the shape hands the face back to its live animation.
      await tester.pumpWidget(
        _host(const FaceWidget(state: FaceState.alarmed, isLive: true)),
      );
      expect(_tickers(tester), greaterThan(0));
      await _unmount(tester);
    });

    testWidgets('reduce motion holds the face still, and release resumes it', (
      tester,
    ) async {
      await tester.pumpWidget(
        _host(
          const FaceWidget(state: FaceState.alarmed, isLive: true),
          reduceMotion: true,
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(_tickers(tester), 0);

      await tester.pumpWidget(
        _host(const FaceWidget(state: FaceState.alarmed, isLive: true)),
      );
      expect(_tickers(tester), greaterThan(0));
      await _unmount(tester);
    });
  });

  group('IdleFace', () {
    testWidgets('builds a calm face of the size it is given', (tester) async {
      await tester.pumpWidget(
        _host(IdleFace(size: 80, random: SeededRandom(1))),
      );
      final face = tester.widget<FaceWidget>(find.byType(FaceWidget));
      expect(face.size, 80);
      expect(face.state, FaceState.calm);
      expect(face.shape, isNull);
      await _unmount(tester);
    });

    testWidgets('plays a beat, then settles back to calm', (tester) async {
      await tester.pumpWidget(
        _host(IdleFace(size: 80, random: SeededRandom(1))),
      );
      var sawBeat = false;
      for (var i = 0; i < 600 && !sawBeat; i++) {
        await tester.pump(const Duration(milliseconds: 100));
        final face = tester.widget<FaceWidget>(find.byType(FaceWidget));
        sawBeat = face.shape != null;
      }
      expect(sawBeat, isTrue, reason: 'a beat should start within a minute');
      await _unmount(tester);
    });

    testWidgets('disposed mid-beat leaves no ticker and no timer', (
      tester,
    ) async {
      await tester.pumpWidget(
        _host(IdleFace(size: 80, random: SeededRandom(1))),
      );
      for (var i = 0; i < 600; i++) {
        await tester.pump(const Duration(milliseconds: 100));
        if (tester.widget<FaceWidget>(find.byType(FaceWidget)).shape != null) {
          break;
        }
      }
      await _unmount(tester);
      expect(_tickers(tester), 0);
      // The test also fails on exit if a Timer is still pending.
    });

    testWidgets('disabled, it runs nothing', (tester) async {
      await tester.pumpWidget(
        _host(IdleFace(size: 80, isEnabled: false, random: SeededRandom(1))),
      );
      await tester.pump(const Duration(minutes: 5));
      expect(tester.widget<FaceWidget>(find.byType(FaceWidget)).shape, isNull);
      expect(_tickers(tester), 0);
      expect(tester.binding.hasScheduledFrame, isFalse);
      await _unmount(tester);
    });

    testWidgets('switching off stops the loop and the timer', (tester) async {
      await tester.pumpWidget(
        _host(IdleFace(size: 80, random: SeededRandom(1))),
      );
      await tester.pump(const Duration(seconds: 3));

      await tester.pumpWidget(
        _host(IdleFace(size: 80, isEnabled: false, random: SeededRandom(1))),
      );
      await tester.pump();
      expect(tester.widget<FaceWidget>(find.byType(FaceWidget)).shape, isNull);
      expect(_tickers(tester), 0);
      // A timer left behind fails the test on exit.
      await _unmount(tester);
    });

    testWidgets('reduce motion keeps it calm and idle', (tester) async {
      await tester.pumpWidget(
        _host(
          IdleFace(size: 80, random: SeededRandom(1)),
          reduceMotion: true,
        ),
      );
      await tester.pump(const Duration(minutes: 5));
      expect(tester.widget<FaceWidget>(find.byType(FaceWidget)).shape, isNull);
      await _unmount(tester);
    });

    testWidgets('a covered screen (TickerMode off) stops it', (tester) async {
      await tester.pumpWidget(
        _host(
          TickerMode(
            enabled: false,
            child: IdleFace(size: 80, random: SeededRandom(1)),
          ),
        ),
      );
      await tester.pump(const Duration(minutes: 5));
      expect(tester.widget<FaceWidget>(find.byType(FaceWidget)).shape, isNull);
      await _unmount(tester);
    });
  });

  group('RingingFaceWidget', () {
    testWidgets('builds a stage of the size it is given', (tester) async {
      await tester.pumpWidget(
        _host(
          const RingingFaceWidget(style: RingingStyle.classic, size: 140),
        ),
      );
      expect(
        tester.getSize(
          find
              .descendant(
                of: find.byType(RingingFaceWidget),
                matching: find.byType(SizedBox),
              )
              .first,
        ),
        const Size(140, 140),
      );
      expect(_tickers(tester), greaterThan(0));
      await _unmount(tester);
    });

    testWidgets('moves while live, and releases its ticker on dispose', (
      tester,
    ) async {
      await tester.pumpWidget(
        _host(const RingingFaceWidget(style: RingingStyle.classic)),
      );
      final before = _ringingPainter(tester).numbers;
      await tester.pump(const Duration(milliseconds: 130));
      expect(_ringingPainter(tester).numbers, isNot(before));

      await _unmount(tester);
      expect(_tickers(tester), 0);
    });

    testWidgets('isLive false holds the still point with no ticker', (
      tester,
    ) async {
      await tester.pumpWidget(
        _host(
          const RingingFaceWidget(style: RingingStyle.classic, isLive: false),
        ),
      );
      final before = _ringingPainter(tester).numbers;
      await tester.pump(const Duration(milliseconds: 500));
      expect(_ringingPainter(tester).numbers, before);
      expect(_tickers(tester), 0);
      await _unmount(tester);
    });

    testWidgets('isLive can be switched off and on again', (tester) async {
      await tester.pumpWidget(
        _host(const RingingFaceWidget(style: RingingStyle.classic)),
      );
      expect(_tickers(tester), greaterThan(0));

      await tester.pumpWidget(
        _host(
          const RingingFaceWidget(style: RingingStyle.classic, isLive: false),
        ),
      );
      await tester.pump();
      expect(_tickers(tester), 0);

      await tester.pumpWidget(
        _host(const RingingFaceWidget(style: RingingStyle.classic)),
      );
      expect(_tickers(tester), greaterThan(0));
      await _unmount(tester);
    });

    testWidgets('a new style or speed keeps the loop running', (tester) async {
      await tester.pumpWidget(
        _host(const RingingFaceWidget(style: RingingStyle.classic)),
      );
      await tester.pump(const Duration(milliseconds: 100));

      await tester.pumpWidget(
        _host(const RingingFaceWidget(style: RingingStyle.classic, speed: 3)),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(_tickers(tester), greaterThan(0));

      await tester.pumpWidget(
        _host(
          RingingFaceWidget(style: RingingStyle.values.last, speed: 3),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(_tickers(tester), greaterThan(0));
      await _unmount(tester);
      expect(_tickers(tester), 0);
    });

    testWidgets('reduce motion holds the still point', (tester) async {
      await tester.pumpWidget(
        _host(
          const RingingFaceWidget(style: RingingStyle.classic),
          reduceMotion: true,
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));
      expect(_tickers(tester), 0);
      await _unmount(tester);
    });
  });
}
