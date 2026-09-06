import { describe, it, expect, vi } from 'vitest';
import { LIGHTNING_CYCLE_MS, lightningIntensity, renderLevel2Rain } from './rain';

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

/** now-Werte (ms) im ersten Zyklus, an denen ein Blitz die Donner-Schwelle (0.2) neu erreicht. */
function strikeOnsets(): number[] {
  const onsets: number[] = [];
  let armed = true;
  for (let ms = 0; ms < LIGHTNING_CYCLE_MS; ms += 5) {
    const intensity = lightningIntensity(ms);
    if (armed && intensity >= 0.2) {
      onsets.push(ms);
      armed = false;
    } else if (!armed && intensity === 0) {
      armed = true;
    }
  }
  return onsets;
}

describe('renderLevel2Rain', () => {
  it('zeichnet Regenstriche (stroke), ohne zu werfen', () => {
    const s = stubCtx();
    expect(() => renderLevel2Rain(s.ctx, state(1000))).not.toThrow();
    expect(s.strokes).toBeGreaterThan(0);
  });

  it('animiert: die Tropfen-Geometrie ändert sich über die Zeit', () => {
    const a = stubCtx();
    const b = stubCtx();
    renderLevel2Rain(a.ctx, state(0));
    renderLevel2Rain(b.ctx, state(3000));
    expect(a.points).not.toEqual(b.points);
  });

  it('ist bei gleicher now deterministisch', () => {
    const a = stubCtx();
    const b = stubCtx();
    renderLevel2Rain(a.ctx, state(4200));
    renderLevel2Rain(b.ctx, state(4200));
    expect(a.points).toEqual(b.points);
  });

  it('zeichnet den Blitz-Flash (fillRect) nur, wenn gerade einer aktiv ist', () => {
    // Ein Zeitpunkt ganz am Zyklusanfang liegt sicher vor dem ersten Blitz
    // (frühestens nach 3s, siehe `rain.ts`).
    const ruhig = stubCtx();
    renderLevel2Rain(ruhig.ctx, state(50));
    expect(ruhig.fillRects).toBe(0);

    // Irgendwo im Zyklus muss mindestens ein Blitz aktiv sein.
    let sawFlash = false;
    for (let ms = 0; ms < LIGHTNING_CYCLE_MS; ms += 50) {
      const s = stubCtx();
      renderLevel2Rain(s.ctx, state(ms));
      if (s.fillRects > 0) {
        sawFlash = true;
        break;
      }
    }
    expect(sawFlash).toBe(true);
  });
});

describe('Donner zum Blitz', () => {
  // Modul-Zustand (`lastThunderAtMs`) bleibt über die Tests bestehen; jeder Test
  // nutzt darum einen anderen, zeitlich weit auseinanderliegenden Einschlag.
  const onsets = strikeOnsets();

  it('hat im Zyklus mehrere vertonbare Blitz-Einschläge', () => {
    expect(onsets.length).toBeGreaterThan(1);
  });

  it('spielt an einem blitzfreien Zeitpunkt keinen Donner', () => {
    const playLevelSound = vi.fn();
    renderLevel2Rain(stubCtx().ctx, { ...state(50), playLevelSound });
    expect(playLevelSound).not.toHaveBeenCalled();
  });

  it('löst beim Einschlag genau einen `thunder` aus – auch über das Doppel-Zucken hinweg', () => {
    const playLevelSound = vi.fn();
    const onset = onsets[onsets.length - 1];
    for (let now = onset; now < onset + 700; now += 16) {
      renderLevel2Rain(stubCtx().ctx, { width: 960, height: 540, now, playLevelSound });
    }
    expect(playLevelSound).toHaveBeenCalledTimes(1);
    expect(playLevelSound).toHaveBeenCalledWith('thunder');
  });

  it('zeichnet auch ohne `playLevelSound` weiter (Callback ist optional)', () => {
    expect(() => renderLevel2Rain(stubCtx().ctx, state(onsets[0]))).not.toThrow();
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
