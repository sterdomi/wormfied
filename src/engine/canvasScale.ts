export interface CanvasScaleResult {
  /** Gemeinsamer Skalierungsfaktor für Breite und Höhe (keine Verzerrung). */
  scale: number;
  /** Horizontaler Versatz in Viewport-Pixeln, um den skalierten Inhalt zu zentrieren. */
  offsetX: number;
  /** Vertikaler Versatz in Viewport-Pixeln, um den skalierten Inhalt zu zentrieren. */
  offsetY: number;
}

/**
 * Berechnet, wie ein Inhalt fester "logischer" Grösse (`logicalWidth` ×
 * `logicalHeight`, z.B. Spielfeld + Logo + Ränder) unverzerrt in einen
 * verfügbaren Viewport eingepasst wird (Instruktion 20, Punkt 1) – der
 * kleinere der beiden Achsenfaktoren gewinnt, die andere Achse lässt dadurch
 * Letterboxing-Raum (`offsetX`/`offsetY` > 0) übrig statt zu überlaufen.
 *
 * Bewusst OHNE oberen Deckel bei `scale <= 1`: anders als die vorherige,
 * rein lokale Berechnung in `main.ts` (die auf grossen Desktop-Bildschirmen
 * bei Originalgrösse blieb) nutzt diese Version auch grosse Viewports
 * vollständig aus, wie von dieser Instruktion gefordert ("volle
 * Bildschirmfläche nutzen").
 */
export function calculateCanvasScale(
  viewportWidth: number,
  viewportHeight: number,
  logicalWidth: number,
  logicalHeight: number,
): CanvasScaleResult {
  const scale = Math.min(viewportWidth / logicalWidth, viewportHeight / logicalHeight);
  const offsetX = (viewportWidth - logicalWidth * scale) / 2;
  const offsetY = (viewportHeight - logicalHeight * scale) / 2;
  return { scale, offsetX, offsetY };
}
