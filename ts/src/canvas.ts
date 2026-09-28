/**
 * Replays draw ops onto a 2D canvas: an HTML canvas, an `OffscreenCanvas`,
 * or anything with the same methods.
 *
 * @module
 */

import { toCss } from "./math.js";
import type { FaceOp, OpShape, PathCommand } from "./types.js";

/**
 * The parts of `CanvasRenderingContext2D` the replay uses. Both the DOM
 * canvas and `OffscreenCanvasRenderingContext2D` fit, as do most Node
 * canvas libraries.
 */
export interface Canvas2DLike {
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void;
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void;
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void;
  clip(): void;
  fill(): void;
  stroke(): void;
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
}

function tracePath(ctx: Canvas2DLike, commands: readonly PathCommand[]): void {
  for (const c of commands) {
    switch (c[0]) {
      case "M":
        ctx.moveTo(c[1], c[2]);
        break;
      case "L":
        ctx.lineTo(c[1], c[2]);
        break;
      case "Q":
        ctx.quadraticCurveTo(c[1], c[2], c[3], c[4]);
        break;
      case "C":
        ctx.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
        break;
      case "A": {
        const [, cx, cy, r, start, sweep] = c;
        ctx.arc(cx, cy, r, start, start + sweep, sweep < 0);
        break;
      }
      case "Z":
        ctx.closePath();
        break;
    }
  }
}

function traceShape(ctx: Canvas2DLike, shape: OpShape): void {
  ctx.beginPath();
  switch (shape.type) {
    case "oval":
      ctx.ellipse(shape.cx, shape.cy, Math.max(0, shape.rx), Math.max(0, shape.ry), 0, 0, 2 * Math.PI);
      break;
    case "rrect": {
      const { x, y, width: w, height: h } = shape;
      const r = Math.max(0, Math.min(shape.radius, w / 2, h / 2));
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
      ctx.lineTo(x + w, y + h - r);
      ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
      ctx.lineTo(x + r, y + h);
      ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
      ctx.lineTo(x, y + r);
      ctx.arc(x + r, y + r, r, Math.PI, (3 * Math.PI) / 2);
      ctx.closePath();
      break;
    }
    case "path":
      tracePath(ctx, shape.commands);
      break;
  }
}

/**
 * Draws `ops` onto `ctx` in its current transform. Scale the context first
 * so the ops' units fit the space: `ctx.scale(size / 200, size / 200)` for a
 * face, or `size / 280` for a ringing stage.
 *
 * The context is left as it was found: every save the ops make is restored.
 */
export function drawToCanvas(ctx: Canvas2DLike, ops: readonly FaceOp[]): void {
  let depth = 0;
  ctx.save();
  for (const op of ops) {
    switch (op.op) {
      case "save":
        ctx.save();
        depth++;
        break;
      case "restore":
        if (depth > 0) {
          ctx.restore();
          depth--;
        }
        break;
      case "translate":
        ctx.translate(op.dx, op.dy);
        break;
      case "rotate":
        ctx.rotate(op.radians);
        break;
      case "scale":
        ctx.scale(op.sx, op.sy);
        break;
      case "clipOval":
        ctx.beginPath();
        ctx.ellipse(op.cx, op.cy, Math.max(0, op.rx), Math.max(0, op.ry), 0, 0, 2 * Math.PI);
        ctx.clip();
        break;
      case "fill":
        traceShape(ctx, op.shape);
        ctx.fillStyle = toCss(op.color);
        ctx.fill();
        break;
      case "stroke":
        traceShape(ctx, op.shape);
        ctx.strokeStyle = toCss(op.color);
        ctx.lineWidth = op.width;
        ctx.lineCap = op.cap;
        ctx.lineJoin = op.join;
        ctx.stroke();
        break;
    }
  }
  while (depth-- > 0) ctx.restore();
  ctx.restore();
}
