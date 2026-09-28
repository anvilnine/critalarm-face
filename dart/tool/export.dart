// Writes ../spec/faces.json and ../spec/fixtures/*.json from the package.
//
// The package draws with dart:ui, so this runs under the Flutter test
// runner rather than plain `dart run`. From the dart/ folder:
//
//   fvm flutter test tool/export.dart

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'spec_export.dart';

void main() {
  test('write the spec files', () async {
    final files = await buildSpecFiles();
    for (final MapEntry(key: path, value: text) in files.entries) {
      final file = File('../spec/$path');
      file.parent.createSync(recursive: true);
      file.writeAsStringSync(text);
      // The runner shows this, so it is clear what changed.
      // ignore: avoid_print
      print('wrote spec/$path (${text.length} bytes)');
    }
  });
}
