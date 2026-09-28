import 'dart:math' as math;

/// A small random number generator (mulberry32) that gives the same numbers
/// for the same seed in any language.
///
/// Dart's own `Random(seed)` is not written down anywhere another language
/// can copy, so the idle face and the ringing shuffle take one of these
/// when their output has to be the same everywhere. `spec/SPEC.md` has the
/// full algorithm.
class SeededRandom implements math.Random {
  /// A generator that starts from [seed]. Only the low 32 bits are used.
  SeededRandom(int seed) : _state = seed & 0xFFFFFFFF;

  int _state;

  /// The next raw value, a whole number from 0 to 2^32 - 1.
  int nextUint32() {
    _state = (_state + 0x6D2B79F5) & 0xFFFFFFFF;
    var t = _imul(_state ^ (_state >>> 15), _state | 1);
    t = (t ^ (t + _imul(t ^ (t >>> 7), t | 61))) & 0xFFFFFFFF;
    return (t ^ (t >>> 14)) & 0xFFFFFFFF;
  }

  /// A number from 0 up to but not including 1.
  @override
  double nextDouble() => nextUint32() / 4294967296;

  /// A whole number from 0 up to but not including [max].
  @override
  int nextInt(int max) {
    if (max <= 0) throw RangeError.range(max, 1, null, 'max');
    return (nextDouble() * max).floor();
  }

  /// True or false, even odds.
  @override
  bool nextBool() => nextDouble() < 0.5;

  /// 32 bit multiply that keeps the low 32 bits, split into 16 bit halves so
  /// it stays exact on the web, where Dart numbers are doubles.
  static int _imul(int a, int b) {
    final ah = (a >>> 16) & 0xFFFF;
    final al = a & 0xFFFF;
    final bh = (b >>> 16) & 0xFFFF;
    final bl = b & 0xFFFF;
    return (al * bl + ((((ah * bl + al * bh) & 0xFFFF) << 16) & 0xFFFFFFFF)) &
        0xFFFFFFFF;
  }
}
