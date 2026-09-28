import 'package:critalarm_face/critalarm_face.dart';
import 'package:critalarm_face_example/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('every tab builds and shows faces', (tester) async {
    await tester.pumpWidget(const CritFaceExample());
    expect(find.byType(FaceWidget), findsWidgets);

    await tester.tap(find.text('Blend'));
    await tester.pump();
    expect(find.byType(Slider), findsOneWidget);
    await tester.drag(find.byType(Slider), const Offset(60, 0));
    await tester.pump();

    await tester.tap(find.text('Idle'));
    await tester.pump(const Duration(seconds: 10));
    expect(find.byType(IdleFace), findsOneWidget);

    await tester.tap(find.text('Ringing'));
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.byType(RingingFaceWidget), findsWidgets);

    await tester.tap(find.byIcon(Icons.dark_mode));
    await tester.pump(const Duration(seconds: 5));
    expect(find.byType(ShufflingRingingFace), findsOneWidget);

    // Leaving the page stops every loop, so nothing is left ticking.
    await tester.pumpWidget(const SizedBox());
  });
}
