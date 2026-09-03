import { beforeEach, describe, expect, it } from 'vitest';
import {
  _resetShockwave,
  advanceShockwave,
  MAX_RADIUS,
  peekShockwave,
  SHOCKWAVE_ORIGIN,
  triggerShockwave,
} from './shockwave';

const DT = 1 / 60;

/** Punkt in Abstand `d` vom Wellen-Ursprung (nach oben ins Feld). */
function pointAtDistance(d: number): { x: number; y: number } {
  return { x: SHOCKWAVE_ORIGIN.x, y: SHOCKWAVE_ORIGIN.y - d };
}

/** Welle so lange fortschreiben, bis sie verpufft; zählt die Treffer-Frames. */
function runWave(target: { x: number; y: number }): number {
  let hits = 0;
  for (let i = 0; i < 2000; i++) {
    if (advanceShockwave(DT, target)) hits++;
    if (!peekShockwave().active) break;
  }
  return hits;
}

describe('Schockwelle (Level 4)', () => {
  beforeEach(() => {
    _resetShockwave();
  });

  it('tut ohne `triggerShockwave` nichts', () => {
    expect(advanceShockwave(DT, pointAtDistance(10))).toBe(false);
    expect(peekShockwave().active).toBe(false);
  });

  it('trifft einen Spieler im inneren Bereich genau einmal', () => {
    triggerShockwave();
    expect(runWave(pointAtDistance(MAX_RADIUS * 0.5))).toBe(1);
  });

  it('erreicht einen Spieler ausserhalb der Reichweite nie', () => {
    triggerShockwave();
    expect(runWave(pointAtDistance(MAX_RADIUS + 40))).toBe(0);
  });

  it('überstreicht das ganze Spielfeld (auch die entfernteste Ecke)', () => {
    triggerShockwave();
    // Ecke oben links – der am weitesten vom Ursprung entfernte Feldpunkt.
    expect(runWave({ x: 0, y: 0 })).toBe(1);
  });

  it('trifft erst, wenn der Ring gross genug ist', () => {
    triggerShockwave();
    const target = pointAtDistance(200);
    let hitAt = -1;
    for (let i = 0; i < 2000 && peekShockwave().active; i++) {
      if (advanceShockwave(DT, target)) {
        hitAt = peekShockwave().radius;
        break;
      }
    }
    expect(hitAt).toBeGreaterThanOrEqual(200);
    expect(hitAt).toBeLessThan(200 + 20);
  });

  it('verpufft nach `MAX_RADIUS`', () => {
    triggerShockwave();
    runWave(pointAtDistance(MAX_RADIUS + 40));
    expect(peekShockwave().active).toBe(false);
  });

  it('eine neue Welle trifft denselben Spieler wieder', () => {
    triggerShockwave();
    expect(runWave(pointAtDistance(120))).toBe(1);
    triggerShockwave();
    expect(runWave(pointAtDistance(120))).toBe(1);
  });
});
