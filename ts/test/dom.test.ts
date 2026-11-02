// The mount functions, run against a small fake DOM: elements that only
// hold children, a 2D context that writes down every call, and an
// animation frame queue the test runs by hand.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountFace, mountIdleFace, mountRingingFace } from "../src/index.js";

type Call = [string, ...unknown[]];

let calls: Call[] = [];
let frames = new Map<number, (now: number) => void>();
let nextFrame = 1;
let clock = 0;
let removed = 0;
let elements: FakeElement[] = [];
let media: FakeMedia;

type Listener = () => void;

interface FakeElement {
  tag: string;
  style: { cssText: string };
  width: number;
  height: number;
  children: FakeElement[];
  attributes: Record<string, string>;
  listeners: Map<string, Set<Listener>>;
  setAttribute(name: string, value: string): void;
  addEventListener(type: string, f: Listener): void;
  removeEventListener(type: string, f: Listener): void;
  appendChild(child: FakeElement): void;
  remove(): void;
  getContext(): unknown;
}

/** A stand-in for the `prefers-reduced-motion` media query list. */
class FakeMedia {
  matches = false;
  listeners = new Set<Listener>();
  addEventListener(_type: string, f: Listener) {
    this.listeners.add(f);
  }
  removeEventListener(_type: string, f: Listener) {
    this.listeners.delete(f);
  }
  /** Flips the preference and tells every listener, as a browser would. */
  set(matches: boolean) {
    this.matches = matches;
    for (const f of [...this.listeners]) f();
  }
}

function fakeContext(): unknown {
  return new Proxy(
    {},
    {
      get: (_, name) => (...args: unknown[]) => {
        calls.push([String(name), ...args]);
      },
      set: () => true,
    },
  );
}

function fakeElement(tag: string): FakeElement {
  const el: FakeElement = {
    tag,
    style: { cssText: "" },
    width: 0,
    height: 0,
    children: [],
    attributes: {},
    listeners: new Map(),
    setAttribute(name: string, value: string) {
      el.attributes[name] = value;
    },
    addEventListener(type: string, f: Listener) {
      const set = el.listeners.get(type) ?? new Set<Listener>();
      set.add(f);
      el.listeners.set(type, set);
    },
    removeEventListener(type: string, f: Listener) {
      el.listeners.get(type)?.delete(f);
    },
    appendChild(child: FakeElement) {
      el.children.push(child);
    },
    remove() {
      removed++;
    },
    getContext: () => fakeContext(),
  };
  elements.push(el);
  return el;
}

/** How many listeners of any type are still attached to `el`. */
function listenerCount(el: FakeElement): number {
  let n = 0;
  for (const set of el.listeners.values()) n += set.size;
  return n;
}

/** Runs every waiting animation frame at the current clock. */
function runFrames() {
  const waiting = [...frames.values()];
  frames = new Map();
  for (const f of waiting) f(clock);
}

beforeEach(() => {
  calls = [];
  frames = new Map();
  removed = 0;
  elements = [];
  media = new FakeMedia();
  clock = 1000;
  vi.stubGlobal("document", { createElement: fakeElement });
  vi.stubGlobal("matchMedia", () => media);
  vi.stubGlobal("requestAnimationFrame", (f: (now: number) => void) => {
    frames.set(nextFrame, f);
    return nextFrame++;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.spyOn(performance, "now").mockImplementation(() => clock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const host = () => fakeElement("div") as unknown as HTMLElement;
const fake = (el: HTMLElement) => el as unknown as FakeElement;
const drawn = () => JSON.stringify(calls);

describe("mountFace", () => {
  it("stops asking for frames once a blend ends on a still face", () => {
    const face = mountFace(host(), { state: "calm", live: false, morphMs: 100 });
    face.setState("shocked");
    expect(frames.size).toBe(1);
    clock += 50;
    runFrames();
    expect(frames.size).toBe(1);
    clock += 50;
    runFrames();
    expect(frames.size).toBe(0);
    calls = [];
    runFrames();
    expect(calls).toEqual([]);
    face.destroy();
  });

  it("keeps exactly one frame waiting after a blend on a live face", () => {
    const face = mountFace(host(), { state: "calm", morphMs: 100 });
    face.setState("alarmed");
    for (let i = 0; i < 5; i++) {
      clock += 50;
      runFrames();
      expect(frames.size).toBe(1);
    }
    face.destroy();
    expect(frames.size).toBe(0);
  });

  it.each([0, -100, Number.NaN])("a morphMs of %s switches at once without hanging", (morphMs) => {
    const face = mountFace(host(), { state: "calm", live: false, morphMs });
    calls = [];
    face.setState("shocked");
    // The switch is drawn by setState itself, finished and finite.
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      for (const arg of call.slice(1)) {
        if (typeof arg === "number") expect(Number.isFinite(arg)).toBe(true);
      }
    }
    expect(frames.size).toBe(0);
    face.destroy();
  });

  it("mounts a labelled canvas inside the host and starts animating", () => {
    const el = host();
    const face = mountFace(el, { state: "calm", size: 100 });
    const [wrap] = fake(el).children;
    expect(fake(el).children).toHaveLength(1);
    expect(wrap?.attributes).toMatchObject({ role: "img", "aria-label": "Crit" });
    const canvas = wrap?.children[0];
    expect(canvas?.tag).toBe("canvas");
    // 100 px of face plus 15 px of room on each side, at a pixel ratio of 1.
    expect(canvas?.width).toBe(130);
    expect(canvas?.height).toBe(130);
    expect(calls.length).toBeGreaterThan(0);
    expect(frames.size).toBe(1);
    expect(face.state).toBe("calm");
    face.destroy();
  });

  it("draws once and asks for no frames when live is false", () => {
    const face = mountFace(host(), { state: "alarmed", live: false });
    expect(calls.length).toBeGreaterThan(0);
    expect(frames.size).toBe(0);
    face.destroy();
  });

  it("holds still with reduced motion, and moves again when it is switched off", () => {
    media.matches = true;
    const face = mountFace(host(), { state: "alarmed" });
    expect(calls.length).toBeGreaterThan(0);
    expect(frames.size).toBe(0);
    media.set(false);
    expect(frames.size).toBe(1);
    media.set(true);
    expect(frames.size).toBe(0);
    face.destroy();
  });

  it("draws a different face after setState", () => {
    const face = mountFace(host(), { state: "calm", live: false, morphMs: 100 });
    const before = drawn();
    calls = [];
    face.setState("shocked");
    expect(face.state).toBe("shocked");
    expect(frames.size).toBe(1);
    clock += 100;
    runFrames();
    expect(drawn()).not.toBe(before);
    face.destroy();
  });

  it("ignores setState to the state already showing", () => {
    const face = mountFace(host(), { state: "calm", live: false });
    calls = [];
    face.setState("calm");
    expect(calls).toEqual([]);
    expect(frames.size).toBe(0);
    face.destroy();
  });

  it("releases its frame, media listener and canvas when destroyed", () => {
    const face = mountFace(host(), { state: "watching" });
    expect(media.listeners.size).toBe(1);
    expect(frames.size).toBe(1);
    const staleChange = [...media.listeners][0] as Listener;
    face.destroy();
    expect(media.listeners.size).toBe(0);
    expect(frames.size).toBe(0);
    expect(removed).toBe(1);
    // A change event already on its way draws nothing.
    calls = [];
    staleChange();
    expect(calls).toEqual([]);
    expect(frames.size).toBe(0);
  });

  it("does nothing after destroy, and destroy is safe twice", () => {
    const face = mountFace(host(), { state: "calm" });
    face.destroy();
    face.destroy();
    expect(removed).toBe(1);
    expect(frames.size).toBe(0);
    calls = [];
    face.setState("alarmed");
    runFrames();
    expect(calls).toEqual([]);
    expect(frames.size).toBe(0);
    expect(face.state).toBe("calm");
  });

  // The last blended frame and the first live frame after it must draw the
  // same thing, or the face jumps when the blend ends.
  it.each(["alarmed", "shocked", "confused", "laughing"] as const)(
    "starts %s's motion without a jump after a blend",
    (state) => {
      const face = mountFace(host(), { state: "calm", morphMs: 100 });
      face.setState(state);
      clock += 100;
      calls = [];
      runFrames();
      const lastBlend = calls;
      calls = [];
      runFrames();
      const firstLive = calls;
      face.destroy();

      expect(firstLive.map((c) => c[0])).toEqual(lastBlend.map((c) => c[0]));
      firstLive.forEach((call, i) => {
        call.forEach((arg, j) => {
          const other = lastBlend[i]?.[j];
          if (typeof arg === "number") expect(Math.abs(arg - (other as number))).toBeLessThan(1e-3);
          else expect(arg).toEqual(other);
        });
      });
    },
  );
});

describe("mountRingingFace", () => {
  it("mounts a labelled canvas the size of the stage and starts animating", () => {
    const el = host();
    const face = mountRingingFace(el, { style: "classic", size: 200 });
    const wrap = fake(el).children[0];
    expect(wrap?.attributes).toMatchObject({ role: "img", "aria-label": "Crit, ringing" });
    expect(wrap?.children[0]?.width).toBe(200);
    expect(calls.length).toBeGreaterThan(0);
    expect(frames.size).toBe(1);
    face.destroy();
  });

  it("draws different ops over time and after setStyle", () => {
    const face = mountRingingFace(host(), { style: "classic" });
    const first = drawn();
    calls = [];
    clock += 300;
    runFrames();
    const later = drawn();
    expect(later).not.toBe(first);
    calls = [];
    face.setStyle("shuffle");
    expect(calls.length).toBeGreaterThan(0);
    expect(frames.size).toBe(1);
    face.destroy();
  });

  it("holds the still point with live false or reduced motion", () => {
    const still = mountRingingFace(host(), { style: "classic", live: false });
    expect(frames.size).toBe(0);
    still.destroy();
    media.matches = true;
    const reduced = mountRingingFace(host(), { style: "classic" });
    expect(frames.size).toBe(0);
    media.set(false);
    expect(frames.size).toBe(1);
    reduced.destroy();
  });

  it("releases its frame and media listener when destroyed", () => {
    const face = mountRingingFace(host(), { style: "shuffle", seed: 3 });
    expect(media.listeners.size).toBe(1);
    expect(frames.size).toBe(1);
    face.destroy();
    expect(media.listeners.size).toBe(0);
    expect(frames.size).toBe(0);
    expect(removed).toBe(1);
  });

  it("does nothing after destroy, and destroy is safe twice", () => {
    const face = mountRingingFace(host(), { style: "classic" });
    face.destroy();
    face.destroy();
    expect(removed).toBe(1);
    calls = [];
    face.setStyle("shuffle");
    runFrames();
    expect(calls).toEqual([]);
    expect(frames.size).toBe(0);
  });
});

describe("mountIdleFace", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("mounts a labelled canvas, listens for clicks and starts animating", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const el = host();
    const face = mountIdleFace(el, { seed: 1, size: 100 });
    const wrap = fake(el).children[0];
    expect(wrap?.attributes).toMatchObject({ role: "img", "aria-label": "Crit, idle" });
    expect(wrap?.children[0]?.width).toBe(130);
    expect(wrap && listenerCount(wrap)).toBe(1);
    expect(calls.length).toBeGreaterThan(0);
    expect(frames.size).toBe(1);
    face.destroy();
  });

  it("plays a beat on its own as the controller's timers run", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const face = mountIdleFace(host(), { seed: 1 });
    const seen = new Set<string>([drawn()]);
    for (let i = 0; i < 40; i++) {
      await vi.advanceTimersByTimeAsync(500);
      clock += 500;
      calls = [];
      runFrames();
      seen.add(drawn());
    }
    expect(seen.size).toBeGreaterThan(1);
    face.destroy();
  });

  it("stays calm with reduced motion and starts again when it is switched off", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    media.matches = true;
    const face = mountIdleFace(host(), { seed: 1 });
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    media.set(false);
    expect(frames.size).toBe(1);
    face.destroy();
  });

  it("releases its listeners, frame and timers when destroyed", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const el = host();
    const face = mountIdleFace(el, { seed: 1 });
    await vi.advanceTimersByTimeAsync(1);
    const wrap = fake(el).children[0] as FakeElement;
    expect(listenerCount(wrap)).toBe(1);
    expect(media.listeners.size).toBe(1);
    expect(frames.size).toBe(1);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    const staleChange = [...media.listeners][0] as Listener;
    const click = [...(wrap.listeners.get("click") ?? [])][0] as Listener;

    face.destroy();
    expect(listenerCount(wrap)).toBe(0);
    expect(media.listeners.size).toBe(0);
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(removed).toBe(1);

    // Late events do nothing: no drawing, no new frame, no new timer.
    calls = [];
    staleChange();
    click();
    await vi.advanceTimersByTimeAsync(120_000);
    runFrames();
    expect(calls).toEqual([]);
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does nothing after destroy, and destroy is safe twice", () => {
    const face = mountIdleFace(host(), { seed: 1 });
    face.destroy();
    face.destroy();
    expect(removed).toBe(1);
    calls = [];
    face.wake();
    runFrames();
    expect(calls).toEqual([]);
    expect(frames.size).toBe(0);
  });
});
