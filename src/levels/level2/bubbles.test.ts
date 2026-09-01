import { describe, it, expect, vi } from 'vitest';
import { renderLevel2Bubbles } from './bubbles';

/** 2D-Context-Stub, der die Mittelpunkte aller `arc`-Aufrufe mitschreibt. */
function stubCtx() {
  const arcs: Array<{ x: number; y: number; r: number }> = [];
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn((x: number, y: number, r: number) => arcs.push({ x, y, r })),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, arcs };
}

const W = 960;
const H = 540;

describe('renderLevel2Bubbles', () => {
  it('zeichnet Blasen, ohne zu werfen', () => {
    const { ctx, arcs } = stubCtx();
    expect(() => renderLevel2Bubbles(ctx, { width: W, height: H, now: 1234 })).not.toThrow();
    expect(arcs.length).toBeGreaterThan(0);
  });

  it('ist zustandslos: gleiche now -> identisches Bild', () => {
    const a = stubCtx();
    const b = stubCtx();
    renderLevel2Bubbles(a.ctx, { width: W, height: H, now: 5000 });
    renderLevel2Bubbles(b.ctx, { width: W, height: H, now: 5000 });
    expect(a.arcs).toEqual(b.arcs);
  });

  it('die Blasen steigen: der Median der y-Positionen nimmt über die Zeit ab', () => {
    const t0 = stubCtx();
    const t1 = stubCtx();
    renderLevel2Bubbles(t0.ctx, { width: W, height: H, now: 0 });
    renderLevel2Bubbles(t1.ctx, { width: W, height: H, now: 500 });
    // Median statt Mittelwert: robust gegen die eine Blase, die in dem Intervall
    // oben umläuft und unten neu einsetzt.
    const medianY = (arcs: Array<{ y: number }>) => {
      const ys = arcs.map((p) => p.y).sort((a, b) => a - b);
      return ys[Math.floor(ys.length / 2)];
    };
    expect(medianY(t1.arcs)).toBeLessThan(medianY(t0.arcs));
  });

  it('bleibt vom Zeichenbereich her im Feld (plus Schlängel-Toleranz)', () => {
    for (const now of [0, 250, 800, 3000, 12345]) {
      const { ctx, arcs } = stubCtx();
      renderLevel2Bubbles(ctx, { width: W, height: H, now });
      for (const p of arcs) {
        expect(p.x).toBeGreaterThan(-40);
        expect(p.x).toBeLessThan(W + 40);
        expect(p.y).toBeGreaterThan(-110);
        expect(p.y).toBeLessThan(H + 110);
      }
    }
  });
});
