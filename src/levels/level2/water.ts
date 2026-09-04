import type { LevelDecorationRenderer, LevelDecorationState } from '../types';
import { renderLevel2Bubbles } from './bubbles';
import { lerp, mulberry32 } from '../rng';

/**
 * Unterwasser-Look von Level 2 – der komplette dekorative Überzug
 * (`LevelConfig.renderDecoration`), zwischen Foreground und Spiel-Ebene:
 *
 *  1. **Tiefen-Grading**: ein vertikaler Blau-Verlauf (unten dunkler/tiefer)
 *     plus ein zarter Sonnenlicht-Schimmer knapp unter der Oberfläche. Statisch.
 *  2. **Godrays**: wenige, sehr weiche, leicht geneigte Lichtschächte von oben,
 *     die langsam driften und „atmen" – additiv (`lighter`), sehr niedrige
 *     Deckkraft. Zustandslos aus `now` (wie der Rest der Level-2-Deko).
 *  3. **Luftblasen**: `renderLevel2Bubbles` (eigene Datei) – zuletzt, damit sie
 *     über Grading und Godrays liegen.
 */

interface Godray {
  /** Horizontale Grundposition (Oberkante) als Bruchteil der Feldbreite. */
  xFraction: number;
  /** Breite des Schachts in Pixel. */
  width: number;
  /** Neigung: horizontaler Versatz Ober- → Unterkante, als Bruchteil der Höhe. */
  slantFraction: number;
  /** Seitliche Drift-Amplitude in Pixel. */
  driftAmplitude: number;
  /** Drift-Frequenz (Radiant/Sekunde) – bewusst sehr niedrig. */
  driftFrequency: number;
  /** „Atem"-Frequenz der Deckkraft (Radiant/Sekunde). */
  breatheFrequency: number;
  /** Phasenversatz für Drift und Atem. */
  phase: number;
  /** Grund-Deckkraft (0..1) am oberen Ende. */
  baseAlpha: number;
}

const GODRAYS: readonly Godray[] = (() => {
  const rand = mulberry32(0x60d5a45);
  return Array.from({ length: 5 }, () => ({
    xFraction: lerp(0.05, 0.95, rand()),
    width: lerp(45, 130, rand()),
    slantFraction: lerp(-0.18, -0.04, rand()),
    driftAmplitude: lerp(8, 24, rand()),
    driftFrequency: lerp(0.05, 0.13, rand()),
    breatheFrequency: lerp(0.14, 0.34, rand()),
    phase: rand() * Math.PI * 2,
    baseAlpha: lerp(0.035, 0.08, rand()),
  }));
})();

/** Vertikales Tiefen-Grading + Sonnenlicht-Schimmer oben. Statisch. */
function renderWaterGrade(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();

  // Tiefe: nach unten dunkler und blauer.
  const depth = ctx.createLinearGradient(0, 0, 0, height);
  depth.addColorStop(0, 'rgba(20, 80, 120, 0.05)');
  depth.addColorStop(0.55, 'rgba(12, 55, 95, 0.13)');
  depth.addColorStop(1, 'rgba(6, 28, 60, 0.27)');
  ctx.fillStyle = depth;
  ctx.fillRect(0, 0, width, height);

  // Helle Zone knapp unter der Wasseroberfläche (additiv, sehr dezent).
  const surface = ctx.createLinearGradient(0, 0, 0, height * 0.34);
  surface.addColorStop(0, 'rgba(185, 232, 255, 0.11)');
  surface.addColorStop(1, 'rgba(185, 232, 255, 0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = surface;
  ctx.fillRect(0, 0, width, height * 0.34);

  ctx.restore();
}

/** Langsam driftende, „atmende" Lichtschächte von oben (additiv). */
function renderGodrays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
): void {
  const t = now / 1000;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const r of GODRAYS) {
    const drift = Math.sin(t * r.driftFrequency + r.phase) * r.driftAmplitude;
    const breathe = 0.6 + 0.4 * Math.sin(t * r.breatheFrequency + r.phase * 1.7);
    const alpha = r.baseAlpha * breathe;
    if (alpha <= 0.002) continue;

    const topX = r.xFraction * width + drift;
    const botX = topX + r.slantFraction * height;

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, `rgba(195, 236, 255, ${alpha})`);
    grad.addColorStop(0.7, `rgba(150, 214, 255, ${alpha * 0.32})`);
    grad.addColorStop(1, 'rgba(150, 214, 255, 0)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(topX - r.width / 2, 0);
    ctx.lineTo(topX + r.width / 2, 0);
    ctx.lineTo(botX + r.width / 2, height);
    ctx.lineTo(botX - r.width / 2, height);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/** Kompletter Unterwasser-Überzug: Grading → Godrays → Luftblasen. */
export const renderLevel2Water: LevelDecorationRenderer = (
  ctx: CanvasRenderingContext2D,
  state: LevelDecorationState,
): void => {
  renderWaterGrade(ctx, state.width, state.height);
  renderGodrays(ctx, state.width, state.height, state.now);
  renderLevel2Bubbles(ctx, state);
};
