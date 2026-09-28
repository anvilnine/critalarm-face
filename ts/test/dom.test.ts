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

function fakeElement(tag: string) {
  const el = {
    tag,
    style: { cssText: "" },
    width: 0,
    height: 0,
    children: [] as unknown[],
    setAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    appendChild(child: unknown) {
      el.children.push(child);
    },
    remove() {
      removed++;
    },
    getContext: () => fakeContext(),
  };
  return el;
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
  clock = 1000;
  vi.stubGlobal("document", { createElement: fakeElement });
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

describe("mountFace", () => {
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
