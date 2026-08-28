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
 * Teilt Mini-Gegner danach auf, ob sie im soeben eroberten Teilpolygon liegen
 * ("gefangen" beim Einschliessen) oder nicht. `captured` erlaubt es dem
 * Aufrufer, für jeden gefangenen Mini-Gegner Punkte gutzuschreiben und eine
 * Explosion an dessen Position auszulösen (Instruktion 12).
 */
export function partitionCapturedMiniEnemies(
  miniEnemies: readonly Enemy[],
  claimedPolygon: Point[],
): { survivors: Enemy[]; captured: Enemy[] } {
  const survivors: Enemy[] = [];
  const captured: Enemy[] = [];
  for (const e of miniEnemies) {
    (isPointInPolygon(e.position, claimedPolygon) ? captured : survivors).push(e);
  }
  return { survivors, captured };
}

/**
 * Entfernt Mini-Gegner, die im soeben eroberten Teilpolygon liegen ("gefangen"
 * beim Einschliessen). Liefert die übrigen.
 */
export function removeCapturedMiniEnemies(
  miniEnemies: readonly Enemy[],
  claimedPolygon: Point[],
): Enemy[] {
  return partitionCapturedMiniEnemies(miniEnemies, claimedPolygon).survivors;
}
