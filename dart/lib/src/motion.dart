import 'package:flutter/animation.dart' show Cubic, Curves;

/// Timings and easing curves the widgets use, in one place.
///
/// The values match the Crit Alarm app. `spec/SPEC.md` gives the formula
/// behind each curve so another renderer can move Crit the same way.
abstract final class CritMotion {
  /// One swing of the alarmed face's shake, left to right.
  static const Duration alarmedShake = Duration(milliseconds: 500);

  /// One swing of the shocked face's jitter.
  static const Duration shockedShake = Duration(milliseconds: 80);

  /// One full look around by the watching face.
  static const Duration watchingLook = Duration(milliseconds: 4000);

  /// One turn of the dizzy face's swirl eyes.
  static const Duration dizzySpin = Duration(seconds: 4);

  /// One hop of the laughing face's giggle.
  static const Duration laughingBounce = Duration(milliseconds: 350);

  /// One sway of the confused face's head.
  static const Duration confusedSway = Duration(milliseconds: 2200);

  /// How long a shuffling ringing face shows one style before the next one
  /// starts blending in.
  static const Duration ringingHold = Duration(seconds: 4);

  /// How long one ringing style takes to blend into the next.
  static const Duration ringingBlend = Duration(milliseconds: 600);

  /// Eases in and out. Used by the live face animations and the ringing
  /// shuffle. CSS calls this `cubic-bezier(0.42, 0, 0.58, 1)`.
  static const Cubic easeInOut = Curves.easeInOut;

  /// A softer ease in and out, used for idle face blends. It leaves and lands
  /// slower, which stops a look to the side snapping back.
  /// `cubic-bezier(0.645, 0.045, 0.355, 1)`.
  static const Cubic easeInOutCubic = Curves.easeInOutCubic;
}
