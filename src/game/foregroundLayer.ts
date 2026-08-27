/**
 * Pinselbreite (Pixel) für das Ausschneiden des befahrenen Pfads aus dem
 * Foreground. Eine Konstante, damit sich der Effekt an einer Stelle justieren
 * lässt.
 */
export const CARVE_WIDTH = 16;

/**
 * Der Foreground wird nicht direkt in den Haupt-Canvas gezeichnet, sondern auf
 * diesen Offscreen-Canvas in Feld-Grösse. Er hält den aktuellen Zustand des
 * Foregrounds: initial das komplette Bild, dann Stück für Stück entlang des
 * gefahrenen Pfads mit `globalCompositeOperation = 'destination-out'`
 * ausgeschnitten (transparent), sodass der darunterliegende Background
 * durchscheint.
 *
 * ÜBERGANGSLÖSUNG: Dieses pfadbasierte Ausschneiden mit fester Breite ist eine
 * Zwischenstufe. Instruktion 5 ersetzt es durch exaktes, polygon-basiertes
 * Ausschneiden des tatsächlich eingeschlossenen Bereichs.
 */
export interface ForegroundLayer {
  /** Offscreen-Canvas mit dem aktuellen (teils ausgeschnittenen) Foreground. */
  readonly canvas: HTMLCanvasElement;
  /** Schneidet die Strecke `from → to` (Feld-Koordinaten) dauerhaft aus. */
  carvePath: (fromX: number, fromY: number, toX: number, toY: number) => void;
  /** Stellt den vollständigen Foreground wieder her. */
  reset: () => void;
}

export function createForegroundLayer(
  image: HTMLImageElement,
  width: number,
  height: number,
): ForegroundLayer {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) {
    throw new Error('Offscreen-2D-Context konnte nicht erstellt werden.');
  }
  const ctx: CanvasRenderingContext2D = maybeCtx;

  function reset(): void {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  }

  function carvePath(fromX: number, fromY: number, toX: number, toY: number): void {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = CARVE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  reset();
  return { canvas, carvePath, reset };
}
