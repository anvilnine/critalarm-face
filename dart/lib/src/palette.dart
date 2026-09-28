import 'dart:ui' show Brightness, Color;

import 'package:critalarm_face/src/face_state.dart';

/// The colours Crit is drawn in, for one theme.
///
/// [CritPalette.light] and [CritPalette.dark] hold the exact values the Crit
/// Alarm app uses. Build your own to put Crit in another colour scheme.
class CritPalette {
  /// A palette made of the given colours.
  const CritPalette({
    required this.fill,
    required this.stroke,
    required this.ink,
    required this.high,
    required this.crit,
    required this.cobalt,
  });

  /// The app's light theme: a yellow head with a dark outline and dark ink.
  static const CritPalette light = CritPalette(
    fill: Color(0xFFFFC93C),
    stroke: Color(0xFF1A140F),
    ink: Color(0xFF1A140F),
    high: Color(0xFFFF8A1F),
    crit: Color(0xFFF5473A),
    cobalt: Color(0xFF2A3BD8),
  );

  /// The app's dark theme: a dark head with a gold outline and light ink.
  static const CritPalette dark = CritPalette(
    fill: Color(0xFF241D18),
    stroke: Color(0xFFB08A22),
    ink: Color(0xFFF7F1EA),
    high: Color(0xFFFF8A1F),
    crit: Color(0xFFF5473A),
    cobalt: Color(0xFF7C8AFF),
  );

  /// [light] or [dark], to match [brightness].
  static CritPalette forBrightness(Brightness brightness) =>
      brightness == Brightness.dark ? dark : light;

  /// The head.
  final Color fill;

  /// The head outline on most faces.
  final Color stroke;

  /// Brows, pupils, lids and mouths.
  final Color ink;

  /// The outline of a worried face: something needs a look.
  final Color high;

  /// The alarm red: the outline of an alarmed face, and the flush, siren and
  /// other red extras on a ringing face.
  final Color crit;

  /// The outline of an acknowledged face.
  final Color cobalt;

  /// The outline colour a `FaceWidget` gives [state] unless told otherwise.
  /// Three states have their own: worried, alarmed and acknowledged.
  Color strokeFor(FaceState state) => switch (state) {
    FaceState.worried => high,
    FaceState.alarmed => crit,
    FaceState.acked => cobalt,
    _ => stroke,
  };
}

/// Colours that do not change with the theme.
abstract final class CritColors {
  /// The white of an eye, a shine, a puff of breath.
  static const Color white = Color(0xFFFFFFFF);

  /// What a pupil turns to on a white eye when the ink is light.
  static const Color darkInk = Color(0xFF1A140F);

  /// The heart above a loving face.
  static const Color heart = Color(0xFFE25563);

  /// A drop of sweat.
  static const Color sweatBlue = Color(0xFF8FD3F7);

  /// A tear.
  static const Color tearBlue = Color(0xFF4FA8E8);

  /// An alarm clock bell and its striker.
  static const Color gold = Color(0xFFFFC93C);

  /// A star or a bolt.
  static const Color starYellow = Color(0xFFFFD84A);

  /// Blushing cheeks.
  static const Color blushPink = Color(0xFFFF8FA3);
}
