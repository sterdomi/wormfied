import type { LevelDecorationRenderer } from '../types';
import { renderUnderwaterDecoration } from '../underwater/water';
import { mulberry32 } from '../rng';
import { electricFieldFlash } from './electric';

/**
 * Deko-Überzug von Level 3: der gemeinsame Unterwasser-Look
 * (`renderUnderwaterDecoration`, `src/levels/underwater/`) und darüber –
 * während und kurz nach einem Blitz der Strom-Attacke (`electric.ts`) – ein
 * feldweiter Blitz-Effekt: heller Blau-Weiss-Schleier + ein paar gezackte
 * Entladungen von oben nach unten. Zustandslos: die Helligkeit kommt aus
 * `electricFieldFlash(now)`.
 */

function renderFieldFlash(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
  k: number,
): void {
  ctx.save();

  // Flächiger Schleier.
  ctx.fillStyle = `rgba(190, 235, 255, ${0.26 * k})`;
  ctx.fillRect(0, 0, width, height);

  // Gezackte Entladungen – Form pro ~90-ms-Fenster fest (gesätem PRNG), damit
  // sie flackern statt pro Frame komplett neu zu springen.
  const rand = mulberry32((Math.floor(now / 90) * 2654435761) >>> 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(235, 250, 255, ${0.85 * k})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(150, 220, 255, 0.9)';
  ctx.shadowBlur = 10;

  const bolts = 4;
  const steps = 9;
  for (let b = 0; b < bolts; b++) {
    let x = rand() * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let i = 1; i <= steps; i++) {
      x += (rand() - 0.5) * width * 0.16;
      ctx.lineTo(x, (height * i) / steps);
    }
    ctx.stroke();
  }

  ctx.restore();
}

export const renderLevel3Decoration: LevelDecorationRenderer = (ctx, state): void => {
  renderUnderwaterDecoration(ctx, state);
  const k = electricFieldFlash(state.now);
  if (k > 0.002) renderFieldFlash(ctx, state.width, state.height, state.now, k);
};
