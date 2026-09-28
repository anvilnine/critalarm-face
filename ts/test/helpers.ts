import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const specDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "spec");

/** Reads a file from `spec/` as JSON. */
export function readSpec<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(join(specDir, path), "utf8")) as T;
}

/** The absolute tolerance SPEC.md sets for comparing against fixtures. */
export const TOLERANCE = 1e-5;

/**
 * Walks `actual` and `expected` together and returns the first place they
 * differ, or null when they match. Numbers match within {@link TOLERANCE};
 * everything else must be equal. Arrays must have the same length and
 * objects the same keys.
 */
export function firstDifference(actual: unknown, expected: unknown, path = "$"): string | null {
  if (typeof expected === "number") {
    if (typeof actual !== "number") return `${path}: expected ${expected}, got ${String(actual)}`;
    if (!(Math.abs(actual - expected) <= TOLERANCE)) {
      return `${path}: expected ${expected}, got ${actual} (off by ${Math.abs(actual - expected)})`;
    }
    return null;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return `${path}: expected an array, got ${JSON.stringify(actual)}`;
    if (actual.length !== expected.length) {
      return `${path}: expected ${expected.length} items, got ${actual.length}`;
    }
    for (let i = 0; i < expected.length; i++) {
      const d = firstDifference(actual[i], expected[i], `${path}[${i}]`);
      if (d !== null) return d;
    }
    return null;
  }
  if (expected !== null && typeof expected === "object") {
    if (actual === null || typeof actual !== "object" || Array.isArray(actual)) {
      return `${path}: expected an object, got ${JSON.stringify(actual)}`;
    }
    const a = actual as Record<string, unknown>;
    const e = expected as Record<string, unknown>;
    const keys = new Set([...Object.keys(a), ...Object.keys(e)]);
    for (const k of keys) {
      if (!(k in e)) return `${path}.${k}: not in the fixture`;
      if (!(k in a)) return `${path}.${k}: missing`;
      const d = firstDifference(a[k], e[k], `${path}.${k}`);
      if (d !== null) return d;
    }
    return null;
  }
  return actual === expected ? null : `${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
}
