/** Begrenzt `value` auf das geschlossene Intervall [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Lineare Interpolation zwischen `a` und `b` (t = 0 → a, t = 1 → b). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
