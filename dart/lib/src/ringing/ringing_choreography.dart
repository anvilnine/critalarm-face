import 'package:critalarm_face/src/ringing/choreography/annoyed.dart';
import 'package:critalarm_face/src/ringing/choreography/bell_head.dart';
import 'package:critalarm_face/src/ringing/choreography/bouncing.dart';
import 'package:critalarm_face/src/ringing/choreography/classic.dart';
import 'package:critalarm_face/src/ringing/choreography/confused.dart';
import 'package:critalarm_face/src/ringing/choreography/dizzy.dart';
import 'package:critalarm_face/src/ringing/choreography/eyes_pop.dart';
import 'package:critalarm_face/src/ringing/choreography/hyperventilating.dart';
import 'package:critalarm_face/src/ringing/choreography/meltdown.dart';
import 'package:critalarm_face/src/ringing/choreography/panic.dart';
import 'package:critalarm_face/src/ringing/choreography/rage.dart';
import 'package:critalarm_face/src/ringing/choreography/scream.dart';
import 'package:critalarm_face/src/ringing/choreography/siren.dart';
import 'package:critalarm_face/src/ringing/choreography/sobbing.dart';
import 'package:critalarm_face/src/ringing/choreography/spin_out.dart';
import 'package:critalarm_face/src/ringing/choreography/startled.dart';
import 'package:critalarm_face/src/ringing/choreography/terrified.dart';
import 'package:critalarm_face/src/ringing/choreography/timing.dart';
import 'package:critalarm_face/src/ringing/choreography/zapped.dart';
import 'package:critalarm_face/src/ringing/ringing_frame.dart';
import 'package:critalarm_face/src/ringing/ringing_style.dart';

/// Where each ringing face is at moment [t] of its loop.
///
/// [t] runs 0 to 1 over one [RingingStylePresentation.period] and wraps, so
/// every style is written to land back where it started: anything periodic
/// turns a whole number of times per loop, and anything that happens once
/// (a jump, a melt) is back at rest by the end.
///
/// This is pure: the same [style] and [t] always give the same frame, which
/// is what lets the tests walk every loop.
RingingFrame ringingFrameFor(RingingStyle style, double t) {
  final at = frac(t);
  return switch (style) {
    RingingStyle.classic => classic(at),
    RingingStyle.panic => panic(at),
    RingingStyle.rage => rage(at),
    RingingStyle.confused => confused(at),
    RingingStyle.dizzy => dizzy(at),
    RingingStyle.sobbing => sobbing(at),
    RingingStyle.scream => scream(at),
    RingingStyle.bellHead => bellHead(at),
    RingingStyle.eyesPop => eyesPop(at),
    RingingStyle.annoyed => annoyed(at),
    RingingStyle.startled => startled(at),
    RingingStyle.hyperventilating => hyperventilating(at),
    RingingStyle.zapped => zapped(at),
    RingingStyle.bouncing => bouncing(at),
    RingingStyle.terrified => terrified(at),
    RingingStyle.siren => siren(at),
    RingingStyle.meltdown => meltdown(at),
    RingingStyle.spinOut => spinOut(at),
  };
}
