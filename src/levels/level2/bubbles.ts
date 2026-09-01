import type { LevelDecorationState } from '../types';

/**
 * Aufsteigende Luftblasen für das Wasser-Level 2 – rein dekorativ, zwischen
 * Foreground und Spiel-Ebene gezeichnet (`LevelConfig.renderDecoration`).
 *
 * Die Blasen tragen KEINEN fortgeschriebenen Zustand: ihre Position ist eine
 * reine Funktion der Frame-Wanduhrzeit `now` (wie schon der Bonusstein-Puls
 * bzw. die Bein-Animation in `render()`), sodass kein `update()`-Takt, kein
 * Teardown und kein Neuaufbau bei Levelwechsel nötig sind. Die festen
 * Blasen-Parameter werden einmal beim Modul-Load mit einem gesäten PRNG
 * erzeugt – deterministisch, damit das Blasenbild reproduzierbar ist (u.a.
 * für Tests).
 */

/** Kleine, zahlreiche Blasen – der Grundschleier. */
const BUBBLE_COUNT = 34;
/** Wenige, deutlich grössere und langsamere „Brocken" dazwischen. */
const BIG_BUBBLE_COUNT = 6;
/** Randnahe Ein-/Ausblendung (Pixel), damit Blasen nicht hart erscheinen. */
const EDGE_FADE_PX = 70;

interface Bubble {
  /** Horizontale Grundposition als Bruchteil der Feldbreite (0..1). */
  baseXFraction: number;
  /** Radius in Pixel. */
  radius: number;
  /** Aufstiegsgeschwindigkeit in Pixel/Sekunde. */
  riseSpeed: number;
  /** Seitliche Schlängel-Amplitude in Pixel. */
  wobbleAmplitude: number;
  /** Schlängel-Frequenz in Radiant/Sekunde. */
  wobbleFrequency: number;
  /** Phasenversatz (0..1) – verteilt Start-Höhe und Schlängel über die Blasen. */
  phase: number;
  /** Grund-Deckkraft (0..1) in der Feldmitte. */
  baseAlpha: number;
}

/** Kleiner deterministischer PRNG (mulberry32) – nur für die Blasen-Parameter. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const BUBBLES: readonly Bubble[] = (() => {
  const rand = mulberry32(0xb0bb1e5);
  const small: Bubble[] = Array.from({ length: BUBBLE_COUNT }, () => ({
    baseXFraction: rand(),
    // Hoch 1.7 → mehr kleine als grosse Blasen.
    radius: lerp(1.6, 6.5, rand() ** 1.7),
    riseSpeed: lerp(14, 46, rand()),
    wobbleAmplitude: lerp(3, 13, rand()),
    wobbleFrequency: lerp(0.6, 1.8, rand()),
    phase: rand(),
    baseAlpha: lerp(0.12, 0.4, rand()),
  }));
  // Vereinzelte grosse Blasen: grösserer Radius, langsamerer Aufstieg, weiterer
  // und trägerer Schlängel, dafür geringere Deckkraft (dünnwandig-durchsichtig).
  const big: Bubble[] = Array.from({ length: BIG_BUBBLE_COUNT }, () => ({
    baseXFraction: rand(),
    radius: lerp(9, 17, rand()),
    riseSpeed: lerp(10, 24, rand()),
    wobbleAmplitude: lerp(8, 20, rand()),
    wobbleFrequency: lerp(0.35, 0.9, rand()),
    phase: rand(),
    baseAlpha: lerp(0.08, 0.22, rand()),
  }));
  return [...small, ...big];
})();

/**
 * Zeichnet alle Blasen für diesen Frame. Erfüllt `LevelDecorationRenderer`.
 * Jede Blase steigt geradlinig, schlängelt sich seitlich per Sinus und blendet
 * an Ober-/Unterkante weich ein bzw. aus; oben angekommen setzt sie unten
 * nahtlos wieder ein (Modulo über den Gesamtweg).
 */
export function renderLevel2Bubbles(
  ctx: CanvasRenderingContext2D,
  { width, height, now }: LevelDecorationState,
): void {
  const t = now / 1000;
  const travel = height + 2 * EDGE_FADE_PX;

  ctx.save();
  for (const b of BUBBLES) {
    const progress = (t * b.riseSpeed + b.phase * travel) % travel;
    const y = height + EDGE_FADE_PX - progress;
    const x =
      b.baseXFraction * width +
      Math.sin(t * b.wobbleFrequency + b.phase * Math.PI * 2) * b.wobbleAmplitude;

    const edgeFade = Math.max(
      0,
      Math.min(1, Math.min(progress, travel - progress) / EDGE_FADE_PX),
    );
    const alpha = b.baseAlpha * edgeFade;
    if (alpha <= 0.003) continue;

    // Schwach gefüllter Körper …
    ctx.beginPath();
    ctx.arc(x, y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    ctx.fill();

    // … mit hellerem Rand …
    ctx.lineWidth = Math.max(0.6, b.radius * 0.22);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.stroke();

    // … und einem kleinen Glanzpunkt oben links.
    ctx.beginPath();
    ctx.arc(
      x - b.radius * 0.32,
      y - b.radius * 0.32,
      Math.max(0.5, b.radius * 0.28),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha * 1.6)})`;
    ctx.fill();
  }
  ctx.restore();
}
