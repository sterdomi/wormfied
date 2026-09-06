import type { LevelDecorationRenderer } from '../types';

/** Strichstärke der Sperr-Linie. */
const LINE_WIDTH = 6;
/** Einrückung, damit der Strich innerhalb des Feldes gezeichnet wird. */
const INSET = LINE_WIDTH / 2;

/**
 * Deko-Ebene von Level 4: eine kräftige **schwarze Linie an der Feld-
 * Unterkante** über die volle Breite. Dahinter sitzt der trommelnde Gorilla;
 * von dieser Kante aus darf der Spieler nicht ins Feld reinfahren
 * (`blocksDrawingAt` in `index.ts`). Die früheren seitlichen Striche (untere
 * 20 % der linken/rechten Ränder) sind entfallen – die Seiten sind wieder
 * frei (Nutzer-Feedback).
 */
export const renderLevel4Decoration: LevelDecorationRenderer = (ctx, state): void => {
  const { width, height } = state;
  const y = height - INSET;

  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(INSET, y);
  ctx.lineTo(width - INSET, y);
  ctx.stroke();
  ctx.restore();
};
