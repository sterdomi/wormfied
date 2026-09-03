import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEnemy } from '../../game/enemy';
import { createRectangularField } from '../../game/field';
import type { LevelEnemyUpdateContext, ShootingConfig } from '../types';
import { updateLevel4Enemies } from './behavior';

const SHOOTING: ShootingConfig = {
  enabled: true,
  cooldownSeconds: 3.2,
  projectileSpeed: 300,
  projectileSize: 12,
  projectileAssetSrc: '/assets/projectiles/kugel.svg',
};

const DT = 1 / 60;

function context(overrides: Partial<LevelEnemyUpdateContext> = {}): LevelEnemyUpdateContext {
  return {
    mainEnemy: createEnemy({ x: 480, y: 420 }, { speed: 0, size: 130 }),
    miniEnemies: Array.from({ length: 6 }, (_, i) =>
      createEnemy({ x: 120 + i * 100, y: 120 }, { speed: 185, size: 46 }),
    ),
    field: createRectangularField(960, 540),
    playerPosition: { x: 480, y: 260 },
    dt: DT,
    ...overrides,
  } as LevelEnemyUpdateContext;
}

/** Deterministischer PRNG, damit der Test trotz `Math.random` reproduzierbar ist. */
function seedRandom(seed: number): void {
  let s = seed >>> 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('updateLevel4Enemies – Papageien-Schüsse', () => {
  it('ohne miniEnemyShooting feuert kein Papagei', () => {
    const ctx = context({ dt: 5 });
    let total = 0;
    for (let i = 0; i < 20; i++) total += updateLevel4Enemies(ctx).length;
    expect(total).toBe(0);
  });

  it('mit Konfiguration schiessen die Papageien kleine Kugeln', () => {
    seedRandom(1);
    const ctx = context({ miniEnemyShooting: SHOOTING });
    const shots: ReturnType<typeof updateLevel4Enemies> = [];
    for (let i = 0; i < Math.round(12 / DT); i++) shots.push(...updateLevel4Enemies(ctx));

    expect(shots.length).toBeGreaterThan(6);
    for (const s of shots) expect(s.size).toBe(SHOOTING.projectileSize);
  });

  it('feuern versetzt – nie alle sechs im selben Frame', () => {
    seedRandom(42);
    const ctx = context({ miniEnemyShooting: SHOOTING });

    let maxPerFrame = 0;
    let framesWithShots = 0;
    let total = 0;
    for (let i = 0; i < Math.round(10 / DT); i++) {
      const n = updateLevel4Enemies(ctx).length;
      if (n > 0) framesWithShots++;
      maxPerFrame = Math.max(maxPerFrame, n);
      total += n;
    }

    expect(total).toBeGreaterThanOrEqual(6); // jeder Papagei feuert mehrfach
    expect(maxPerFrame).toBeLessThan(6); // aber nie alle gleichzeitig
    expect(framesWithShots).toBeGreaterThanOrEqual(6); // über viele Frames verteilt
  });
});
