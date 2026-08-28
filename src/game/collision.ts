import type { Enemy } from './enemy';
import type { Point } from './field';
import type { DrawnLine } from './line';
import type { Projectile } from './projectile';
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

/**
 * Erster Gegner (Haupt- oder Mini-Gegner) aus `enemies`, der die aktive Linie
 * berührt – oder `null`. Mini-Gegner lösen dieselbe Kollision aus wie der
 * Hauptgegner; welcher es war, braucht der Aufrufer für den Stromball-Start.
 */
export function enemyTouchingLine(
  enemies: readonly Enemy[],
  line: DrawnLine,
  radius: number = ENEMY_TOUCH_RADIUS,
  head?: Point,
): Enemy | null {
  return enemies.find((e) => checkLineCollision(e.position, line, radius, head)) ?? null;
}

/**
 * Berührt IRGENDEIN Gegner (Haupt- oder Mini-Gegner) den ungeschützten Spieler
 * direkt auf dem Rand?
 */
export function anyUnshieldedEnemyHit(
  enemies: readonly Enemy[],
  playerPos: Point,
  shield: number,
  radius: number = ENEMY_TOUCH_RADIUS,
): boolean {
  return enemies.some((e) => checkUnshieldedPlayerCollision(e.position, playerPos, shield, radius));
}

/** Trefferradius für ein Projektil = Basis-Toleranz + halber Projektil-Durchmesser. */
export function projectileRadius(p: Projectile, baseRadius: number = ENEMY_TOUCH_RADIUS): number {
  return baseRadius + p.size / 2;
}

/**
 * Index des ersten Projektils, das die aktive Linie berührt – oder `-1`.
 * Nutzt dieselbe Punkt-Linien-Prüfung wie beim Gegner (`checkLineCollision`),
 * nur mit einem an die Projektilgrösse angepassten Radius.
 */
export function projectileIndexTouchingLine(
  projectiles: readonly Projectile[],
  line: DrawnLine,
  head?: Point,
): number {
  return projectiles.findIndex((p) =>
    checkLineCollision(p.position, line, projectileRadius(p), head),
  );
}

/**
 * Index des ersten Projektils, das den ungeschützten Spieler direkt trifft –
 * oder `-1`. `shield > 0` ⇒ immer `-1` (wie bei der Gegner-Berührung).
 *
 * `baseRadius` (Default `ENEMY_TOUCH_RADIUS`) erlaubt es dem Aufrufer, die
 * Basis-Toleranz auf die tatsächliche Spieler-Sprite-Grösse abzustimmen
 * (Instruktion 13) statt sie an die generische Gegner-Toleranz zu koppeln.
 */
export interface PlayerProjectileHit {
  projectileIndex: number;
  enemy: Enemy;
}

/**
 * Erster Treffer eines Spieler-Projektils (Kanone-Bonus, Instruktion 14) auf
 * einen Mini-Gegner – oder `null`. Bekommt bewusst NUR `miniEnemies` übergeben
 * (nicht den Hauptgegner): der Hauptgegner bestimmt die Eroberungs-Seite und
 * soll durch Beschuss unverwundbar bleiben (Punkt 9).
 */
export function findPlayerProjectileHittingMiniEnemy(
  playerProjectiles: readonly Projectile[],
  miniEnemies: readonly Enemy[],
): PlayerProjectileHit | null {
  for (let i = 0; i < playerProjectiles.length; i++) {
    const p = playerProjectiles[i];
    const radius = projectileRadius(p);
    const enemy = miniEnemies.find(
      (e) => Math.hypot(e.position.x - p.position.x, e.position.y - p.position.y) <= radius,
    );
    if (enemy) return { projectileIndex: i, enemy };
  }
  return null;
}

export function projectileIndexHittingUnshieldedPlayer(
  projectiles: readonly Projectile[],
  playerPos: Point,
  shield: number,
  baseRadius: number = ENEMY_TOUCH_RADIUS,
): number {
  return projectiles.findIndex((p) =>
    checkUnshieldedPlayerCollision(p.position, playerPos, shield, projectileRadius(p, baseRadius)),
  );
}
