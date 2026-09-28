// Builds the files under ../spec from the Dart package, so other languages
// have numbers to port from and fixtures to test against. See
// ../spec/SPEC.md for what every field means.
//
// tool/export.dart writes them. test/spec_up_to_date_test.dart fails when the
// files on disk no longer match.

import 'dart:async';
import 'dart:convert';
import 'dart:ui';

import 'package:critalarm_face/critalarm_face.dart';
import 'package:flutter/animation.dart' show Cubic;

/// Bumped whenever a field changes meaning or goes away.
const int schemaVersion = 1;

/// Where each file goes, relative to the `spec` folder.
const String facesPath = 'faces.json';

/// Draw ops for faces, blends and ringing frames.
const String opsPath = 'fixtures/ops.json';

/// Blended face numbers and ringing frame numbers.
const String shapesPath = 'fixtures/shapes.json';

/// Idle controller runs.
const String idlePath = 'fixtures/idle.json';

/// Pairs of faces whose blends go in the fixtures. Between them they cover a
/// dot eye opening into a ringed one, the ring filled with the head colour,
/// props growing in and fading out, the mouth fill flipping between ink and
/// tongue, a lid shutting and a head squashing.
const List<(FaceState, FaceState)> blendPairs = [
  (FaceState.calm, FaceState.watching),
  (FaceState.calm, FaceState.shocked),
  (FaceState.calm, FaceState.alarmed),
  (FaceState.alarmed, FaceState.shocked),
  (FaceState.calm, FaceState.success),
  (FaceState.dozing, FaceState.wakesUp),
  (FaceState.breatheIn, FaceState.breatheOut),
  (FaceState.calm, FaceState.love),
  (FaceState.happy, FaceState.laughing),
  (FaceState.calm, FaceState.blink),
  (FaceState.calm, FaceState.yawn),
  (FaceState.lookLeft, FaceState.lookRight),
];

/// The points of a blend written to the fixtures.
const List<double> blendTs = [0, 0.25, 0.5, 0.75, 1];

/// The points of each ringing loop written to the fixtures, besides the
/// style's own still point.
const List<double> ringingTs = [0, 0.25, 0.5, 0.75];

/// Builds every spec file, keyed by its path inside `spec`.
Future<Map<String, String>> buildSpecFiles() async => {
  facesPath: _pretty(_round(_faces())),
  opsPath: _pretty(_round(_ops())),
  shapesPath: _pretty(_round(_shapes())),
  idlePath: _pretty(_round(await _idle())),
};

// ---------------------------------------------------------------------------
// faces.json
// ---------------------------------------------------------------------------

Map<String, Object?> _faces() => {
  'schemaVersion': schemaVersion,
  'box': {
    'size': 200,
    'middle': [100, 100],
    'head': {'x': 12, 'y': 12, 'width': 176, 'height': 176, 'radius': 66},
  },
  'ringingStage': {
    'size': ringingStageUnits,
    'inset': (ringingStageUnits - 200) / 2,
  },
  'palettes': {
    'light': _palette(CritPalette.light),
    'dark': _palette(CritPalette.dark),
  },
  'strokeByState': {
    for (final s in FaceState.values)
      s.name: switch (s) {
        FaceState.worried => 'high',
        FaceState.alarmed => 'crit',
        FaceState.acked => 'cobalt',
        _ => 'stroke',
      },
  },
  'colors': {
    'white': _color(CritColors.white),
    'darkInk': _color(CritColors.darkInk),
    'mouthCoral': _color(mouthCoral),
    'heart': _color(CritColors.heart),
    'sweatBlue': _color(CritColors.sweatBlue),
    'tearBlue': _color(CritColors.tearBlue),
    'gold': _color(CritColors.gold),
    'starYellow': _color(CritColors.starYellow),
    'blushPink': _color(CritColors.blushPink),
  },
  'motion': {
    'durationsMs': {
      'alarmedShake': CritMotion.alarmedShake.inMilliseconds,
      'shockedShake': CritMotion.shockedShake.inMilliseconds,
      'watchingLook': CritMotion.watchingLook.inMilliseconds,
      'dizzySpin': CritMotion.dizzySpin.inMilliseconds,
      'laughingBounce': CritMotion.laughingBounce.inMilliseconds,
      'confusedSway': CritMotion.confusedSway.inMilliseconds,
      'ringingHold': CritMotion.ringingHold.inMilliseconds,
      'ringingBlend': CritMotion.ringingBlend.inMilliseconds,
    },
    'easing': {
      'easeInOut': _easing(CritMotion.easeInOut),
      'easeInOutCubic': _easing(CritMotion.easeInOutCubic),
    },
    'watchingLookDx': [
      for (var i = 0; i <= 20; i++) [i / 20, watchingLookDx(i / 20)],
    ],
  },
  'states': [
    for (final s in FaceState.values)
      {
        'name': s.name,
        'label': s.label,
        'description': s.description,
        'characteristicColor': _color(s.characteristicColor),
        'defaultTilt': s.defaultTilt,
      },
  ],
  'faces': {for (final s in FaceState.values) s.name: shapeJson(faceFor(s))},
  'propKinds': [for (final k in PropKind.values) k.name],
  'puffCircles': _circles(puffCircles),
  'steamCircles': _circles(steamCircles),
  'ringFxKinds': [for (final k in RingFxKind.values) k.name],
  'ringingStyles': [
    for (final s in RingingStyle.values)
      {
        'name': s.name,
        'label': s.label,
        'description': s.description,
        'periodMs': s.period.inMilliseconds,
        'stillT': s.stillT,
      },
  ],
  'idle': {
    'beats': [for (final b in IdleFaceController.beats) _beat(b)],
    'waking': _beat(IdleFaceController.waking),
    'tiredFaces': [for (final f in IdleFaceController.tiredFaces) f.name],
    'nightLift': IdleFaceController.nightLift,
    'dayStarts': IdleFaceController.dayStarts,
    'dayEnds': IdleFaceController.dayEnds,
    'minGapMs': IdleFaceController.minGap.inMilliseconds,
    'maxGapMs': IdleFaceController.maxGap.inMilliseconds,
    'dozeAfterMs': IdleFaceController.dozeAfter.inMilliseconds,
    'dozeAfterAtNightMs': IdleFaceController.dozeAfterAtNight.inMilliseconds,
    'nodOff': {
      'sleepyEnterMs': 700,
      'sleepyHoldMs': 900,
      'dozingEnterMs': 800,
    },
  },
  'random': {
    'algorithm': 'mulberry32',
    'samples': [
      for (final seed in const [0, 1, 42, 2026])
        {
          'seed': seed,
          'uint32': () {
            final r = SeededRandom(seed);
            return [for (var i = 0; i < 8; i++) r.nextUint32()];
          }(),
        },
    ],
  },
};

Map<String, Object?> _palette(CritPalette p) => {
  'fill': _color(p.fill),
  'stroke': _color(p.stroke),
  'ink': _color(p.ink),
  'high': _color(p.high),
  'crit': _color(p.crit),
  'cobalt': _color(p.cobalt),
};

Map<String, Object?> _easing(Cubic c) => {
  'cubicBezier': [c.a, c.b, c.c, c.d],
  'samples': [
    for (var i = 0; i <= 20; i++) [i / 20, c.transform(i / 20)],
  ],
};

Map<String, Object?> _beat(IdleBeat b) => {
  'face': b.face.name,
  'weight': b.weight,
  'enterMs': b.enter.inMilliseconds,
  'holdMs': b.hold.inMilliseconds,
  'leaveMs': b.leave.inMilliseconds,
  'thenPlay': b.thenPlay == null ? null : _beat(b.thenPlay!),
};

List<Object?> _circles(List<(Offset, double)> circles) => [
  for (final (at, r) in circles) {'at': _pt(at), 'radius': r},
];

// ---------------------------------------------------------------------------
// Shapes and frames as JSON.
// ---------------------------------------------------------------------------

List<double> _pt(Offset p) => [p.dx, p.dy];

List<double>? _color(Color? c) => c == null ? null : colorToJson(c);

/// A [FaceShape] as JSON, every field spelled out.
Map<String, Object?> shapeJson(FaceShape f) => {
  'leftEye': _eye(f.leftEye),
  'rightEye': _eye(f.rightEye),
  'leftBrow': _brow(f.leftBrow),
  'rightBrow': _brow(f.rightBrow),
  'mouth': {
    'points': [for (final p in f.mouth.points) _pt(p)],
    'width': f.mouth.width,
    'fill': f.mouth.fill,
    'fillColor': _color(f.mouth.fillColor),
    'fillsWithInk': f.mouth.fillsWithInk,
  },
  'head': {
    'squashX': f.head.squashX,
    'squashY': f.head.squashY,
    'strokeWidth': f.head.strokeWidth,
  },
  'props': [
    for (final p in f.props)
      {
        'kind': p.kind.name,
        'at': _pt(p.at),
        'scale': p.scale,
        'alpha': p.alpha,
      },
  ],
  'tilt': f.tilt,
  'nudge': _pt(f.nudge),
};

Map<String, Object?> _eye(EyeShape e) => {
  'centre': _pt(e.centre),
  'ballRadius': e.ballRadius,
  'ballSquash': e.ballSquash,
  'ballWidth': e.ballWidth,
  'ballIsHead': e.ballIsHead,
  'pupilRadius': e.pupilRadius,
  'pupilOffset': _pt(e.pupilOffset),
  'shineRadius': e.shineRadius,
  'shineOffset': _pt(e.shineOffset),
  'spiral': e.spiral,
  'lid': e.lid,
  'lidPoints': [for (final p in e.lidPoints) _pt(p)],
  'lidWidth': e.lidWidth,
};

Map<String, Object?> _brow(BrowShape b) => {
  'points': [for (final p in b.points) _pt(p)],
  'width': b.width,
  'alpha': b.alpha,
};

/// A [RingingFrame] as JSON.
Map<String, Object?> frameJson(RingingFrame f) => {
  'face': shapeJson(f.face),
  'tilt': f.tilt,
  'nudge': _pt(f.nudge),
  'scale': f.scale,
  'flush': f.flush,
  'flash': f.flash,
  'spin': f.spin,
  'fx': [
    for (final x in f.fx)
      {
        'kind': x.kind.name,
        'at': _pt(x.at),
        'scale': x.scale,
        'rotation': x.rotation,
        'alpha': x.alpha,
        'onHead': x.onHead,
        'inFront': x.inFront,
        'phase': x.phase,
        'extent': _pt(x.extent),
      },
  ],
};

// ---------------------------------------------------------------------------
// fixtures/shapes.json and fixtures/ops.json
// ---------------------------------------------------------------------------

List<double> _ringingSampleTs(RingingStyle s) => [
  ...ringingTs,
  if (!ringingTs.contains(s.stillT)) s.stillT,
];

/// The ringing styles blended into each other in the fixtures.
const List<(RingingStyle, RingingStyle)> ringingBlendPairs = [
  (RingingStyle.classic, RingingStyle.rage),
  (RingingStyle.dizzy, RingingStyle.zapped),
];

Map<String, Object?> _styleJson(FaceStyle s) => {
  'fill': _color(s.fillColor),
  'stroke': _color(s.strokeColor),
  'ink': _color(s.inkColor),
  'tongue': _color(s.tongueColor),
  'lookDx': s.lookDx,
  'spiralRotation': s.spiralRotation,
};

Map<String, Object?> _ringingColorsJson(RingingColors c) => {
  'fill': _color(c.fillColor),
  'stroke': _color(c.strokeColor),
  'ink': _color(c.inkColor),
  'accent': _color(c.accentColor),
};

List<Object?> _opsJson(List<FaceOp> ops) => [for (final o in ops) o.toJson()];

Map<String, Object?> _shapes() => {
  'schemaVersion': schemaVersion,
  'blends': [
    for (final (a, b) in blendPairs)
      for (final t in blendTs)
        {
          'from': a.name,
          'to': b.name,
          't': t,
          'shape': shapeJson(FaceShape.lerp(faceFor(a), faceFor(b), t)),
        },
  ],
  'blinking': {
    for (final s in const [FaceState.watching, FaceState.shocked])
      s.name: shapeJson(faceFor(s).blinking),
  },
  'ringing': [
    for (final s in RingingStyle.values)
      for (final t in _ringingSampleTs(s))
        {'style': s.name, 't': t, 'frame': frameJson(ringingFrameFor(s, t))},
  ],
  'ringingBlends': [
    for (final (a, b) in ringingBlendPairs)
      {
        'from': a.name,
        'to': b.name,
        'fromT': 0.3,
        'toT': 0.6,
        't': 0.5,
        'frame': frameJson(
          RingingFrame.lerp(
            ringingFrameFor(a, 0.3),
            ringingFrameFor(b, 0.6),
            0.5,
          ),
        ),
      },
  ],
};

Map<String, Object?> _ops() {
  Map<String, Object?> face(
    String name,
    FaceShape shape,
    FaceStyle style,
  ) => {
    'name': name,
    'style': _styleJson(style),
    'ops': _opsJson(buildFaceOps(shape, style)),
  };

  FaceStyle styleFor(
    CritPalette p,
    FaceState state, {
    double lookDx = 0,
    double spin = 0,
  }) => FaceStyle.fromPalette(
    p,
    strokeColor: p.strokeFor(state),
    lookDx: lookDx,
    spiralRotation: spin,
  );

  const light = CritPalette.light;
  const dark = CritPalette.dark;
  final ringingColors = RingingColors.fromPalette(light);

  return {
    'schemaVersion': schemaVersion,
    'faces': [
      for (final (theme, p) in const [('light', light), ('dark', dark)])
        for (final s in FaceState.values)
          face('$theme/${s.name}', faceFor(s), styleFor(p, s)),
      face(
        'light/watching-look',
        watchingFace,
        styleFor(light, FaceState.watching, lookDx: -18),
      ),
      face(
        'light/dizzy-spin',
        dizzyFace,
        styleFor(light, FaceState.dizzy, spin: 1.3),
      ),
      face(
        'light/laughing-blue-tongue',
        laughingFace,
        FaceStyle.fromPalette(light, tongueColor: const Color(0xFF4EAAD8)),
      ),
    ],
    'blends': [
      for (final (a, b) in blendPairs)
        for (final t in blendTs)
          face(
            'light/${a.name}-${b.name}@$t',
            FaceShape.lerp(faceFor(a), faceFor(b), t),
            styleFor(light, FaceState.calm),
          ),
    ],
    'ringing': [
      for (final s in RingingStyle.values)
        for (final t in _ringingSampleTs(s))
          {
            'name': 'light/${s.name}@$t',
            'style': s.name,
            't': t,
            'colors': _ringingColorsJson(ringingColors),
            'ops': _opsJson(
              buildRingingOps(ringingFrameFor(s, t), ringingColors),
            ),
          },
      for (final (a, b) in ringingBlendPairs)
        {
          'name': 'light/${a.name}@0.3-${b.name}@0.6@0.5',
          'colors': _ringingColorsJson(ringingColors),
          'ops': _opsJson(
            buildRingingOps(
              RingingFrame.lerp(
                ringingFrameFor(a, 0.3),
                ringingFrameFor(b, 0.6),
                0.5,
              ),
              ringingColors,
            ),
          ),
        },
    ],
  };
}

// ---------------------------------------------------------------------------
// fixtures/idle.json
// ---------------------------------------------------------------------------

/// One idle run, played through in no time: every phase change with the
/// virtual time it happened at.
Future<List<Map<String, Object?>>> _idleRun({
  required int seed,
  required int hour,
  required bool wakeOnce,
}) async {
  var clock = Duration.zero;
  final events = <Map<String, Object?>>[];
  final controller = IdleFaceController(
    random: SeededRandom(seed),
    delay: (d) {
      clock += d;
      return Future<void>.value();
    },
    now: () => DateTime(2026, 1, 1, hour),
  );
  controller.addListener(() {
    events.add({
      'atMs': clock.inMilliseconds,
      'phase': controller.phase.name,
      'beat': controller.beat.name,
      'blendMs': controller.blend.inMilliseconds,
    });
  });
  await controller.start();
  if (wakeOnce) {
    events.add({'atMs': clock.inMilliseconds, 'tap': 'wake'});
    await controller.wake();
  }
  controller.dispose();
  return events;
}

Future<Map<String, Object?>> _idle() async => {
  'schemaVersion': schemaVersion,
  'runs': [
    for (final (seed, hour, wake) in const [
      (1, 12, true),
      (42, 12, false),
      (2026, 23, true),
    ])
      {
        'seed': seed,
        'hour': hour,
        'night':
            hour < IdleFaceController.dayStarts ||
            hour >= IdleFaceController.dayEnds,
        'wakesOnce': wake,
        'events': await _idleRun(seed: seed, hour: hour, wakeOnce: wake),
      },
  ],
};

// ---------------------------------------------------------------------------
// Writing.
// ---------------------------------------------------------------------------

/// Rounds every fractional number to 6 places, so the files do not change
/// with the last bit of a sine on another machine.
Object? _round(Object? v) => switch (v) {
  final double d when d == d.roundToDouble() && d.abs() < 1e15 => d.toInt(),
  final double d => double.parse(d.toStringAsFixed(6)),
  final Map<String, Object?> m => {
    for (final e in m.entries) e.key: _round(e.value),
  },
  final List<Object?> l => [for (final x in l) _round(x)],
  _ => v,
};

/// JSON with short arrays and objects kept on one line, so the files stay
/// readable and their diffs stay small.
String _pretty(Object? value) {
  final out = StringBuffer();
  void write(Object? v, String indent) {
    final flat = jsonEncode(v);
    if (flat.length + indent.length <= 120 || (v is! Map && v is! List)) {
      out.write(flat);
      return;
    }
    final inner = '$indent  ';
    if (v is Map<String, Object?>) {
      out.write('{\n');
      var first = true;
      for (final e in v.entries) {
        if (!first) out.write(',\n');
        first = false;
        out.write('$inner${jsonEncode(e.key)}: ');
        write(e.value, inner);
      }
      out.write('\n$indent}');
    } else if (v is List<Object?>) {
      out.write('[\n');
      for (var i = 0; i < v.length; i++) {
        if (i > 0) out.write(',\n');
        out.write(inner);
        write(v[i], inner);
      }
      out.write('\n$indent]');
    }
  }

  write(value, '');
  out.write('\n');
  return out.toString();
}
