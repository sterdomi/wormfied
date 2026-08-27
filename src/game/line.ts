import type { Point } from './field';

/**
 * Eine vom Spieler gezeichnete Linie: der Startpunkt liegt auf dem Feldrand
 * (dort begann das Zeichnen), danach folgen die Zwischenpunkte der Bewegung
 * bis zum erneuten Rand-Kontakt.
 *
 * Punktesammlung: DISTANZBASIERT (siehe `appendPoint`). Ein Punkt pro Frame
 * würde die Liste bei hoher Framerate unnötig aufblähen und wäre
 * framerate-abhängig; ein fester Mindestabstand hält die Auflösung konstant
 * und die Liste kompakt – ausreichend für die spätere Flächenberechnung.
 */
export interface DrawnLine {
  points: Point[];
}

/** Mindestabstand zwischen zwei aufgezeichneten Linienpunkten (Pixel). */
export const POINT_MIN_DISTANCE = 4;

export function createLine(start: Point): DrawnLine {
  return { points: [{ x: start.x, y: start.y }] };
}

/**
 * Hängt `p` an die Linie an, wenn es mindestens `minDistance` vom zuletzt
 * aufgezeichneten Punkt entfernt ist. Mit `minDistance = 0` wird der Punkt
 * immer angehängt (z.B. für den exakten Endpunkt auf dem Rand).
 */
export function appendPoint(line: DrawnLine, p: Point, minDistance = POINT_MIN_DISTANCE): void {
  const last = line.points[line.points.length - 1];
  if (Math.hypot(p.x - last.x, p.y - last.y) >= minDistance) {
    line.points.push({ x: p.x, y: p.y });
  }
}

/** Gesamtlänge der Linie entlang ihrer aufgezeichneten Punkte. */
export function lineLength(line: DrawnLine): number {
  let total = 0;
  for (let i = 1; i < line.points.length; i++) {
    const a = line.points[i - 1];
    const b = line.points[i];
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}
