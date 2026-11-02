import 'dart:math' as math;

// ---------------------------------------------------------------------------
// Timing helpers. Everything is a plain function of t.
// ---------------------------------------------------------------------------

/// One full turn in radians.
const double tau = 2 * math.pi;

/// The part of [x] after the point, 0 up to but not including 1.
double frac(double x) => x - x.floorToDouble();

/// A sine that turns [cycles] whole times per loop, -1 to 1.
double wave(double t, int cycles, [double phase = 0]) =>
    math.sin(tau * (t * cycles + phase));

/// The same as [wave], moved to 0 to 1.
double pulse(double t, int cycles, [double phase = 0]) =>
    0.5 + 0.5 * wave(t, cycles, phase);

/// How far [t] is between [a] and [b], held at 0 before and 1 after.
double seg(double t, double a, double b) => ((t - a) / (b - a)).clamp(0, 1);

/// Overshoots and settles, for anything that springs into place.
double elastic(double x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return math.pow(2, -10 * x) * math.sin((x - 0.075) * tau / 0.3) + 1;
}

/// Up and back down over 0 to 1.
double bump(double x) => math.sin(math.pi * x.clamp(0, 1));

/// Squares a wave off so a glance snaps rather than slides.
double snap(double v, [double k = 4]) {
  final e = math.exp(2 * k * v);
  return (e - 1) / (e + 1);
}

/// Degrees to radians.
double deg(double d) => d * math.pi / 180;
