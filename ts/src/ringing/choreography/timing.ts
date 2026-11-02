/**
 * Timing helpers for the ringing styles. Everything is a plain function of
 * `t`.
 *
 * @module
 */

import { clamp, TAU } from "../../math.js";

export function wave(t: number, cycles: number, phase = 0): number {
  return Math.sin(TAU * (t * cycles + phase));
}

export function pulse(t: number, cycles: number, phase = 0): number {
  return 0.5 + 0.5 * wave(t, cycles, phase);
}

export function seg(t: number, a: number, b: number): number {
  return clamp((t - a) / (b - a), 0, 1);
}

export function elastic(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return Math.pow(2, -10 * x) * Math.sin(((x - 0.075) * TAU) / 0.3) + 1;
}

export function bump(x: number): number {
  return Math.sin(Math.PI * clamp(x, 0, 1));
}

export function snap(v: number, k = 4): number {
  const e = Math.exp(2 * k * v);
  return (e - 1) / (e + 1);
}

export function deg(d: number): number {
  return (d * Math.PI) / 180;
}
