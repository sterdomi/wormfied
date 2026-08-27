import { pointOnPerimeter, type Point } from './field';

/**
 * Der Spieler bewegt sich (in diesem Schritt) ausschliesslich auf dem
 * Feldrand. Sein Zustand wird deshalb nicht primär über x/y gehalten, sondern
 * über "auf welchem Rand-Segment" (`segmentIndex`) und "wie weit auf diesem
 * Segment" (`segmentProgress`, 0..1). Daraus lässt sich die Weltposition
 * jederzeit eindeutig ableiten – das macht die Rand-Bewegung inkl.
 * Ecken-Übergängen deutlich einfacher als das Zurückrechnen aus rohen
 * Koordinaten, und es überlebt ein Resize des Spielfelds.
 */
export class Player {
  /** Index des Polygon-Segments, auf dem der Spieler steht. */
  segmentIndex: number;
  /** Fortschritt auf dem aktuellen Segment: 0 = Startecke, 1 = Endecke. */
  segmentProgress: number;
  /** Abgeleitete Weltposition; stets konsistent zu Segment + Fortschritt. */
  position: Point;

  constructor(segmentIndex = 0, segmentProgress = 0) {
    this.segmentIndex = segmentIndex;
    this.segmentProgress = segmentProgress;
    this.position = { x: 0, y: 0 };
  }

  /**
   * Rechnet die Weltposition aus (`segmentIndex`, `segmentProgress`) gegen das
   * übergebene Polygon neu – z.B. nach einem Resize, wenn sich die Feldgrösse
   * geändert hat, der Spieler aber "an derselben Stelle des Rands" bleiben soll.
   */
  syncPosition(polygon: Point[]): void {
    this.position = pointOnPerimeter(polygon, this.segmentIndex, this.segmentProgress);
  }
}
