import { describe, it, expect } from 'vitest';
import { createEnemy } from '../../game/enemy';
import { createRectangularField } from '../../game/field';
import { updateLevel2Enemies } from './behavior';

function context(overrides: Partial<Parameters<typeof updateLevel2Enemies>[0]> = {}) {
  const head = createEnemy({ x: 400, y: 200 }, { speed: 250, size: 130 });
  head.direction = { x: 1, y: 0 };
  return {
    mainEnemy: head,
    miniEnemies: Array.from({ length: 3 }, () =>
      createEnemy({ x: 400, y: 200 }, { speed: 0, size: 98 }),
    ),
    field: createRectangularField(2000, 1400),
    playerPosition: { x: 50, y: 50 },
    dt: 1 / 60,
    ...overrides,
  };
}

describe('updateLevel2Enemies', () => {
  it('bewegt den Kopf und hängt die 3 Minis als Kette dahinter', () => {
    const ctx = context();
    const headStart = { ...ctx.mainEnemy.position };

    for (let i = 0; i < 60; i++) updateLevel2Enemies(ctx);

    expect(ctx.mainEnemy.position.x !== headStart.x || ctx.mainEnemy.position.y !== headStart.y).toBe(
      true,
    );
    // Minis sind der Kette gefolgt und stehen gestaffelt hinter dem Kopf.
    const d = ctx.miniEnemies.map((m) =>
      Math.hypot(m.position.x - ctx.mainEnemy.position.x, m.position.y - ctx.mainEnemy.position.y),
    );
    expect(d[0]).toBeGreaterThan(0);
    expect(d[0]).toBeLessThan(d[1]);
    expect(d[1]).toBeLessThan(d[2]);
  });

  it('niemand schiesst in Level 2', () => {
    expect(updateLevel2Enemies(context({ dt: 10 }))).toEqual([]);
  });

  it('kommt mit weniger Minis klar (Glied besiegt)', () => {
    const ctx = context();
    for (let i = 0; i < 30; i++) updateLevel2Enemies(ctx);
    ctx.miniEnemies = ctx.miniEnemies.slice(0, 1);
    expect(() => {
      for (let i = 0; i < 30; i++) updateLevel2Enemies(ctx);
    }).not.toThrow();
  });
});
