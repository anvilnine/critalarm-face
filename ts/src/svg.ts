/**
 * Replays draw ops as an SVG string. Pure string building, so it runs in
 * Node, workers and browsers alike, with no DOM.
 *
 * @module
 */

import { clamp, TAU, toHex } from "./math.js";
import type { Color, FaceOp, OpShape, PathCommand } from "./types.js";

/** Options for {@link toSvg}. */
export interface SvgOptions {
  /**
   * The size of the drawing in its own units: 200 for a face, 280 for a
   * ringing stage. Default 200.
   */
  readonly units?: number;
  /**
   * Extra room on every side, in the same units. Props such as the lines
   * over a win reach a little past the 200 unit box. Default 0.
   */
  readonly padding?: number;
  /** Width and height of the SVG in pixels. Default `units + 2 * padding`. */
  readonly size?: number;
  /** A CSS colour to fill the background with. Default none. */
  readonly background?: string;
  /** Text for screen readers. Default none, which marks the SVG decorative. */
  readonly title?: string;
  /**
   * Prefix for the clip path ids inside the SVG. Ids must be unique across
   * a whole HTML page, so by default each call gets a fresh one. Pass a
   * fixed prefix when you need the same output every time.
   */
  readonly idPrefix?: string;
}

/** Numbers to 3 places: a thousandth of a unit is far below a pixel. */
function n(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? "0" : String(r);
}

function paint(kind: "fill" | "stroke", c: Color): string {
  const a = clamp(c[3], 0, 1);
  const alpha = a < 1 ? ` ${kind}-opacity="${n(a)}"` : "";
  return `${kind}="${toHex(c)}"${alpha}`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** An SVG path `d` for path commands, following canvas `arc()` rules. */
export function svgPathData(commands: readonly PathCommand[]): string {
  const out: string[] = [];
  let current: [number, number] | null = null;
  let start: [number, number] | null = null;
  for (const c of commands) {
    switch (c[0]) {
      case "M":
        out.push(`M${n(c[1])} ${n(c[2])}`);
        current = [c[1], c[2]];
        start = current;
        break;
      case "L":
        out.push(`L${n(c[1])} ${n(c[2])}`);
        current = [c[1], c[2]];
        break;
      case "Q":
        out.push(`Q${n(c[1])} ${n(c[2])} ${n(c[3])} ${n(c[4])}`);
        current = [c[3], c[4]];
        break;
      case "C":
        out.push(`C${n(c[1])} ${n(c[2])} ${n(c[3])} ${n(c[4])} ${n(c[5])} ${n(c[6])}`);
        current = [c[5], c[6]];
        break;
      case "A": {
        const [, cx, cy, r, from, rawSweep] = c;
        const sweep = clamp(rawSweep, -TAU, TAU);
        const at = (angle: number): [number, number] => [
          cx + r * Math.cos(angle),
          cy + r * Math.sin(angle),
        ];
        const first = at(from);
        if (current === null) {
          out.push(`M${n(first[0])} ${n(first[1])}`);
          start = first;
        } else {
          out.push(`L${n(first[0])} ${n(first[1])}`);
        }
        // Quarter turns at most, so the large-arc flag is always 0 and no
        // piece is ever ambiguous.
        const pieces = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
        const flag = sweep > 0 ? 1 : 0;
        for (let i = 1; i <= pieces; i++) {
          const p = at(from + (sweep * i) / pieces);
          if (sweep !== 0) out.push(`A${n(r)} ${n(r)} 0 0 ${flag} ${n(p[0])} ${n(p[1])}`);
        }
        current = at(from + sweep);
        break;
      }
      case "Z":
        out.push("Z");
        current = start;
        break;
    }
  }
  return out.join("");
}

function shapeElement(shape: OpShape, attrs: string): string {
  switch (shape.type) {
    case "oval":
      return `<ellipse cx="${n(shape.cx)}" cy="${n(shape.cy)}" rx="${n(shape.rx)}" ry="${n(shape.ry)}" ${attrs}/>`;
    case "rrect":
      return `<rect x="${n(shape.x)}" y="${n(shape.y)}" width="${n(shape.width)}" height="${n(shape.height)}" rx="${n(shape.radius)}" ry="${n(shape.radius)}" ${attrs}/>`;
    case "path":
      return `<path d="${svgPathData(shape.commands)}" ${attrs}/>`;
  }
}

/**
 * Replays `ops` into the markup of an SVG group. Use {@link toSvg} for a
 * whole document; this is for placing several faces in one SVG.
 */
export function svgBody(ops: readonly FaceOp[], idPrefix = "crit"): { body: string; defs: string } {
  const body: string[] = [];
  const defs: string[] = [];
  // How many <g> are open since each save, innermost last.
  const opened: number[] = [0];
  let clipCount = 0;
  const openGroup = (attrs: string) => {
    body.push(`<g ${attrs}>`);
    opened[opened.length - 1] = (opened[opened.length - 1] ?? 0) + 1;
  };

  for (const op of ops) {
    switch (op.op) {
      case "save":
        opened.push(0);
        break;
      case "restore": {
        const count = opened.length > 1 ? (opened.pop() ?? 0) : 0;
        for (let i = 0; i < count; i++) body.push("</g>");
        break;
      }
      case "translate":
        openGroup(`transform="translate(${n(op.dx)} ${n(op.dy)})"`);
        break;
      case "rotate":
        openGroup(`transform="rotate(${n((op.radians * 180) / Math.PI)})"`);
        break;
      case "scale":
        openGroup(`transform="scale(${n(op.sx)} ${n(op.sy)})"`);
        break;
      case "clipOval": {
        const id = `${idPrefix}-clip-${clipCount++}`;
        defs.push(
          `<clipPath id="${id}"><ellipse cx="${n(op.cx)}" cy="${n(op.cy)}" rx="${n(op.rx)}" ry="${n(op.ry)}"/></clipPath>`,
        );
        openGroup(`clip-path="url(#${id})"`);
        break;
      }
      case "fill":
        body.push(shapeElement(op.shape, paint("fill", op.color)));
        break;
      case "stroke":
        body.push(
          shapeElement(
            op.shape,
            `fill="none" ${paint("stroke", op.color)} stroke-width="${n(op.width)}" stroke-linecap="round" stroke-linejoin="round"`,
          ),
        );
        break;
    }
  }
  // Close anything a list without matching restores left open.
  for (const count of opened) for (let i = 0; i < count; i++) body.push("</g>");
  return { body: body.join(""), defs: defs.join("") };
}

let documentCount = 0;

/**
 * Replays `ops` as a complete SVG document. Works anywhere, no DOM needed.
 *
 * @example
 * ```ts
 * const svg = toSvg(buildFaceOps(faceFor("calm"), faceStyle()), { size: 256 });
 * ```
 */
export function toSvg(ops: readonly FaceOp[], options: SvgOptions = {}): string {
  const units = options.units ?? 200;
  const pad = options.padding ?? 0;
  const span = units + 2 * pad;
  const size = options.size ?? span;
  const { body, defs } = svgBody(ops, options.idPrefix ?? `crit${documentCount++}`);
  const title =
    options.title === undefined
      ? ` aria-hidden="true"`
      : ` role="img" aria-label="${escapeXml(options.title)}"`;
  const background =
    options.background === undefined
      ? ""
      : `<rect x="${n(-pad)}" y="${n(-pad)}" width="${n(span)}" height="${n(span)}" fill="${escapeXml(options.background)}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(size)}" height="${n(size)}" ` +
    `viewBox="${n(-pad)} ${n(-pad)} ${n(span)} ${n(span)}"${title}>` +
    (options.title === undefined ? "" : `<title>${escapeXml(options.title)}</title>`) +
    (defs === "" ? "" : `<defs>${defs}</defs>`) +
    background +
    body +
    `</svg>`
  );
}
