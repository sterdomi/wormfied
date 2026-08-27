import { createEnemy, type Enemy, type EnemySpec } from './enemy';
import type { Point } from './field';
import { randomDirection } from './enemyMovement';
import { isPointInPolygon } from './polygon';

/** Obergrenze an Platzierungsversuchen (verhindert Endlosschleife bei engem Feld). */
const SPAWN_MAX_TRIES = 300;

/**
 * Verteilt `count` Mini-Gegner zufällig im Inneren von `polygon`, jeweils mit
 * Mindestabstand `minDistance` zueinander und zu den `avoid`-Punkten (z.B.
 * Hauptgegner, Spieler-Startposition), damit nicht alle übereinanderliegen.
 * Passen nicht alle rein, kommen weniger zurück.
 */
export function spawnMiniEnemies(
  polygon: Point[],
  count: number,
  spec: EnemySpec,
  avoid: readonly Point[],
  minDistance: number,
  rng: () => number = Math.random,
): Enemy[] {
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const enemies: Enemy[] = [];
  const farEnough = (p: Point): boolean =>
    [...avoid, ...enemies.map((e) => e.position)].every(
      (q) => Math.hypot(p.x - q.x, p.y - q.y) >= minDistance,
    );

  for (let tries = 0; enemies.length < count && tries < SPAWN_MAX_TRIES; tries++) {
    const p: Point = { x: minX + rng() * (maxX - minX), y: minY + rng() * (maxY - minY) };
    if (!isPointInPolygon(p, polygon) || !farEnough(p)) continue;
    enemies.push(createEnemy(p, spec, randomDirection(rng)));
  }
  return enemies;
}

/**
 * Entfernt Mini-Gegner, die im soeben eroberten Teilpolygon liegen ("gefangen"
 * beim Einschliessen). Liefert die übrigen.
 *
 * TODO(später): gefangene Mini-Gegner sollten Bonuspunkte geben (siehe
 * Instruktion 9), aktuell verschwinden sie ohne Score-Effekt.
 */
export function removeCapturedMiniEnemies(
  miniEnemies: readonly Enemy[],
  claimedPolygon: Point[],
): Enemy[] {
  return miniEnemies.filter((e) => !isPointInPolygon(e.position, claimedPolygon));
}
