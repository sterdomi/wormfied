import { describe, it, expect, vi } from 'vitest';
import { createEnemy } from '../../game/enemy';
import type { LevelEnemyAssets, LevelEnemyRenderState } from '../types';
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
  miniEnemy: img(),
  miniEnemyWalk: img(),
};

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

  it('nutzt die Walk-Frames, wenn useWalkFrame gesetzt ist', () => {
    const ctx = stubCtx();
    renderLevel2Enemies(ctx, assets, renderState({ useWalkFrame: true }));
    // Erster gezeichneter Sprite ist der Walk-Frame eines Körperglieds.
    expect(ctx.drawImage).toHaveBeenCalledTimes(4);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(assets.miniEnemyWalk);
    expect(ctx.drawImage.mock.calls[3][0]).toBe(assets.mainEnemyWalk);
  });
});
