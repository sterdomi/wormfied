import { describe, it, expect, vi } from 'vitest';
import { renderLevel2Water } from './water';

/** 2D-Context-Stub: zählt Fill-Aufrufe und schreibt Polygon-Eckpunkte mit. */
function stubCtx() {
  const points: Array<{ x: number; y: number }> = [];
  let fillRects = 0;
  let fills = 0;
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn((x: number, y: number) => points.push({ x, y })),
    lineTo: vi.fn((x: number, y: number) => points.push({ x, y })),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(() => fills++),
    stroke: vi.fn(),
    fillRect: vi.fn(() => fillRects++),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalCompositeOperation: '',
  };
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    points,
    get fillRects() {
      return fillRects;
    },
    get fills() {
      return fills;
    },
  };
}

const state = (now: number) => ({ width: 960, height: 540, now });

describe('renderLevel2Water', () => {
  it('zeichnet Grading (fillRect) + Godrays (fill) + Blasen (arc), ohne zu werfen', () => {
    const s = stubCtx();
    expect(() => renderLevel2Water(s.ctx, state(1000))).not.toThrow();
    // Tiefen-Verlauf + Oberflächen-Schimmer.
    expect(s.fillRects).toBeGreaterThanOrEqual(2);
    // Mindestens ein Lichtschacht.
    expect(s.fills).toBeGreaterThan(0);
    expect((s.ctx.arc as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
  });

  it('die Godrays animieren: die Schacht-Geometrie ändert sich über die Zeit', () => {
    const a = stubCtx();
    const b = stubCtx();
    renderLevel2Water(a.ctx, state(0));
    renderLevel2Water(b.ctx, state(9000));
    expect(a.points).not.toEqual(b.points);
  });

  it('ist bei gleicher now deterministisch', () => {
    const a = stubCtx();
    const b = stubCtx();
    renderLevel2Water(a.ctx, state(4200));
    renderLevel2Water(b.ctx, state(4200));
    expect(a.points).toEqual(b.points);
  });
});
