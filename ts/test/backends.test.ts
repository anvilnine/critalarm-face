// The SVG and canvas replays: structure checks on every face and ringing
// style, arc handling, and a real render through resvg to check pixels land
// where they should.

import { Resvg } from "@resvg/resvg-js";
import { describe, expect, it } from "vitest";
import {
  drawToCanvas,
  faceStates,
  palettes,
  renderFaceSvg,
  renderRingingSvg,
  ringingOps,
  ringingStyles,
  svgPathData,
  toHex,
  toSvg,
  faceOps,
  type Canvas2DLike,
  type FaceOp,
} from "../src/index.js";

function balanced(svg: string): boolean {
  const open = (svg.match(/<g[ >]/g) ?? []).length;
  const close = (svg.match(/<\/g>/g) ?? []).length;
  return open === close;
}

function png(svg: string) {
  return new Resvg(svg, { background: "#ffffff" }).render();
}

function pixel(image: { width: number; pixels: Buffer }, x: number, y: number): string {
  const i = (Math.round(y) * image.width + Math.round(x)) * 4;
  const hex = (v: number) => (v ?? 0).toString(16).padStart(2, "0");
  return `#${hex(image.pixels[i] as number)}${hex(image.pixels[i + 1] as number)}${hex(image.pixels[i + 2] as number)}`;
}

describe("svgPathData", () => {
  it("starts a path with an arc when nothing came before", () => {
    const d = svgPathData([["A", 0, 0, 10, 0, Math.PI / 2]]);
    expect(d).toBe("M10 0A10 10 0 0 1 0 10");
  });

  it("joins an arc to the current point with a line, as canvas arc() does", () => {
    const d = svgPathData([
      ["M", 0, 0],
      ["A", 0, 0, 10, Math.PI, -Math.PI / 2],
    ]);
    expect(d).toBe("M0 0L-10 0A10 10 0 0 0 0 10");
  });

  it("splits a full turn so it is never ambiguous", () => {
    const d = svgPathData([["A", 0, 0, 5, 0, 2 * Math.PI]]);
    expect(d.match(/A/g)).toHaveLength(4);
    expect(d.startsWith("M5 0")).toBe(true);
    expect(d.endsWith("5 0")).toBe(true);
  });

  it("returns to the start of the piece after Z", () => {
    const d = svgPathData([
      ["M", 1, 1],
      ["L", 5, 1],
      ["Z"],
      ["A", 1, 1, 2, 0, 1],
    ]);
    expect(d).toContain("ZL3 1A");
  });
});

describe("toSvg", () => {
  it.each(faceStates)("%s is well formed", (state) => {
    const svg = renderFaceSvg(state, { size: 100, idPrefix: "t" });
    expect(svg.startsWith("<svg ")).toBe(true);
    expect(balanced(svg)).toBe(true);
    expect(svg).not.toContain("NaN");
  });

  it.each(ringingStyles)("ringing %s is well formed", (style) => {
    for (const t of [0, 0.25, 0.5, 0.75]) {
      const svg = renderRingingSvg(style, t, { idPrefix: "t" });
      expect(balanced(svg)).toBe(true);
      expect(svg).not.toContain("NaN");
    }
  });

  it("gives every document its own clip ids", () => {
    const a = renderFaceSvg("watching");
    const b = renderFaceSvg("watching");
    expect(a).not.toBe(b);
    expect(renderFaceSvg("watching", { idPrefix: "x" })).toBe(
      renderFaceSvg("watching", { idPrefix: "x" }),
    );
  });

  it("draws the head, the eyes and a white eye where they belong", () => {
    const calm = png(renderFaceSvg("calm", { size: 200 }));
    expect(pixel(calm, 100, 60)).toBe(toHex(palettes.light.fill));
    expect(pixel(calm, 72, 92)).toBe(toHex(palettes.light.ink));
    expect(pixel(calm, 3, 3)).toBe("#ffffff");

    const watching = png(renderFaceSvg("watching", { size: 200 }));
    // Inside the white of the left eye, away from the pupil.
    expect(pixel(watching, 74, 81)).toBe("#ffffff");
    expect(pixel(watching, 74, 94)).toBe(toHex(palettes.light.ink));
  });

  it("paints the dark palette", () => {
    const image = png(renderFaceSvg("calm", { size: 200, palette: "dark" }));
    expect(pixel(image, 100, 60)).toBe(toHex(palettes.dark.fill));
  });

  it("renders every ringing style's still point", () => {
    for (const style of ringingStyles) {
      const image = png(renderRingingSvg(style));
      expect(image.width).toBe(280);
    }
  });

  it("wraps ops without a closing restore", () => {
    const ops: FaceOp[] = [{ op: "save" }, { op: "translate", dx: 1, dy: 1 }];
    expect(balanced(toSvg(ops))).toBe(true);
  });
});

describe("drawToCanvas", () => {
  function recorder() {
    const calls: [string, ...unknown[]][] = [];
    const ctx = new Proxy(
      { fillStyle: "", strokeStyle: "", lineWidth: 1, lineCap: "butt", lineJoin: "miter" },
      {
        get(target, key) {
          if (key in target) return target[key as keyof typeof target];
          return (...args: unknown[]) => calls.push([String(key), ...args]);
        },
        set(target, key, value) {
          (target as Record<string, unknown>)[key as string] = value;
          calls.push([`set ${String(key)}`, value]);
          return true;
        },
      },
    ) as unknown as Canvas2DLike;
    return { ctx, calls };
  }

  it("leaves the context as it found it, for every face and style", () => {
    const lists = [
      ...faceStates.map((s) => faceOps(s)),
      ...ringingStyles.map((s) => ringingOps(s, 0.3)),
    ];
    for (const ops of lists) {
      const { ctx, calls } = recorder();
      drawToCanvas(ctx, ops);
      const saves = calls.filter((c) => c[0] === "save").length;
      const restores = calls.filter((c) => c[0] === "restore").length;
      expect(saves).toBe(restores);
    }
  });

  it("draws arcs with canvas arc(), anticlockwise for a negative sweep", () => {
    const { ctx, calls } = recorder();
    drawToCanvas(ctx, [
      {
        op: "stroke",
        shape: { type: "path", commands: [["A", 1, 2, 3, 0.5, -1]] },
        color: [0, 0, 0, 1],
        width: 2,
        cap: "round",
        join: "round",
      },
    ]);
    expect(calls).toContainEqual(["arc", 1, 2, 3, 0.5, -0.5, true]);
    expect(calls).toContainEqual(["set lineCap", "round"]);
    expect(calls).toContainEqual(["set strokeStyle", "rgba(0,0,0,1)"]);
  });

  it("clips to an ellipse", () => {
    const { ctx, calls } = recorder();
    drawToCanvas(ctx, [{ op: "save" }, { op: "clipOval", cx: 5, cy: 6, rx: 7, ry: 8 }, { op: "restore" }]);
    expect(calls).toContainEqual(["ellipse", 5, 6, 7, 8, 0, 0, 2 * Math.PI]);
    expect(calls.some((c) => c[0] === "clip")).toBe(true);
  });
});
