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
  /**
   * Sekunden seit der letzten (bzw. bei frischem Gegner: seit dem Spawn)
   * Pause – zählt hoch, bis `nextPauseIntervalSeconds` erreicht ist
   * (Nutzer-Feedback: Gegner sollen ab und zu kurz innehalten, siehe
   * `enemyMovement.ts`).
   */
  timeSinceLastPause: number;
  /** > 0, solange der Gegner gerade pausiert (zählt pro Frame runter). */
  pauseRemainingSeconds: number;
  /** Zufällig neu gewürfeltes Intervall (Sekunden) bis zur nächsten Pause –
   *  erneuert nach jeder Pause, damit Gegner nicht alle im exakt gleichen
   *  Takt anhalten. */
  nextPauseIntervalSeconds: number;
}

export interface EnemySpec {
  speed: number;
  size: number;
}

/**
 * Durchschnittliches Intervall (Sekunden) zwischen zwei Pausen eines Gegners
 * – `enemyMovement.ts` würfelt pro Zyklus per Zufall etwas darum herum
 * (siehe dort), damit nicht alle Gegner exakt im selben Takt anhalten.
 * Hier definiert (nicht in `enemyMovement.ts`), da `createEnemy` den Wert
 * fürs allererste Intervall braucht.
 */
export const ENEMY_PAUSE_INTERVAL_SECONDS = 10;

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
    timeSinceLastPause: 0,
    pauseRemainingSeconds: 0,
    // Erstes Intervall bewusst ohne Zufalls-Jitter (kein `rng` in
    // `createEnemy` nötig) – der Jitter kommt ab der zweiten Pause dazu,
    // siehe `enemyMovement.ts`.
    nextPauseIntervalSeconds: ENEMY_PAUSE_INTERVAL_SECONDS,
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
