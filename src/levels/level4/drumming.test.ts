import { describe, expect, it } from 'vitest';
import { createEnemy, type Enemy } from '../../game/enemy';
import { FIELD_H, FIELD_W, peekDrumming, updateDrumming } from './drumming';

const DT = 1 / 60;

function gorilla(): Enemy {
  return createEnemy({ x: 0, y: 0 }, { speed: 0, size: 130 });
}

describe('updateDrumming – trommelnder Gorilla (Level 4)', () => {
  it('setzt den Gorilla auf einen festen Platz unten in der Feldmitte', () => {
    const g = gorilla();
    updateDrumming(g, DT);
    expect(g.position.x).toBeCloseTo(FIELD_W / 2, 0);
    // Bodennah, aber noch im bespielbaren oberen 80 % (unter der schwarzen Linie
    // beginnt der gesperrte Bereich bei 0.8·H).
    expect(g.position.y).toBeGreaterThan(FIELD_H * 0.6);
    expect(g.position.y).toBeLessThanOrEqual(FIELD_H * 0.8);
  });

  it('läuft das Rhythmus-Muster ab (verschiedene Frames inkl. aller Schlag-Posen)', () => {
    const g = gorilla();
    const frames = new Set<string>();
    let hits = 0;
    for (let i = 0; i < Math.round(12 / DT); i++) {
      updateDrumming(g, DT);
      const s = peekDrumming(g)!;
      frames.add(s.frame);
      if (s.hit) hits++;
    }
    for (const f of ['bereit', 'haende_hoch', 'schlag_links', 'schlag_rechts', 'schlag_beide']) {
      expect(frames.has(f)).toBe(true);
    }
    expect(hits).toBeGreaterThan(5);
  });

  it('meldet jeden Schlag als EIN `hit`-Frame (Flanke, nicht durchgehend)', () => {
    const g = gorilla();
    let run = 0;
    let maxRun = 0;
    for (let i = 0; i < Math.round(8 / DT); i++) {
      updateDrumming(g, DT);
      if (peekDrumming(g)!.hit) {
        run += 1;
        maxRun = Math.max(maxRun, run);
      } else {
        run = 0;
      }
    }
    expect(maxRun).toBe(1);
  });
});
