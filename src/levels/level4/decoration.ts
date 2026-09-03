import type { LevelDecorationRenderer } from '../types';
import { BLOCKED_BOTTOM_FRACTION } from './drumming';

/** Strichstärke der Sperr-Linie. */
const LINE_WIDTH = 6;
/** Einrückung, damit der Strich innerhalb des Feldes gezeichnet wird. */
const INSET = LINE_WIDTH / 2;

/**
 * Deko-Ebene von Level 4: eine kräftige **schwarze Linie** als U-Form – **ganz
 * unten** über die volle Breite und an **beiden Seiten senkrecht bis 20 %
 * Höhe** hoch. Sie umrandet den gesperrten unteren Bereich, in dem der Gorilla
 * trommelt (`createStartField` in `index.ts` schneidet ihn aus dem Feld-
 * Polygon; hier wird die Grenze sichtbar gemacht).
 */
export const renderLevel4Decoration: LevelDecorationRenderer = (ctx, state): void => {
  const { width, height } = state;
  const top = height * (1 - BLOCKED_BOTTOM_FRACTION); // Oberkante der Seitenstriche
  const bottom = height - INSET;
  const left = INSET;
  const right = width - INSET;

  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.lineTo(right, top);
  ctx.stroke();
  ctx.restore();
};
