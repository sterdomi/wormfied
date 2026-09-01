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

  it('enthält level2 an zweiter Stelle', () => {
    expect(levels.some((l) => l.id === 'level2')).toBe(true);
    expect(levels[1]?.id).toBe('level2');
  });

  it('level2 hat eine plausible Schlangen-Konfiguration', () => {
    const level2 = levels.find((l) => l.id === 'level2')!;

    expect(level2.name).toBeTruthy();
    // Eigenes Background-/Foreground-Artwork (nicht die Level-1-Bilder).
    expect(level2.backgroundSrc).toMatch(/level2\/background\.png$/);
    expect(level2.foregroundSrc).toMatch(/level2\/foreground\.png$/);
    // Kopf = Level-2-Drache, mit zweiter Pose für die Lauf-Animation.
    expect(level2.mainEnemy.assetSrc).toMatch(/level2\/gegner\.png$/);
    expect(level2.mainEnemy.walkAssetSrc).toMatch(/level2\/gegner_walk\.png$/);
    expect(level2.mainEnemy.shootAssetSrc).toMatch(/level2\/gegner_schuss\.png$/);
    expect(level2.mainEnemy.speed).toBeGreaterThan(0);
    expect(level2.mainEnemy.size).toBeGreaterThan(0);

    // Kopf + 3 Mini-Körperglieder = Schlange; Glieder tragen dieselbe Grafik.
    expect(level2.miniEnemies.count).toBe(3);
    expect(level2.miniEnemies.config.assetSrc).toMatch(/level2\/gegner\.png$/);

    // In Level 2 schiesst nur der Kopf, nicht die Körperglieder.
    expect(level2.mainEnemy.shooting?.enabled).toBe(true);
    expect(level2.mainEnemy.shooting!.cooldownSeconds).toBeGreaterThan(0);
    expect(level2.mainEnemy.shooting!.projectileAssetSrc).toMatch(/projectiles\/torpedo\.png$/);
    expect(level2.mainEnemy.shooting!.soundSrc).toMatch(/sound\/torpedo\.mp3$/);
    expect(level2.miniEnemies.config.shooting?.enabled ?? false).toBe(false);
    // Torpedo-Einschlag löst einen Effekt aus (Blasen-Poof).
    expect(typeof level2.onEnemyProjectileImpact).toBe('function');

    // Spieler startet Level 2 mit Kanone (→ Cyborg-Look) ausgerüstet.
    expect(level2.startsWithCannon).toBe(true);
  });

  it('level1: Spieler startet OHNE Kanone (nur per Bonusstein)', () => {
    const level1 = levels.find((l) => l.id === 'level1')!;
    expect(level1.startsWithCannon ?? false).toBe(false);
  });
});
