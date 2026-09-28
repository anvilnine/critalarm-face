import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import '../tool/spec_export.dart';

/// How far a number on disk may be from a fresh export. The export rounds to
/// 6 places, so the last digit can move with the last bit of a sine on
/// another machine. Anything bigger is a real change.
const double numberSlack = 1e-6;

/// Walks [actual] (a fresh export) and [expected] (the file on disk) together
/// and returns the JSON path of the first place they differ, with both
/// values, or null when they match. Keys, strings, bools, nulls and list
/// lengths must be equal. Numbers must be within [numberSlack].
String? firstDifference(
  Object? actual,
  Object? expected, [
  String path = r'$',
]) {
  if (expected is num) {
    if (actual is! num) return '$path: file has $expected, export has $actual';
    if ((actual - expected).abs() > numberSlack) {
      return '$path: file has $expected, export has $actual';
    }
    return null;
  }
  if (expected is List) {
    if (actual is! List) return '$path: file has a list, export has $actual';
    if (actual.length != expected.length) {
      return '$path: file has ${expected.length} items, '
          'export has ${actual.length}';
    }
    for (var i = 0; i < expected.length; i++) {
      final d = firstDifference(actual[i], expected[i], '$path[$i]');
      if (d != null) return d;
    }
    return null;
  }
  if (expected is Map) {
    if (actual is! Map) return '$path: file has an object, export has $actual';
    for (final key in {...expected.keys, ...actual.keys}) {
      if (!expected.containsKey(key)) return '$path.$key: not in the file';
      if (!actual.containsKey(key)) return '$path.$key: not in the export';
      final d = firstDifference(actual[key], expected[key], '$path.$key');
      if (d != null) return d;
    }
    return null;
  }
  if (actual != expected) {
    return '$path: file has ${jsonEncode(expected)}, '
        'export has ${jsonEncode(actual)}';
  }
  return null;
}

void main() {
  test('the spec files match a fresh export', () async {
    final files = await buildSpecFiles();
    for (final MapEntry(key: path, value: text) in files.entries) {
      final file = File('../spec/$path');
      expect(
        file.existsSync(),
        isTrue,
        reason:
            'spec/$path is missing. From dart/, run: '
            'fvm flutter test tool/export.dart',
      );
      final difference = firstDifference(
        jsonDecode(text),
        jsonDecode(file.readAsStringSync()),
      );
      expect(
        difference,
        isNull,
        reason:
            'spec/$path is out of date at $difference. From dart/, run: '
            'fvm flutter test tool/export.dart',
      );
    }
  });

  group('firstDifference', () {
    test('lets numbers move within the slack', () {
      expect(firstDifference({'a': 1.0000004}, {'a': 1}), isNull);
    });

    test('names the path of a number that moved', () {
      expect(
        firstDifference(
          {
            'a': [1, 2.001],
          },
          {
            'a': [1, 2],
          },
        ),
        startsWith(r'$.a[1]:'),
      );
    });

    test('catches keys, strings, bools, nulls and lengths', () {
      expect(firstDifference({'a': 1}, {'b': 1}), isNotNull);
      expect(firstDifference({'a': 'x'}, {'a': 'y'}), isNotNull);
      expect(firstDifference({'a': true}, {'a': false}), isNotNull);
      expect(firstDifference({'a': null}, {'a': 0}), isNotNull);
      expect(firstDifference([1, 2], [1]), isNotNull);
    });
  });
}
