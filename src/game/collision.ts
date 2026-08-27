import type { Point } from './field';
import type { DrawnLine } from './line';
import { clamp } from '../utils/math';

/**
 * Toleranzradius für "Gegner berührt X". Gegner (Punkt), Linie und Spielfigur
 * sind konzeptionell dünn – ein kleiner Puffer sorgt für zuverlässige Erkennung.
 */
export const ENEMY_TOUCH_RADIUS = 8;

/** Kürzester Abstand von `p` zur Strecke a→b. */
function distanceToSegment(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  const t = lenSq === 0 ? 0 : clamp(((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq, 0, 1);
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}

/**
 * Berührt der Gegner (`enemyPos`) die aktuell gezeichnete Linie innerhalb von
 * `radius`?
 *
 * `head` (optional) hängt ein letztes Segment bis zu diesem Punkt an – so lässt
 * sich der "Kopf" der Linie mitprüfen (die aktuelle Spielerposition, die
 * zwischen zwei aufgezeichneten Punkten hängt).
 */
export function checkLineCollision(
  enemyPos: Point,
  line: DrawnLine,
  radius: number = ENEMY_TOUCH_RADIUS,
  head?: Point,
): boolean {
  const pts = head ? [...line.points, head] : line.points;

  if (pts.length === 1) {
    return Math.hypot(enemyPos.x - pts[0].x, enemyPos.y - pts[0].y) <= radius;
  }
  for (let i = 1; i < pts.length; i++) {
    if (distanceToSegment(enemyPos, pts[i - 1], pts[i]) <= radius) return true;
  }
  return false;
}

/**
 * Berührt der Gegner die Spielfigur DIREKT, während deren Schild aufgebraucht
 * ist? Nur dann ist der Spieler auf dem Rand verwundbar (der `onEdge`-Check
 * bleibt beim Aufrufer). `shield > 0` ⇒ immer `false`.
 */
export function checkUnshieldedPlayerCollision(
  enemyPos: Point,
  playerPos: Point,
  shield: number,
  radius: number = ENEMY_TOUCH_RADIUS,
): boolean {
  if (shield > 0) return false;
  return Math.hypot(enemyPos.x - playerPos.x, enemyPos.y - playerPos.y) <= radius;
}
