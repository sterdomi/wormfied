import { describe, it, expect, vi } from 'vitest';
import { LIGHTNING_CYCLE_MS, lightningIntensity, renderLevel1Rain } from './rain';

/** 2D-Context-Stub: zählt Stroke-/Fill-Aufrufe und schreibt Linien-Punkte mit. */
function stubCtx() {
  const points: Array<{ x: number; y: number }> = [];
  let strokes = 0;
  let fillRects = 0;
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn((x: number, y: number) => points.push({ x, y })),
    lineTo: vi.fn((x: number, y: number) => points.push({ x, y })),
    stroke: vi.fn(() => strokes++),
    fillRect: vi.fn(() => fillRects++),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    globalAlpha: 1,
    globalCompositeOperation: '',
  };
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    points,
    get strokes() {
      return strokes;
    },
    get fillRects() {
      return fillRects;
    },
  };
}

const state = (now: number) => ({ width: 960, height: 540, now });

describe('renderLevel1Rain', () => {
  it('zeichnet Regenstriche (stroke), ohne zu werfen', () => {
    const s = stubCtx();
    expect(() => renderLevel1Rain(s.ctx, state(1000))).not.toThrow();
    expect(s.strokes).toBeGreaterThan(0);
  });

  it('animiert: die Tropfen-Geometrie ändert sich über die Zeit', () => {
    const a = stubCtx();
    const b = stubCtx();
    renderLevel1Rain(a.ctx, state(0));
    renderLevel1Rain(b.ctx, state(3000));
    expect(a.points).not.toEqual(b.points);
  });

  it('ist bei gleicher now deterministisch', () => {
    const a = stubCtx();
    const b = stubCtx();
    renderLevel1Rain(a.ctx, state(4200));
    renderLevel1Rain(b.ctx, state(4200));
    expect(a.points).toEqual(b.points);
  });

  it('zeichnet den Blitz-Flash (fillRect) nur, wenn gerade einer aktiv ist', () => {
    // Ein Zeitpunkt ganz am Zyklusanfang liegt sicher vor dem ersten Blitz
    // (frühestens nach 3s, siehe `rain.ts`).
    const ruhig = stubCtx();
    renderLevel1Rain(ruhig.ctx, state(50));
    expect(ruhig.fillRects).toBe(0);

    // Irgendwo im Zyklus muss mindestens ein Blitz aktiv sein.
    let sawFlash = false;
    for (let ms = 0; ms < LIGHTNING_CYCLE_MS; ms += 50) {
      const s = stubCtx();
      renderLevel1Rain(s.ctx, state(ms));
      if (s.fillRects > 0) {
        sawFlash = true;
        break;
      }
    }
    expect(sawFlash).toBe(true);
  });
});

describe('lightningIntensity', () => {
  it('ist kurz nach Levelstart 0 (kein Sofort-Blitz)', () => {
    expect(lightningIntensity(0)).toBe(0);
    expect(lightningIntensity(500)).toBe(0);
  });

  it('ist über den Zyklus verteilt meistens 0 – Blitze sind selten', () => {
    let activeSamples = 0;
    let totalSamples = 0;
    for (let ms = 0; ms < LIGHTNING_CYCLE_MS; ms += 50) {
      totalSamples++;
      if (lightningIntensity(ms) > 0) activeSamples++;
    }
    expect(activeSamples).toBeGreaterThan(0);
    expect(activeSamples / totalSamples).toBeLessThan(0.1);
  });

  it('liefert Werte zwischen 0 und 1', () => {
    for (let ms = 0; ms < LIGHTNING_CYCLE_MS; ms += 25) {
      const intensity = lightningIntensity(ms);
      expect(intensity).toBeGreaterThanOrEqual(0);
      expect(intensity).toBeLessThanOrEqual(1);
    }
  });

  it('wiederholt sich nach LIGHTNING_CYCLE_MS', () => {
    expect(lightningIntensity(1234)).toBe(lightningIntensity(1234 + LIGHTNING_CYCLE_MS));
  });
});
