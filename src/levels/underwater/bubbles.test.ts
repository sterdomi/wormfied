import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  renderUnderwaterBubbles,
  spawnTorpedoBubbleBurst,
  _resetTorpedoBubbleBursts,
} from './bubbles';

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

describe('renderUnderwaterBubbles', () => {
  beforeEach(() => _resetTorpedoBubbleBursts());

  it('zeichnet Blasen, ohne zu werfen', () => {
    const { ctx, arcs } = stubCtx();
    expect(() => renderUnderwaterBubbles(ctx, { width: W, height: H, now: 1234 })).not.toThrow();
    expect(arcs.length).toBeGreaterThan(0);
  });

  it('ist zustandslos: gleiche now -> identisches Bild', () => {
    const a = stubCtx();
    const b = stubCtx();
    renderUnderwaterBubbles(a.ctx, { width: W, height: H, now: 5000 });
    renderUnderwaterBubbles(b.ctx, { width: W, height: H, now: 5000 });
    expect(a.arcs).toEqual(b.arcs);
  });

  it('die Blasen steigen: der Median der y-Positionen nimmt über die Zeit ab', () => {
    const t0 = stubCtx();
    const t1 = stubCtx();
    renderUnderwaterBubbles(t0.ctx, { width: W, height: H, now: 0 });
    renderUnderwaterBubbles(t1.ctx, { width: W, height: H, now: 500 });
    // Median statt Mittelwert: robust gegen die eine Blase, die in dem Intervall
    // oben umläuft und unten neu einsetzt.
    const medianY = (arcs: Array<{ y: number }>) => {
      const ys = arcs.map((p) => p.y).sort((a, b) => a - b);
      return ys[Math.floor(ys.length / 2)];
    };
    expect(medianY(t1.arcs)).toBeLessThan(medianY(t0.arcs));
  });

  it('ein Abschuss-Wölkchen fügt kurzzeitig Blasen am Abschussort hinzu', () => {
    spawnTorpedoBubbleBurst(300, 400);
    const t = performance.now();

    const withBurst = stubCtx();
    renderUnderwaterBubbles(withBurst.ctx, { width: W, height: H, now: t + 300 });

    _resetTorpedoBubbleBursts();
    const without = stubCtx();
    renderUnderwaterBubbles(without.ctx, { width: W, height: H, now: t + 300 });

    expect(withBurst.arcs.length).toBeGreaterThan(without.arcs.length);
    const near = withBurst.arcs.filter((p) => Math.hypot(p.x - 300, p.y - 400) < 130);
    expect(near.length).toBeGreaterThan(0);
  });

  it('nach Ablauf der Lebensdauer trägt das Abschuss-Wölkchen nichts mehr bei', () => {
    spawnTorpedoBubbleBurst(300, 400);
    const t = performance.now();

    const expired = stubCtx();
    renderUnderwaterBubbles(expired.ctx, { width: W, height: H, now: t + 4000 });

    _resetTorpedoBubbleBursts();
    const none = stubCtx();
    renderUnderwaterBubbles(none.ctx, { width: W, height: H, now: t + 4000 });

    expect(expired.arcs).toEqual(none.arcs);
  });

  it('zeichnet eine Bläschen-Spur hinter einem fliegenden Projektil', () => {
    const base = stubCtx();
    renderUnderwaterBubbles(base.ctx, { width: W, height: H, now: 1000 });

    const proj = { position: { x: 500, y: 270 }, velocity: { x: 500, y: 0 }, size: 18 };
    const withTrail = stubCtx();
    renderUnderwaterBubbles(withTrail.ctx, {
      width: W,
      height: H,
      now: 1000,
      enemyProjectiles: [proj],
    });

    // Der Grundschleier ist bei gleicher `now` identisch → die zusätzlichen
    // arcs sind genau die Spur.
    expect(withTrail.arcs.length).toBeGreaterThan(base.arcs.length);
    const trailArcs = withTrail.arcs.slice(base.arcs.length);
    expect(trailArcs.length).toBeGreaterThan(0);
    for (const p of trailArcs) {
      // Spur liegt HINTER dem Projektil (fliegt nach +x) …
      expect(p.x).toBeLessThan(500);
      // … und grob auf seiner Flugbahn.
      expect(Math.abs(p.y - 270)).toBeLessThan(60);
    }
  });

  it('ohne Projektile keine Spur', () => {
    const withEmpty = stubCtx();
    renderUnderwaterBubbles(withEmpty.ctx, { width: W, height: H, now: 1000, enemyProjectiles: [] });
    const without = stubCtx();
    renderUnderwaterBubbles(without.ctx, { width: W, height: H, now: 1000 });
    expect(withEmpty.arcs).toEqual(without.arcs);
  });

  it('bleibt vom Zeichenbereich her im Feld (plus Schlängel-Toleranz)', () => {
    for (const now of [0, 250, 800, 3000, 12345]) {
      const { ctx, arcs } = stubCtx();
      renderUnderwaterBubbles(ctx, { width: W, height: H, now });
      for (const p of arcs) {
        expect(p.x).toBeGreaterThan(-40);
        expect(p.x).toBeLessThan(W + 40);
        expect(p.y).toBeGreaterThan(-110);
        expect(p.y).toBeLessThan(H + 110);
      }
    }
  });
});
