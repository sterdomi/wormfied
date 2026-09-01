import { describe, it, expect } from 'vitest';
import { createEnemy } from '../../game/enemy';
import { createRectangularField } from '../../game/field';
import type { ShootingConfig } from '../types';
import { updateLevel2Enemies } from './behavior';
import { isChainSegment } from './mouthSpit';

const SHOOTING: ShootingConfig = {
  enabled: true,
  cooldownSeconds: 2.6,
  projectileSpeed: 600,
  projectileSize: 18,
  projectileAssetSrc: '/x.svg',
};

function context(overrides: Partial<Parameters<typeof updateLevel2Enemies>[0]> = {}) {
  const head = createEnemy({ x: 400, y: 200 }, { speed: 250, size: 130 });
  head.direction = { x: 1, y: 0 };
  return {
    mainEnemy: head,
    miniEnemies: Array.from({ length: 3 }, () =>
      createEnemy({ x: 400, y: 200 }, { speed: 250, size: 98 }),
    ),
    field: createRectangularField(2000, 1400),
    playerPosition: { x: 50, y: 50 },
    dt: 1 / 60,
    playerJustUndocked: false,
    ...overrides,
  };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
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

  it('ohne Schuss-Konfiguration feuert niemand', () => {
    expect(updateLevel2Enemies(context({ dt: 10 }))).toEqual([]);
  });

  it('der Kopf feuert, sobald sein Cooldown erreicht ist', () => {
    const shots = updateLevel2Enemies(
      context({ mainEnemyShooting: SHOOTING, dt: SHOOTING.cooldownSeconds }),
    );
    expect(shots).toHaveLength(1);
  });

  it('die Körperglieder feuern nicht (nur der Kopf)', () => {
    // miniEnemyShooting wird von updateLevel2Enemies bewusst ignoriert.
    const shots = updateLevel2Enemies(
      context({ miniEnemyShooting: SHOOTING, dt: SHOOTING.cooldownSeconds }),
    );
    expect(shots).toEqual([]);
  });

  it('kommt mit weniger Minis klar (Glied besiegt)', () => {
    const ctx = context();
    for (let i = 0; i < 30; i++) updateLevel2Enemies(ctx);
    ctx.miniEnemies = ctx.miniEnemies.slice(0, 1);
    expect(() => {
      for (let i = 0; i < 30; i++) updateLevel2Enemies(ctx);
    }).not.toThrow();
  });

  it('Abdocken spuckt genau EIN Glied durch den Mund aus', () => {
    const ctx = context();
    for (let i = 0; i < 30; i++) updateLevel2Enemies(ctx);
    expect(ctx.miniEnemies.every(isChainSegment)).toBe(true);

    ctx.playerJustUndocked = true;
    updateLevel2Enemies(ctx);
    ctx.playerJustUndocked = false;

    expect(ctx.miniEnemies.filter((m) => !isChainSegment(m))).toHaveLength(1);
    expect(ctx.miniEnemies.filter(isChainSegment)).toHaveLength(2);
  });

  it('das ausgespuckte Glied fliegt Richtung Spielerposition', () => {
    const ctx = context();
    for (let i = 0; i < 30; i++) updateLevel2Enemies(ctx);

    ctx.playerJustUndocked = true;
    updateLevel2Enemies(ctx);
    ctx.playerJustUndocked = false;

    const spat = ctx.miniEnemies.find((m) => !isChainSegment(m))!;
    const before = dist(spat.position, ctx.playerPosition);
    for (let i = 0; i < 40; i++) updateLevel2Enemies(ctx);
    expect(dist(spat.position, ctx.playerPosition)).toBeLessThan(before);
  });

  it('durchläuft alle Phasen ohne Fehler und bleibt im Feld', () => {
    const ctx = context();
    for (let i = 0; i < 30; i++) updateLevel2Enemies(ctx);

    ctx.playerJustUndocked = true;
    updateLevel2Enemies(ctx);
    ctx.playerJustUndocked = false;

    const spat = ctx.miniEnemies.find((m) => !isChainSegment(m))!;
    // Flug → freier Lauf → Rückflug → Andocken: darf nicht werfen, bleibt im Feld.
    expect(() => {
      for (let i = 0; i < 400; i++) updateLevel2Enemies(ctx);
    }).not.toThrow();
    expect(spat.position.x).toBeGreaterThan(0);
    expect(spat.position.x).toBeLessThan(2000);
    expect(spat.position.y).toBeGreaterThan(0);
    expect(spat.position.y).toBeLessThan(1400);
  });

  it('das ausgespuckte Glied kehrt zurück und dockt wieder an der Schlange an', () => {
    const ctx = context();
    for (let i = 0; i < 30; i++) updateLevel2Enemies(ctx);

    ctx.playerJustUndocked = true;
    updateLevel2Enemies(ctx);
    ctx.playerJustUndocked = false;

    const spat = ctx.miniEnemies.find((m) => !isChainSegment(m))!;
    expect(isChainSegment(spat)).toBe(false);

    // Genug Frames für Flug (~1 s) + freien Lauf (3 s) + Rückflug zur Schlange.
    for (let i = 0; i < 1500; i++) updateLevel2Enemies(ctx);

    expect(ctx.miniEnemies.every(isChainSegment)).toBe(true);
    // Nach dem Andocken hängt es als Ketten-Glied dicht hinter dem Kopf.
    expect(dist(spat.position, ctx.mainEnemy.position)).toBeLessThan(ctx.mainEnemy.size * 3);
  });

  it('zwei Abdock-Aktionen spucken zwei Glieder aus, das dritte bleibt Kette', () => {
    const ctx = context();
    for (let i = 0; i < 20; i++) updateLevel2Enemies(ctx);

    ctx.playerJustUndocked = true;
    updateLevel2Enemies(ctx);
    ctx.playerJustUndocked = false;
    for (let i = 0; i < 20; i++) updateLevel2Enemies(ctx);
    ctx.playerJustUndocked = true;
    updateLevel2Enemies(ctx);
    ctx.playerJustUndocked = false;

    expect(ctx.miniEnemies.filter((m) => !isChainSegment(m))).toHaveLength(2);
    expect(ctx.miniEnemies.filter(isChainSegment)).toHaveLength(1);
  });

  it('Abdocken ohne angedockte Glieder tut nichts', () => {
    const ctx = context();
    ctx.miniEnemies = [];
    ctx.playerJustUndocked = true;
    expect(() => updateLevel2Enemies(ctx)).not.toThrow();
  });

  it('das Loch spawnt nach dem Intervall ein neues Glied – die Schlange wird länger', () => {
    const ctx = context();
    ctx.spawnMiniEnemyAt = (p) => {
      const e = createEnemy(p, { speed: 250, size: 98 });
      ctx.miniEnemies.push(e);
      return e;
    };
    const before = ctx.miniEnemies.length;

    // 9 s an Frames (> Spawn-Intervall von 8 s).
    for (let i = 0; i < 60 * 9; i++) updateLevel2Enemies(ctx);

    expect(ctx.miniEnemies.length).toBeGreaterThan(before);
  });
});
