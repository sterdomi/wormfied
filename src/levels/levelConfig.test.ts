import { describe, it, expect } from 'vitest';
import { levels } from './index';
import { DRAW_SPEED } from '../game/drawing';
import { EDGE_SPEED } from '../game/playerMovement';

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

  it('level1: nur der Hauptgegner schiesst, mit plausiblen Werten', () => {
    const level1 = levels.find((l) => l.id === 'level1')!;

    expect(level1.mainEnemy.shooting?.enabled).toBe(true);
    expect(level1.mainEnemy.shooting!.cooldownSeconds).toBeGreaterThan(1);
    expect(level1.mainEnemy.shooting!.projectileSpeed).toBeGreaterThan(0);
    expect(level1.mainEnemy.shooting!.projectileSize).toBeGreaterThan(0);
    expect(level1.mainEnemy.shooting!.projectileAssetSrc).toMatch(/\.svg$/);

    // Mini-Gegner schiessen in Level 1 nicht.
    expect(level1.miniEnemies.config.shooting?.enabled ?? false).toBe(false);
  });

  it('level1: Schüsse (Gegner- UND Kanone-Kugel) sind schneller als die Spieler-Höchstgeschwindigkeit (Nutzer-Feedback: "Die Schüsse müssen schneller sein, als man fährt")', () => {
    const level1 = levels.find((l) => l.id === 'level1')!;
    const playerMaxSpeed = Math.max(EDGE_SPEED, DRAW_SPEED);

    expect(level1.mainEnemy.shooting!.projectileSpeed).toBeGreaterThan(playerMaxSpeed);
    expect(level1.bonusStones.cannon.projectileSpeed).toBeGreaterThan(playerMaxSpeed);
  });
});
