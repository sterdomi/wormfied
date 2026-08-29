/**
 * Pinselbreite (Pixel) für das Ausschneiden des befahrenen Pfads aus dem
 * Foreground. Eine Konstante, damit sich der Effekt an einer Stelle justieren
 * lässt.
 *
 * Nutzer-Feedback (Vergleich mit dem Volfied-Original): das darunterliegende
 * Bild soll nur genau bis zur gezeichneten Linie freigelegt werden, nicht
 * darüber hinaus – bei 16px war der ausgeschnittene Streifen deutlich breiter
 * als die (jetzt 2px starke) sichtbare Linie inkl. 6px-Glow (main.ts/
 * visualEffectsConfig.ts), das Bild schien dadurch seitlich über die Linie
 * hinauszuragen, während noch aktiv gezeichnet wird. Jetzt an die
 * Glow-Breite angeglichen, damit der freigelegte Streifen optisch nicht über
 * das sichtbare Linien-Band hinausragt.
 */
export const CARVE_WIDTH = 6;

/**
 * Der Foreground wird nicht direkt in den Haupt-Canvas gezeichnet, sondern auf
 * diesen Offscreen-Canvas in Feld-Grösse. Er hält den aktuellen Zustand des
 * Foregrounds: initial das komplette Bild, dann Stück für Stück entlang des
 * gefahrenen Pfads mit `globalCompositeOperation = 'destination-out'`
 * ausgeschnitten (transparent), sodass der darunterliegende Background
 * durchscheint.
 *
 * `carvePath` (aus Instruktion 4) bleibt als sofortige Live-Vorschau während
 * des Zeichnens. `carveRegion` (Instruktion 5) entfernt zusätzlich die GESAMTE
 * Innenfläche des eroberten Teilpolygons, sobald die Linie abgeschlossen ist.
 */
export interface ForegroundLayer {
  /** Offscreen-Canvas mit dem aktuellen (teils ausgeschnittenen) Foreground. */
  readonly canvas: HTMLCanvasElement;
  /** Schneidet die Strecke `from → to` (Feld-Koordinaten) dauerhaft aus. */
  carvePath: (fromX: number, fromY: number, toX: number, toY: number) => void;
  /** Schneidet die gesamte Innenfläche eines Polygons (Feld-Koordinaten) aus. */
  carveRegion: (polygon: { x: number; y: number }[]) => void;
  /** Sichert den aktuellen Pixel-Zustand (für Rückgängig bei Kollision). */
  snapshot: () => ImageData;
  /** Schreibt einen zuvor gesicherten Pixel-Zustand zurück. */
  restore: (snapshot: ImageData) => void;
  /** Stellt den vollständigen (ungeschnittenen) Foreground wieder her. */
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

  function carveRegion(polygon: { x: number; y: number }[]): void {
    if (polygon.length < 3) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) ctx.lineTo(polygon[i].x, polygon[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  function snapshot(): ImageData {
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  function restore(data: ImageData): void {
    ctx.globalCompositeOperation = 'source-over';
    ctx.putImageData(data, 0, 0);
  }

  reset();
  return { canvas, carvePath, carveRegion, snapshot, restore, reset };
}
