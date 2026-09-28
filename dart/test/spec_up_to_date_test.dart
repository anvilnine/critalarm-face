import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import '../tool/spec_export.dart';

void main() {
  test('the spec files match a fresh export', () async {
    final files = await buildSpecFiles();
    for (final MapEntry(key: path, value: text) in files.entries) {
      final file = File('../spec/$path');
      expect(
        file.existsSync() && file.readAsStringSync() == text,
        isTrue,
        reason:
            'spec/$path is out of date. From dart/, run: '
            'fvm flutter test tool/export.dart',
      );
    }
  });
}
