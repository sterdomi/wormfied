import { pointOnPerimeter, type Point } from './field';

/**
 * - `onEdge`:  Spieler bewegt sich per Rand-Bewegungslogik (Instruktion 2)
 *              entlang des Feld-Polygons.
 * - `drawing`: Spieler ist vom Rand ins Feldinnere gefahren und zeichnet eine
 *              Linie (Instruktion 3). Die Rand-Bewegung ist dann inaktiv.
 */
export type PlayerMode = 'onEdge' | 'drawing';

/**
 * Der Spieler bewegt sich im `onEdge`-Modus ausschliesslich auf dem Feldrand.
 * Sein Zustand wird deshalb nicht primär über x/y gehalten, sondern über "auf
 * welchem Rand-Segment" (`segmentIndex`) und "wie weit auf diesem Segment"
 * (`segmentProgress`, 0..1). Daraus lässt sich die Weltposition jederzeit
 * eindeutig ableiten – das macht die Rand-Bewegung inkl. Ecken-Übergängen
 * deutlich einfacher als das Zurückrechnen aus rohen Koordinaten, und es
 * überlebt ein Resize des Spielfelds.
 *
 * Im `drawing`-Modus bleiben `segmentIndex` / `segmentProgress` auf dem
 * Einfahrtspunkt stehen (Startpunkt der Linie) und `position` wird frei im
 * Feld bewegt, bis die Linie wieder den Rand trifft.
 */
export class Player {
  /** Index des Polygon-Segments, auf dem der Spieler steht bzw. gestartet ist. */
  segmentIndex: number;
  /** Fortschritt auf dem aktuellen Segment: 0 = Startecke, 1 = Endecke. */
  segmentProgress: number;
  /** Abgeleitete Weltposition; im `onEdge`-Modus konsistent zu Segment + Fortschritt. */
  position: Point;
  /** Aktueller Bewegungsmodus. */
  mode: PlayerMode;
  /**
   * Zuletzt bekannte Blick-/Schussrichtung (nicht zwingend normiert), fürs
   * Sprite-Rendering (Instruktion 13) UND als Schussrichtung für den
   * Kanone-Bonus (Instruktion 14/15). Aktualisiert bei tatsächlicher
   * Bewegung (`movePlayerAlongEdge` / `advanceDrawing`) UND – ohne dabei zu
   * bewegen – bei reiner Richtungseingabe quer zur Kante, während der
   * Spieler geschützt auf dem Rand steht (Zielen ohne loszufahren, siehe
   * `movePlayerAlongEdge`). Ohne jede Eingabe bleibt die zuletzt bekannte
   * Richtung erhalten, statt auf 0 zurückzufallen.
   */
  facing: Point;
  /**
   * "Bereit, ins Feld vorzudringen" (Instruktion 15). Nur relevant, solange
   * `mode === 'onEdge'` – schaltet für sich genommen NICHTS an der Position,
   * gibt aber Richtungseingabe nach innen erst frei (siehe `tryEnterDrawing`).
   * Wird beim automatischen Andocken wieder auf `false` gesetzt (der Spieler
   * muss sich für den nächsten Ausflug erneut abdocken).
   */
  isUndocked: boolean;

  constructor(segmentIndex = 0, segmentProgress = 0) {
    this.segmentIndex = segmentIndex;
    this.segmentProgress = segmentProgress;
    this.position = { x: 0, y: 0 };
    this.mode = 'onEdge';
    this.facing = { x: 1, y: 0 };
    this.isUndocked = false;
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

/**
 * `player.svg` zeichnet den Marienkäfer standardmässig nach OBEN zeigend
 * (Blickrichtung "Norden"), während `Math.atan2(dy, dx)` bei 0 "nach rechts"
 * bedeutet. Der Rotationsaufruf muss den Bewegungswinkel deshalb um diesen
 * Wert ergänzen, damit "oben" im Artwork mit der Bewegungsrichtung
 * übereinstimmt (siehe `playerFacingAngle`).
 */
export const spriteBaseRotationOffset = Math.PI / 2;

/**
 * Canvas-Drehwinkel (Radiant) für den Spieler-Sprite aus einem
 * Bewegungsvektor (muss nicht normiert sein) – analog zu
 * `enemyFacingAngle` in `enemy.ts`.
 */
export function playerFacingAngle(facing: Point): number {
  return Math.atan2(facing.y, facing.x) + spriteBaseRotationOffset;
}
