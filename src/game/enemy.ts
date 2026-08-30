import type { Point } from './field';

/** Bewegungsrichtung als 2D-Vektor. */
export type Vec = { x: number; y: number };

/**
 * Ein Gegner im Feld – deckt sowohl den Hauptgegner als auch die Mini-Gegner
 * ab. Bewusst EIN generischer Typ (kein `isMainEnemy`-Flag): der Unterschied
 * "Haupt- vs. Mini-Gegner" ist strukturell (getrennte Zustands-Slots
 * `mainEnemy` / `miniEnemies[]`), nicht pro Objekt. Nur der Hauptgegner
 * bestimmt beim Polygon-Split die eroberte Seite – das entscheidet der
 * Aufrufer, indem er dessen Position übergibt, nicht der Gegner selbst.
 *
 * Die Sprite-Referenz liegt NICHT auf dem Objekt (hält `Enemy` frei von
 * DOM/Asset-Abhängigkeiten und leicht testbar) – der Renderer wählt das Sprite
 * pro Gegner-Gruppe.
 *
 * `Enemy` trägt bewusst NUR den bewegungsmuster-UNABHÄNGIGEN Zustand
 * (Position/Richtung/Grösse + Schuss-Timer). Der Zustand eines konkreten
 * Bewegungsmusters (Level 1: Pausen-Timer der erratischen Lauf-Bewegung,
 * siehe `RandomWalkState` in `enemyMovement.ts`; ein späteres Level: z.B.
 * Snake-Abbiegetakt) lebt neben `Enemy` beim `updateEnemies`-Behavior des
 * jeweiligen Levels – so wächst diese geteilte Struktur nicht mit jedem
 * neuen Bewegungstyp.
 */
export interface Enemy {
  position: Point;
  /** Einheitsvektor der aktuellen Bewegungsrichtung. */
  direction: Vec;
  /** Bewegungsgeschwindigkeit in Pixel/Sekunde (aus der Level-Konfiguration). */
  speed: number;
  /** Rendergrösse (Durchmesser) in Pixel. */
  size: number;
  /** Sekunden seit dem letzten Schuss (nur relevant für schiessende Gegner). */
  timeSinceLastShot: number;
}

export interface EnemySpec {
  speed: number;
  size: number;
}

export function createEnemy(
  position: Point,
  spec: EnemySpec,
  direction: Vec = { x: 1, y: 0 },
): Enemy {
  return {
    position: { x: position.x, y: position.y },
    direction: { x: direction.x, y: direction.y },
    speed: spec.speed,
    size: spec.size,
    timeSinceLastShot: 0,
  };
}

/**
 * Canvas-Drehwinkel (Radiant), damit das Gegner-Sprite in Bewegungsrichtung
 * "schaut". Die SVGs sind so gezeichnet, dass der Kopf nach OBEN zeigt
 * (lokale Vorne-Richtung (0, -1)); `ctx.rotate(enemyFacingAngle(dir))` dreht
 * ihn auf `dir`.
 */
export function enemyFacingAngle(direction: Vec): number {
  return Math.atan2(direction.x, -direction.y);
}
