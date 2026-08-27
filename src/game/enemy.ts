import type { Point } from './field';

/** Bewegungsrichtung als 2D-Vektor. */
export type Vec = { x: number; y: number };

/**
 * Der Gegner – der wurm-/drachenartige Bewohner des Spielfelds. Bewegt sich
 * frei innerhalb der aktuellen (nicht-eroberten) Fläche.
 *
 * PLATZHALTER: nur Position + Richtungsvektor. Das eigentliche Wurm-/Drachen-
 * Design und ausgefeilteres Verhalten folgen in späteren Instruktionen.
 */
export interface Enemy {
  position: Point;
  /** Einheitsvektor der aktuellen Bewegungsrichtung. */
  direction: Vec;
}

export function createEnemy(position: Point, direction: Vec = { x: 1, y: 0 }): Enemy {
  return {
    position: { x: position.x, y: position.y },
    direction: { x: direction.x, y: direction.y },
  };
}
