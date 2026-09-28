import 'package:critalarm_face/critalarm_face.dart';
import 'package:flutter/material.dart';

void main() => runApp(const CritFaceExample());

class CritFaceExample extends StatefulWidget {
  const CritFaceExample({super.key});

  @override
  State<CritFaceExample> createState() => _CritFaceExampleState();
}

class _CritFaceExampleState extends State<CritFaceExample> {
  ThemeMode _mode = ThemeMode.light;

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Crit faces',
    themeMode: _mode,
    theme: ThemeData(colorSchemeSeed: const Color(0xFFFFC93C)),
    darkTheme: ThemeData(
      colorSchemeSeed: const Color(0xFFFFC93C),
      brightness: Brightness.dark,
    ),
    home: HomePage(
      dark: _mode == ThemeMode.dark,
      onToggleTheme: () => setState(
        () =>
            _mode = _mode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark,
      ),
    ),
  );
}

class HomePage extends StatefulWidget {
  const HomePage({
    required this.dark,
    required this.onToggleTheme,
    super.key,
  });

  final bool dark;
  final VoidCallback onToggleTheme;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Crit faces'),
      actions: [
        IconButton(
          tooltip: widget.dark ? 'Light theme' : 'Dark theme',
          icon: Icon(widget.dark ? Icons.light_mode : Icons.dark_mode),
          onPressed: widget.onToggleTheme,
        ),
      ],
    ),
    body: switch (_tab) {
      0 => const GalleryPage(),
      1 => const BlendPage(),
      2 => const IdlePage(),
      _ => const RingingPage(),
    },
    bottomNavigationBar: NavigationBar(
      selectedIndex: _tab,
      onDestinationSelected: (i) => setState(() => _tab = i),
      destinations: const [
        NavigationDestination(icon: Icon(Icons.grid_view), label: 'Faces'),
        NavigationDestination(icon: Icon(Icons.tune), label: 'Blend'),
        NavigationDestination(icon: Icon(Icons.bedtime), label: 'Idle'),
        NavigationDestination(
          icon: Icon(Icons.notifications_active),
          label: 'Ringing',
        ),
      ],
    ),
  );
}

/// Every face. Tap one to play its live animation, if it has one.
class GalleryPage extends StatefulWidget {
  const GalleryPage({super.key});

  @override
  State<GalleryPage> createState() => _GalleryPageState();
}

class _GalleryPageState extends State<GalleryPage> {
  final Set<FaceState> _live = {};

  @override
  Widget build(BuildContext context) => GridView.extent(
    maxCrossAxisExtent: 140,
    padding: const EdgeInsets.all(16),
    mainAxisSpacing: 16,
    crossAxisSpacing: 16,
    childAspectRatio: 0.8,
    children: [
      for (final state in FaceState.values)
        InkWell(
          key: ValueKey(state),
          borderRadius: BorderRadius.circular(12),
          onTap: () => setState(
            () =>
                _live.contains(state) ? _live.remove(state) : _live.add(state),
          ),
          child: Column(
            children: [
              Expanded(
                child: Center(
                  child: FaceWidget(
                    state: state,
                    size: 96,
                    isLive: _live.contains(state),
                  ),
                ),
              ),
              Text(state.label, textAlign: TextAlign.center),
            ],
          ),
        ),
    ],
  );
}

/// Two faces and a slider between them.
class BlendPage extends StatefulWidget {
  const BlendPage({super.key});

  @override
  State<BlendPage> createState() => _BlendPageState();
}

class _BlendPageState extends State<BlendPage> {
  FaceState _from = FaceState.calm;
  FaceState _to = FaceState.shocked;
  double _t = 0.5;

  DropdownButton<FaceState> _picker(
    FaceState value,
    ValueChanged<FaceState> onChanged,
  ) => DropdownButton<FaceState>(
    value: value,
    onChanged: (v) => v == null ? null : onChanged(v),
    items: [
      for (final s in FaceState.values)
        DropdownMenuItem(value: s, child: Text(s.label)),
    ],
  );

  @override
  Widget build(BuildContext context) {
    final shape = FaceShape.lerp(faceFor(_from), faceFor(_to), _t);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Center(
          child: FaceWidget(state: FaceState.calm, shape: shape, size: 240),
        ),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _picker(_from, (v) => setState(() => _from = v)),
            Text('t = ${_t.toStringAsFixed(2)}'),
            _picker(_to, (v) => setState(() => _to = v)),
          ],
        ),
        Slider(value: _t, onChanged: (v) => setState(() => _t = v)),
      ],
    );
  }
}

/// The idle face, doing its thing. Tap it once it has nodded off.
class IdlePage extends StatelessWidget {
  const IdlePage({super.key});

  @override
  Widget build(BuildContext context) => const Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        IdleFace(size: 240),
        SizedBox(height: 24),
        Text('Blinks, looks around, and nods off after a while.'),
        Text('Tap it to wake it up.'),
      ],
    ),
  );
}

/// Every ringing style, looping.
class RingingPage extends StatelessWidget {
  const RingingPage({super.key});

  @override
  Widget build(BuildContext context) => GridView.extent(
    maxCrossAxisExtent: 200,
    padding: const EdgeInsets.all(16),
    mainAxisSpacing: 16,
    crossAxisSpacing: 16,
    childAspectRatio: 0.85,
    children: [
      const _Labeled(
        label: 'Shuffle',
        child: ShufflingRingingFace(),
      ),
      for (final style in RingingStyle.values)
        _Labeled(
          key: ValueKey(style),
          label: style.label,
          child: RingingFaceWidget(style: style),
        ),
    ],
  );
}

class _Labeled extends StatelessWidget {
  const _Labeled({required this.label, required this.child, super.key});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Expanded(child: FittedBox(child: child)),
      Text(label, textAlign: TextAlign.center),
    ],
  );
}
