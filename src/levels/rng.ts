/**
 * Kleine deterministische Zahlen-Helfer für levelspezifische Deko-Module
 * (Level 2: `bubbles.ts`/`water.ts`; Level 3: `electric.ts`/`decoration.ts`;
 * Level 1: `rain.ts`). Ursprünglich level2-lokal, ab Instruktion 22 (Level-1-
 * Regen) hierher verschoben, da inzwischen drei Level denselben Helfer
 * brauchten. Ein gesäter PRNG erzeugt die festen Parameter (Blasen, Godrays,
 * Regentropfen, …) EINMAL beim Modul-Load – reproduzierbar, u.a. für Tests.
 */

/** mulberry32 – winziger, schneller PRNG. Gleicher Seed → gleiche Folge. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lineare Interpolation `a → b` für `t ∈ [0, 1]`. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Beschneidet `v` auf `[0, 1]`. */
export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
