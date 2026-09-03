import { describe, it, expect } from 'vitest';
import { levels } from './index';
import { EEL_BODY_COUNT, ROAMER_COUNT } from './level3/enemySet';
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

  it('enthält level3 an dritter Stelle', () => {
    expect(levels.some((l) => l.id === 'level3')).toBe(true);
    expect(levels[2]?.id).toBe('level3');
  });

  it('level3 hat eine plausible Aal-Konfiguration', () => {
    const level3 = levels.find((l) => l.id === 'level3')!;

    expect(level3.name).toBeTruthy();
    // Eigenes Unterwasser-Artwork (nicht die Level-1/2-Bilder).
    expect(level3.backgroundSrc).toMatch(/level3\/background\.png$/);
    expect(level3.foregroundSrc).toMatch(/level3\/foreground\.png$/);
    // Aal-Kopf = head.png; Körper-/Schwanz-Grafik reist an den freien
    // mainEnemy-Slots mit (kein Lauf-/Schuss-Sprite am Aal-Kopf).
    expect(level3.mainEnemy.assetSrc).toMatch(/level3\/head\.png$/);
    expect(level3.mainEnemy.walkAssetSrc).toMatch(/level3\/body\.png$/);
    expect(level3.mainEnemy.shootAssetSrc).toMatch(/level3\/tail\.png$/);
    // miniEnemies.config = die frei laufenden Plasma-Minis.
    expect(level3.miniEnemies.config.assetSrc).toMatch(/level3\/gegner_mini\.png$/);
    expect(level3.miniEnemies.config.walkAssetSrc).toMatch(/level3\/gegner_mini_walk\.png$/);
    // Aal-Körpersegmente + Plasma-Minis teilen sich die eine Liste.
    expect(level3.miniEnemies.count).toBe(EEL_BODY_COUNT + ROAMER_COUNT);

    // Nur der Kopf schiesst – Torpedo wie Level 2.
    expect(level3.mainEnemy.shooting?.enabled).toBe(true);
    expect(level3.mainEnemy.shooting!.projectileAssetSrc).toMatch(/projectiles\/torpedo\.png$/);
    expect(level3.mainEnemy.shooting!.soundSrc).toMatch(/sound\/torpedo\.mp3$/);
    expect(level3.miniEnemies.config.shooting?.enabled ?? false).toBe(false);
    // Torpedo-Einschlag löst einen Effekt aus (Blasen-Poof), Unterwasser-Look aktiv.
    expect(typeof level3.onEnemyProjectileImpact).toBe('function');
    expect(typeof level3.renderDecoration).toBe('function');
    // Foreground-Blackout während der Strom-Attacke.
    expect(typeof level3.foregroundBlackout).toBe('function');

    // Alle vier Bonustypen aktiv (keine allowedTypes-Beschränkung mehr).
    expect(level3.startsWithCannon ?? false).toBe(false);
    expect(level3.bonusStones.spawning.allowedTypes).toBeUndefined();

    // Eigene Musik.
    expect(level3.musicSrc).toMatch(/level3\/level3\.mp3$/);
  });

  it('level1: Spieler startet OHNE Kanone (nur per Bonusstein)', () => {
    const level1 = levels.find((l) => l.id === 'level1')!;
    expect(level1.startsWithCannon ?? false).toBe(false);
  });

  it('enthält level4 an vierter Stelle', () => {
    expect(levels.some((l) => l.id === 'level4')).toBe(true);
    expect(levels[3]?.id).toBe('level4');
  });

  it('level4 – Dschungel: erste Ausbaustufe (trommelnder Gorilla)', () => {
    const level4 = levels.find((l) => l.id === 'level4')!;

    expect(level4.name).toBeTruthy();
    expect(level4.backgroundSrc).toMatch(/level4\//);
    expect(level4.foregroundSrc).toMatch(/level4\/foreground\.(jpg|png)$/);
    expect(level4.mainEnemy.assetSrc).toMatch(/level4\/gorilla_/);
    // 6 Papageien als Mini-Gegner, die kleine Kugeln schiessen.
    expect(level4.miniEnemies.count).toBe(6);
    expect(level4.miniEnemies.config.assetSrc).toMatch(/level4\/papagei_up\.png$/);
    expect(level4.miniEnemies.config.shooting?.enabled).toBe(true);
    expect(level4.miniEnemies.config.shooting!.projectileAssetSrc).toMatch(/projectiles\/kugel\.svg$/);
    expect(level4.miniEnemies.config.shooting!.projectileSize).toBeLessThan(16);
    expect(level4.mainEnemy.shooting?.enabled ?? false).toBe(false);
    // Bonussteine wie Level 1, keine Beschränkung.
    expect(level4.bonusStones.spawning.allowedTypes).toBeUndefined();
    expect(typeof level4.renderEnemies).toBe('function');
    expect(typeof level4.updateEnemies).toBe('function');
    // Eigene Dschungel-Musik.
    expect(level4.musicSrc).toMatch(/level4\/jungle\.mp3$/);
    // Unten + Seiten bis 20 %: kein Reinfahren (blocksDrawingAt) + schwarze U-Linie.
    expect(typeof level4.renderDecoration).toBe('function');
    expect(typeof level4.blocksDrawingAt).toBe('function');
    // Im gesperrten unteren Bereich blockiert, oben nicht.
    expect(level4.blocksDrawingAt!({ x: 480, y: 540 }, 960, 540)).toBe(true);
    expect(level4.blocksDrawingAt!({ x: 0, y: 500 }, 960, 540)).toBe(true);
    expect(level4.blocksDrawingAt!({ x: 480, y: 100 }, 960, 540)).toBe(false);
  });
});
