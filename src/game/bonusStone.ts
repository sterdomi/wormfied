import type { Point } from './field';
import { closestPointOnPerimeter } from './geometry';
import { isPointInPolygon } from './polygon';
import type { BonusStoneSpawning, BonusStonesConfig } from '../levels/types';
import type { PlayerState } from './playerState';

export type BonusStoneType = 'speedBoost' | 'cannon';

export interface BonusStone {
  id: string;
  type: BonusStoneType;
  position: Point;
  /** `performance.now()`-Zeitstempel bei Erzeugung – wie `Explosion.startTime`. */
  spawnedAt: number;
}

/** Explosionsfarben für den Aufnahme-Effekt (Instruktion 12s `Explosion.color`). */
export const BONUS_STONE_EXPLOSION_COLOR: Record<BonusStoneType, string> = {
  speedBoost: '#48cae4', // Blau, wie in bonus-speed.svg
  cannon: '#ff9e00', // Orange, wie in bonus-cannon.svg
};

export function createBonusStone(
  position: Point,
  type: BonusStoneType,
  now: number,
  id: string = crypto.randomUUID(),
): BonusStone {
  return { id, type, position: { x: position.x, y: position.y }, spawnedAt: now };
}

/** `true`, sobald `lifetimeSeconds` seit `spawnedAt` verstrichen sind. */
export function isBonusStoneExpired(
  stone: BonusStone,
  lifetimeSeconds: number,
  now: number,
): boolean {
  return now - stone.spawnedAt >= lifetimeSeconds * 1000;
}

/** Entfernt abgelaufene Bonussteine aus der Liste (neue Liste, kein Mutieren). */
export function pruneExpiredBonusStones(
  stones: readonly BonusStone[],
  lifetimeSeconds: number,
  now: number,
): BonusStone[] {
  return stones.filter((s) => !isBonusStoneExpired(s, lifetimeSeconds, now));
}

/** Deckkraft für sanftes Ausblenden in der letzten Sekunde vor Ablauf (1 → 0). */
const FADE_OUT_MS = 1000;
export function bonusStoneOpacity(
  stone: BonusStone,
  lifetimeSeconds: number,
  now: number,
): number {
  const remainingMs = stone.spawnedAt + lifetimeSeconds * 1000 - now;
  if (remainingMs >= FADE_OUT_MS) return 1;
  return Math.max(0, remainingMs / FADE_OUT_MS);
}

/**
 * Teilt Bonussteine danach auf, ob sie im soeben eroberten Teilpolygon liegen
 * ("gefangen") oder nicht – analog zu `partitionCapturedMiniEnemies`.
 */
export function partitionCapturedBonusStones(
  stones: readonly BonusStone[],
  claimedPolygon: Point[],
): { survivors: BonusStone[]; captured: BonusStone[] } {
  const survivors: BonusStone[] = [];
  const captured: BonusStone[] = [];
  for (const s of stones) {
    (isPointInPolygon(s.position, claimedPolygon) ? captured : survivors).push(s);
  }
  return { survivors, captured };
}

/**
 * Wendet den Bonus-Effekt eines gefangenen Steins auf den Spielerzustand an
 * (Instruktion 14, Punkt 7/8). Mutiert `playerState`.
 */
export function applyBonusStoneEffect(
  stone: BonusStone,
  playerState: PlayerState,
  bonusStones: BonusStonesConfig,
): void {
  if (stone.type === 'speedBoost') {
    playerState.speedBoostRemainingSeconds = bonusStones.speedBoost.effectDurationSeconds;
  } else {
    playerState.cannonRemainingSeconds = bonusStones.cannon.effectDurationSeconds;
  }
}

/**
 * Kleiner Sicherheitsabstand zusätzlich zu `radius`, damit der Spieler nicht
 * direkt am Kristallrand "klebt".
 */
const PLAYER_SAFETY_MARGIN = 6;

/**
 * Wirkt `point` wie eine feste Wand, weil er einen aktiven Bonusstein
 * schneiden würde? Einfache "Bewegung blockieren"-Lösung (Instruktion 14,
 * Punkt 5), keine Ausweich-/Gleit-Physik.
 */
export function isBlockedByBonusStone(
  stones: readonly BonusStone[],
  point: Point,
  radius: number,
  safetyMargin: number = PLAYER_SAFETY_MARGIN,
): boolean {
  return stones.some(
    (s) => Math.hypot(point.x - s.position.x, point.y - s.position.y) < radius + safetyMargin,
  );
}

/** Obergrenze an Platzierungsversuchen (verhindert Endlosschleife bei engem Feld). */
const SPAWN_MAX_TRIES = 300;

/**
 * Zufällige gültige Spawn-Position innerhalb von `polygon`: mit Mindestabstand
 * zum Feldrand (`radius × 2`, damit der Stein nicht direkt auf der Kante
 * erscheint) und zu bereits existierenden Steinen (ebenfalls `radius × 2`).
 * `null`, falls in `SPAWN_MAX_TRIES` Versuchen keine gefunden wird (z.B. sehr
 * kleines Feld) – der Aufrufer versucht es dann einfach beim nächsten Tick
 * erneut.
 */
export function findBonusStoneSpawnPosition(
  polygon: Point[],
  existingStones: readonly BonusStone[],
  spawning: BonusStoneSpawning,
  rng: () => number = Math.random,
): Point | null {
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const edgeMargin = spawning.radius * 2;
  const spacing = spawning.radius * 2;

  for (let tries = 0; tries < SPAWN_MAX_TRIES; tries++) {
    const p: Point = { x: minX + rng() * (maxX - minX), y: minY + rng() * (maxY - minY) };
    if (!isPointInPolygon(p, polygon)) continue;
    if (closestPointOnPerimeter(polygon, p).distance < edgeMargin) continue;
    if (existingStones.some((s) => Math.hypot(p.x - s.position.x, p.y - s.position.y) < spacing)) {
      continue;
    }
    return p;
  }
  return null;
}

/** Timer-Zustand für `tickBonusStoneSpawning` – ein Wert pro laufendem Spiel. */
export interface BonusStoneSpawner {
  timeSinceLastSpawn: number;
}

export function createBonusStoneSpawner(): BonusStoneSpawner {
  return { timeSinceLastSpawn: 0 };
}

/**
 * Akkumuliert `dt`; ist `spawnIntervalSeconds` erreicht UND
 * `existingStones.length < maxSimultaneous` UND eine gültige Position wird
 * gefunden, entsteht ein neuer, zufällig typisierter Bonusstein (50/50) und
 * der Timer wird zurückgesetzt. Mutiert `spawner`.
 *
 * Der Timer wird NUR bei einem tatsächlichen Spawn zurückgesetzt (nicht schon
 * beim blossen Ablauf des Intervalls) – ist das Feld voll oder wird keine
 * Position gefunden, bleibt er stehen, sodass sofort nachgespawnt wird, sobald
 * wieder Platz ist, statt ein komplett neues Intervall abzuwarten.
 */
export function tickBonusStoneSpawning(
  spawner: BonusStoneSpawner,
  existingStones: readonly BonusStone[],
  polygon: Point[],
  spawning: BonusStoneSpawning,
  dt: number,
  now: number,
  rng: () => number = Math.random,
): BonusStone | null {
  spawner.timeSinceLastSpawn += dt;
  if (spawner.timeSinceLastSpawn < spawning.spawnIntervalSeconds) return null;
  if (existingStones.length >= spawning.maxSimultaneous) return null;

  const position = findBonusStoneSpawnPosition(polygon, existingStones, spawning, rng);
  if (!position) return null;

  spawner.timeSinceLastSpawn = 0;
  const type: BonusStoneType = rng() < 0.5 ? 'speedBoost' : 'cannon';
  return createBonusStone(position, type, now);
}
