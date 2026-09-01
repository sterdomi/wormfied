import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnemy } from '../../game/enemy';
import type { LevelEnemyAssets, LevelEnemyRenderState } from '../types';
import { _resetSpitPose, spitMiniFromMouth } from './mouthSpit';
import { renderLevel2Enemies } from './render';

/** Minimaler 2D-Context-Stub – zählt nur `drawImage`-Aufrufe. */
function stubCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D & { drawImage: ReturnType<typeof vi.fn> };
}

const img = (): HTMLImageElement => ({}) as HTMLImageElement;

const assets: LevelEnemyAssets = {
  mainEnemy: img(),
  mainEnemyWalk: img(),
  mainEnemyShoot: img(),
  miniEnemy: img(),
  miniEnemyWalk: img(),
};

/** Sprite des letzten `drawImage`-Aufrufs (= der Kopf, zuletzt gezeichnet). */
function lastDrawn(ctx: ReturnType<typeof stubCtx>): unknown {
  const calls = ctx.drawImage.mock.calls;
  return calls[calls.length - 1][0];
}

/** Ein Kopf-Enemy + ein Glied, wie sie `spitMiniFromMouth` erwartet. */
function spitOnce(): void {
  const head = createEnemy({ x: 400, y: 200 }, { speed: 250, size: 130 });
  head.direction = { x: 1, y: 0 };
  spitMiniFromMouth(head, createEnemy({ x: 400, y: 200 }, { speed: 0, size: 98 }), { x: 0, y: 0 });
}

function renderState(overrides: Partial<LevelEnemyRenderState> = {}): LevelEnemyRenderState {
  const mainEnemy = createEnemy({ x: 400, y: 200 }, { speed: 250, size: 130 });
  mainEnemy.direction = { x: 1, y: 0 };
  return {
    mainEnemy,
    miniEnemies: Array.from({ length: 3 }, (_, i) => {
      const e = createEnemy({ x: 400 - 60 * (i + 1), y: 200 }, { speed: 0, size: 98 });
      e.direction = { x: 1, y: 0 };
      return e;
    }),
    mainEnemyScale: 1,
    hideMainEnemy: false,
    useWalkFrame: false,
    now: 1000,
    ...overrides,
  };
}

describe('renderLevel2Enemies', () => {
  beforeEach(() => _resetSpitPose());

  it('zeichnet Kopf + 3 Körperglieder', () => {
    const ctx = stubCtx();
    renderLevel2Enemies(ctx, assets, renderState());
    expect(ctx.drawImage).toHaveBeenCalledTimes(4);
  });

  it('blendet bei hideMainEnemy den Kopf aus (nur Körperglieder)', () => {
    const ctx = stubCtx();
    renderLevel2Enemies(ctx, assets, renderState({ hideMainEnemy: true }));
    expect(ctx.drawImage).toHaveBeenCalledTimes(3);
  });

  it('mit weniger Gliedern entsprechend weniger Sprites', () => {
    const ctx = stubCtx();
    const state = renderState();
    state.miniEnemies = state.miniEnemies.slice(0, 1);
    renderLevel2Enemies(ctx, assets, state);
    expect(ctx.drawImage).toHaveBeenCalledTimes(2); // Kopf + 1 Glied
  });

  it('mit angedockter Kette: der Kopf ist NICHT animiert und zeigt gegner_walk', () => {
    const off = stubCtx();
    const on = stubCtx();
    renderLevel2Enemies(off, assets, renderState({ useWalkFrame: false }));
    renderLevel2Enemies(on, assets, renderState({ useWalkFrame: true }));
    // Kopf = letzter Aufruf – bei Kette immer `gegner_walk`, egal welcher Takt.
    expect(lastDrawn(off)).toBe(assets.mainEnemyWalk);
    expect(lastDrawn(on)).toBe(assets.mainEnemyWalk);
  });

  it('ohne Glieder: der Kopf animiert (Lauf-Takt, gegner ↔ gegner_walk)', () => {
    const off = stubCtx();
    const on = stubCtx();
    renderLevel2Enemies(off, assets, renderState({ miniEnemies: [], useWalkFrame: false }));
    renderLevel2Enemies(on, assets, renderState({ miniEnemies: [], useWalkFrame: true }));
    expect(lastDrawn(off)).toBe(assets.mainEnemy);
    expect(lastDrawn(on)).toBe(assets.mainEnemyWalk);
  });

  it('von der Kette animiert nur der Schwanz, der Rest ist statisch gegner_walk', () => {
    const ctx = stubCtx();
    // useWalkFrame:false → animiertes Glied zeigt `gegner.png`, statische
    // Glieder trotzdem `gegner_walk` – so lassen sie sich unterscheiden.
    renderLevel2Enemies(ctx, assets, renderState({ useWalkFrame: false }));
    const calls = ctx.drawImage.mock.calls;
    expect(calls).toHaveLength(4); // Schwanz, Glied, Glied, Kopf
    expect(calls[0][0]).toBe(assets.miniEnemy); // Schwanz (zuerst gezeichnet), animiert
    expect(calls[1][0]).toBe(assets.miniEnemyWalk); // statisch
    expect(calls[2][0]).toBe(assets.miniEnemyWalk); // statisch
  });

  it('zeigt kurz nach einem Maul-Spuck die Schuss-Pose des Kopfes', () => {
    spitOnce();
    const ctx = stubCtx();
    renderLevel2Enemies(ctx, assets, renderState({ now: performance.now() + 50, useWalkFrame: true }));
    // Kopf = letzter drawImage-Aufruf → Schuss-Sprite statt Walk/Normal.
    expect(lastDrawn(ctx)).toBe(assets.mainEnemyShoot);
  });

  it('nach Ablauf der Schuss-Pose wieder das normale Kopf-Sprite', () => {
    spitOnce();
    const ctx = stubCtx();
    // Ohne Kette, damit „normal" eindeutig das Basis-Sprite ist.
    renderLevel2Enemies(ctx, assets, renderState({ miniEnemies: [], now: performance.now() + 2000 }));
    expect(lastDrawn(ctx)).toBe(assets.mainEnemy);
  });

  it('ohne mainEnemyShoot-Sprite bleibt es beim normalen Kopf', () => {
    spitOnce();
    const ctx = stubCtx();
    const noShoot: LevelEnemyAssets = { ...assets, mainEnemyShoot: undefined };
    renderLevel2Enemies(ctx, noShoot, renderState({ miniEnemies: [], now: performance.now() + 50 }));
    expect(lastDrawn(ctx)).toBe(noShoot.mainEnemy);
  });
});
