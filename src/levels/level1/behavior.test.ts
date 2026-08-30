import { describe, it, expect } from 'vitest';
import { createEnemy } from '../../game/enemy';
import { createRectangularField } from '../../game/field';
import type { ShootingConfig } from '../types';
import { updateLevel1Enemies } from './behavior';

const SHOOTING: ShootingConfig = {
  enabled: true,
  cooldownSeconds: 2,
  projectileSpeed: 600,
  projectileSize: 18,
  projectileAssetSrc: '/x.svg',
};

function context(overrides: Partial<Parameters<typeof updateLevel1Enemies>[0]> = {}) {
  return {
    mainEnemy: createEnemy({ x: 200, y: 200 }, { speed: 100, size: 40 }),
    miniEnemies: [
      createEnemy({ x: 100, y: 100 }, { speed: 150, size: 22 }),
      createEnemy({ x: 300, y: 300 }, { speed: 150, size: 22 }),
    ],
    field: createRectangularField(480, 400),
    playerPosition: { x: 50, y: 50 },
    dt: 1 / 60,
    ...overrides,
  };
}

describe('updateLevel1Enemies', () => {
  it('bewegt alle Gegner (Haupt- + Mini) ein Stück', () => {
    const ctx = context();
    const before = [ctx.mainEnemy, ...ctx.miniEnemies].map((e) => ({ ...e.position }));

    updateLevel1Enemies(ctx);

    const after = [ctx.mainEnemy, ...ctx.miniEnemies].map((e) => e.position);
    after.forEach((pos, i) => {
      expect(pos.x !== before[i].x || pos.y !== before[i].y).toBe(true);
    });
  });

  it('nur der Hauptgegner schiesst, sobald sein Cooldown erreicht ist', () => {
    const ctx = context({ mainEnemyShooting: SHOOTING, dt: SHOOTING.cooldownSeconds });

    const shots = updateLevel1Enemies(ctx);

    expect(shots).toHaveLength(1);
  });

  it('ohne Schuss-Konfiguration feuert niemand', () => {
    const shots = updateLevel1Enemies(context({ dt: 10 }));
    expect(shots).toHaveLength(0);
  });

  it('Mini-Gegner schiessen auch mit Konfiguration nur, wenn miniEnemyShooting gesetzt ist', () => {
    const withMiniShooting = updateLevel1Enemies(
      context({ miniEnemyShooting: SHOOTING, dt: SHOOTING.cooldownSeconds }),
    );
    // 2 Mini-Gegner, beide über Cooldown -> 2 Schüsse (Hauptgegner ohne Config: 0).
    expect(withMiniShooting).toHaveLength(2);
  });
});
