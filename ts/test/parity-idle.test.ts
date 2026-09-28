// The idle controller, played through on a virtual clock, reports the same
// phase changes at the same times as the Dart one (spec/fixtures/idle.json).

import { describe, expect, it } from "vitest";
import {
  IdleFaceController,
  idleTimeline,
  SeededRandom,
  type TimedIdleEvent,
} from "../src/index.js";
import { firstDifference, readSpec } from "./helpers.js";

type Entry = TimedIdleEvent | { atMs: number; tap: "wake" };

const fixture = readSpec<{
  runs: { seed: number; hour: number; night: boolean; wakesOnce: boolean; events: Entry[] }[];
}>("fixtures/idle.json");

async function run(seed: number, hour: number, wakeOnce: boolean): Promise<Entry[]> {
  let clock = 0;
  const events: Entry[] = [];
  const controller = new IdleFaceController({
    random: new SeededRandom(seed),
    delay: (ms) => {
      clock += ms;
      return Promise.resolve();
    },
    now: () => new Date(2026, 0, 1, hour),
  });
  controller.onChange((e) => events.push({ atMs: clock, ...e }));
  await controller.start();
  if (wakeOnce) {
    events.push({ atMs: clock, tap: "wake" });
    await controller.wake();
  }
  controller.dispose();
  return events;
}

describe("idle.json", () => {
  it.each(fixture.runs.map((r) => [`seed ${r.seed}, hour ${r.hour}`, r] as const))(
    "controller: %s",
    async (_, r) => {
      const events = await run(r.seed, r.hour, r.wakesOnce);
      expect(firstDifference(events, r.events)).toBeNull();
    },
  );

  it.each(fixture.runs.map((r) => [`seed ${r.seed}, hour ${r.hour}`, r] as const))(
    "timeline: %s",
    (_, r) => {
      const tap = r.events.findIndex((e) => "tap" in e);
      const before = (tap < 0 ? r.events : r.events.slice(0, tap)) as TimedIdleEvent[];
      const timeline = idleTimeline({
        seed: r.seed,
        night: r.night,
        durationMs: 1e9,
        ...(r.wakesOnce ? { wakeAfterMs: 0 } : {}),
      });
      expect(firstDifference(timeline.slice(0, before.length), before)).toBeNull();
      if (tap >= 0) {
        const after = r.events.slice(tap + 1) as TimedIdleEvent[];
        const rest = timeline.slice(before.length, before.length + after.length);
        expect(firstDifference(rest, after)).toBeNull();
      }
    },
  );
});
