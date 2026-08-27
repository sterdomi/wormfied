import { describe, it, expect } from 'vitest';
import { levels } from './index';

describe('Level-Registry', () => {
  it('enthält mindestens level1', () => {
    expect(levels.length).toBeGreaterThanOrEqual(1);
    expect(levels.some((l) => l.id === 'level1')).toBe(true);
  });

  it('level1 hat eine plausible Konfiguration', () => {
    const level1 = levels.find((l) => l.id === 'level1')!;

    expect(level1.name).toBeTruthy();
    expect(level1.foregroundSrc).toMatch(/\.png$/);
    expect(level1.backgroundSrc).toMatch(/\.png$/);
    expect(level1.mainEnemy.assetSrc).toMatch(/\.svg$/);
    expect(level1.mainEnemy.speed).toBeGreaterThan(0);
    expect(level1.mainEnemy.size).toBeGreaterThan(0);

    expect(level1.miniEnemies.count).toBeGreaterThan(0);
    expect(level1.miniEnemies.config.assetSrc).toMatch(/\.svg$/);
    expect(level1.miniEnemies.config.speed).toBeGreaterThan(0);
    expect(level1.miniEnemies.config.size).toBeGreaterThan(0);
    // Mini-Gegner sind kleiner als der Hauptgegner (Design-Entscheidung Level 1).
    expect(level1.miniEnemies.config.size).toBeLessThan(level1.mainEnemy.size);
  });
});
