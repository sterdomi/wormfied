import { describe, it, expect } from 'vitest';
import {
  applyBonusStoneEffect,
  bonusStoneSoundKey,
  createBonusStone,
  createBonusStoneSpawner,
  findBonusStoneSpawnPosition,
  isBlockedByBonusStone,
  isBonusStoneExpired,
  partitionCapturedBonusStones,
  pruneExpiredBonusStones,
  tickBonusStoneSpawning,
} from './bonusStone';
import { createRectangularField } from './field';
import { createPlayerState } from './playerState';
import type { BonusStoneSpawning, BonusStonesConfig } from '../levels/types';

const SPAWNING: BonusStoneSpawning = {
  spawnIntervalSeconds: 5,
  maxSimultaneous: 2,
  lifetimeSeconds: 10,
  radius: 16,
};

const BONUS_CONFIG: BonusStonesConfig = {
  spawning: SPAWNING,
  speedBoost: { assetSrc: 'speed.svg', speedMultiplier: 2, effectDurationSeconds: 5 },
  cannon: {
    assetSrc: 'cannon.svg',
    fireIntervalSeconds: 0.35,
    projectileSpeed: 260,
    projectileSize: 14,
    projectileAssetSrc: 'bullet.svg',
  },
};

const field = createRectangularField(800, 600);

describe('tickBonusStoneSpawning', () => {
  it('spawnt nichts, bevor spawnIntervalSeconds erreicht ist', () => {
    const spawner = createBonusStoneSpawner();
    const stone = tickBonusStoneSpawning(spawner, [], field, SPAWNING, 1, performance.now());
    expect(stone).toBeNull();
  });

  it('spawnt nach Ablauf des Intervalls, solange Platz ist', () => {
    const spawner = createBonusStoneSpawner();
    const stone = tickBonusStoneSpawning(
      spawner,
      [],
      field,
      SPAWNING,
      SPAWNING.spawnIntervalSeconds,
      performance.now(),
      () => 0.5,
    );
    expect(stone).not.toBeNull();
    expect(spawner.timeSinceLastSpawn).toBe(0); // Timer zurückgesetzt
  });

  it('respektiert maxSimultaneous – kein Spawn, wenn das Feld schon voll ist', () => {
    const spawner = createBonusStoneSpawner();
    const now = performance.now();
    const existing = [
      createBonusStone({ x: 100, y: 100 }, 'speedBoost', now),
      createBonusStone({ x: 200, y: 200 }, 'cannon', now),
    ];
    expect(existing).toHaveLength(SPAWNING.maxSimultaneous);

    const stone = tickBonusStoneSpawning(
      spawner,
      existing,
      field,
      SPAWNING,
      SPAWNING.spawnIntervalSeconds,
      now,
    );
    expect(stone).toBeNull();
    // Timer bleibt stehen (kein Reset), damit sofort nachgespawnt wird, sobald
    // wieder Platz ist.
    expect(spawner.timeSinceLastSpawn).toBeGreaterThanOrEqual(SPAWNING.spawnIntervalSeconds);
  });
});

describe('isBonusStoneExpired / pruneExpiredBonusStones', () => {
  it('ein Stein wird nach lifetimeSeconds entfernt', () => {
    const now = performance.now();
    const fresh = createBonusStone({ x: 0, y: 0 }, 'speedBoost', now);
    const old = createBonusStone({ x: 1, y: 1 }, 'cannon', now);
    old.spawnedAt -= SPAWNING.lifetimeSeconds * 1000 + 1000; // längst abgelaufen

    expect(isBonusStoneExpired(fresh, SPAWNING.lifetimeSeconds, now)).toBe(false);
    expect(isBonusStoneExpired(old, SPAWNING.lifetimeSeconds, now)).toBe(true);

    const result = pruneExpiredBonusStones([fresh, old], SPAWNING.lifetimeSeconds, now);
    expect(result).toEqual([fresh]);
  });
});

describe('partitionCapturedBonusStones + applyBonusStoneEffect', () => {
  const claimed = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  it('ein Stein im eroberten Teilpolygon löst den speedBoost-Bonus aus', () => {
    const now = performance.now();
    const inside = createBonusStone({ x: 50, y: 50 }, 'speedBoost', now);
    const outside = createBonusStone({ x: 500, y: 500 }, 'cannon', now);

    const { survivors, captured } = partitionCapturedBonusStones([inside, outside], claimed);
    expect(survivors).toEqual([outside]);
    expect(captured).toEqual([inside]);

    const playerState = createPlayerState();
    applyBonusStoneEffect(inside, playerState, BONUS_CONFIG);
    expect(playerState.speedBoostRemainingSeconds).toBe(
      BONUS_CONFIG.speedBoost.effectDurationSeconds,
    );
    expect(playerState.cannonRemainingSeconds).toBe(0);
  });

  it('ein Stein im eroberten Teilpolygon löst den cannon-Bonus aus', () => {
    const now = performance.now();
    const inside = createBonusStone({ x: 50, y: 50 }, 'cannon', now);

    const { captured } = partitionCapturedBonusStones([inside], claimed);
    expect(captured).toEqual([inside]);

    const playerState = createPlayerState();
    applyBonusStoneEffect(inside, playerState, BONUS_CONFIG);
    // Kein Zeit-Bonus (mehr): Infinity statt einer endlichen Dauer, siehe
    // Kommentar bei `applyBonusStoneEffect` (Nutzer-Feedback: einmal
    // erhalten, geht sie im Level nicht wieder verloren).
    expect(playerState.cannonRemainingSeconds).toBe(Infinity);
    expect(playerState.speedBoostRemainingSeconds).toBe(0);
  });
});

describe('isBlockedByBonusStone', () => {
  it('blockiert innerhalb von radius + Sicherheitsabstand, nicht ausserhalb', () => {
    const now = performance.now();
    const stone = createBonusStone({ x: 100, y: 100 }, 'cannon', now);

    expect(isBlockedByBonusStone([stone], { x: 105, y: 100 }, 16)).toBe(true); // dicht dran
    expect(isBlockedByBonusStone([stone], { x: 200, y: 200 }, 16)).toBe(false); // weit weg
  });
});

describe('findBonusStoneSpawnPosition', () => {
  it('liefert eine Position innerhalb des Polygons mit Abstand zum Rand', () => {
    const pos = findBonusStoneSpawnPosition(field, [], SPAWNING, () => 0.5);
    expect(pos).not.toBeNull();
  });
});

describe('bonusStoneSoundKey (Instruktion 18)', () => {
  it('liefert den passenden Pickup-Sound je Bonustyp', () => {
    expect(bonusStoneSoundKey('speedBoost')).toBe('pickup_speed');
    expect(bonusStoneSoundKey('cannon')).toBe('pickup_cannon');
  });
});
