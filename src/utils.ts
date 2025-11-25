import { Result, Ok, Err } from './types';
import { EPSILON, MAX_PIXEL_DIM } from './constants';

export function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

export function reduceRatio(w: number, h: number): { w: number; h: number } {
  if (w <= 0 || h <= 0) return { w: 0, h: 0 };
  const divisor = gcd(w, h) || 1;
  return { w: w / divisor, h: h / divisor };
}

export function validateAspectRatio(ratio: number): Result<boolean, string> {
  if (ratio < 0) return Err("Ratio must be positive");
  if (ratio > 100) return Err("Ratio exceeds maximum");
  return Ok(true);
}

export function validatePixelDimension(dim: number): Result<boolean, string> {
  if (dim <= 0) return Err("Dimension must be > 0");
  if (dim > MAX_PIXEL_DIM) return Err("Dimension exceeds limit");
  if (!Number.isInteger(dim)) return Err("Dimension must be integer");
  return Ok(true);
}

export function hasChanged(start: any, x: number, y: number, w: number, h: number): boolean {
  const threshold = 0.25;
  return (
    Math.abs(start.x - x) >= threshold ||
    Math.abs(start.y - y) >= threshold ||
    Math.abs(start.w - w) >= threshold ||
    Math.abs(start.h - h) >= threshold
  );
}