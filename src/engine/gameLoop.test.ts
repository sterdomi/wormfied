import { describe, it, expect, vi, afterEach } from 'vitest';
import { createGameLoop } from './gameLoop';

/**
 * Steuerbarer requestAnimationFrame-Ersatz: Frames werden manuell mit einer
 * frei wählbaren Zeitmarke (ms) ausgelöst, damit Delta-Time deterministisch
 * prüfbar ist.
 */
function stubRaf() {
  let queued: FrameRequestCallback | null = null;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    queued = cb;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    queued = null;
  });
  return {
    tick(nowMs: number): void {
      const cb = queued;
      queued = null;
      cb?.(nowMs);
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

const noopCtx = {} as CanvasRenderingContext2D;

describe('createGameLoop', () => {
  it('ruft update mit dt=0 im ersten Frame und danach mit der Frame-Zeit in Sekunden', () => {
    const raf = stubRaf();
    const update = vi.fn();
    const render = vi.fn();

    const loop = createGameLoop(noopCtx, { update, render });
    loop.start();

    raf.tick(1000); // erster Frame: keine Referenzzeit -> dt 0
    raf.tick(1016); // +16 ms
    raf.tick(1032); // +16 ms

    expect(update.mock.calls.map(([dt]) => dt)).toEqual([0, 0.016, 0.016]);
    expect(render).toHaveBeenCalledTimes(3);
    expect(render).toHaveBeenLastCalledWith(noopCtx);
  });

  it('klammert grosse Frame-Sprünge (Tab-Wechsel) auf MAX_DT', () => {
    const raf = stubRaf();
    const update = vi.fn();

    const loop = createGameLoop(noopCtx, { update, render: vi.fn() });
    loop.start();

    raf.tick(0);
    raf.tick(5000); // 5 s Pause

    expect(update.mock.calls[1]?.[0]).toBeCloseTo(1 / 15);
  });

  it('stoppt den Loop: nach stop() folgen keine update-Aufrufe mehr', () => {
    const raf = stubRaf();
    const update = vi.fn();

    const loop = createGameLoop(noopCtx, { update, render: vi.fn() });
    loop.start();
    raf.tick(1000);
    expect(loop.running).toBe(true);

    loop.stop();
    raf.tick(1016);

    expect(loop.running).toBe(false);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
