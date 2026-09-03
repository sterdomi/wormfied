import { describe, expect, it } from 'vitest';
import { createEnemy, type Enemy } from '../../game/enemy';
import { createRectangularField } from '../../game/field';
import { peekDrumming, updateDrumming } from './drumming';

const FIELD = createRectangularField(960, 540);
const DT = 1 / 60;

function gorilla(): Enemy {
  return createEnemy({ x: 0, y: 0 }, { speed: 0, size: 130 });
}

describe('updateDrumming – trommelnder Gorilla (Level 4)', () => {
  it('setzt den Gorilla unten in die Feldmitte', () => {
    const g = gorilla();
    updateDrumming(g, FIELD, DT);
    expect(g.position.x).toBeCloseTo(480, 0);
    expect(g.position.y).toBeGreaterThan(300); // untere Feldhälfte
    expect(g.position.y).toBeLessThan(540);
  });

  it('läuft das Rhythmus-Muster ab (verschiedene Frames inkl. aller Schlag-Posen)', () => {
    const g = gorilla();
    const frames = new Set<string>();
    let hits = 0;
    for (let i = 0; i < Math.round(12 / DT); i++) {
      updateDrumming(g, FIELD, DT);
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
      updateDrumming(g, FIELD, DT);
      if (peekDrumming(g)!.hit) {
        run += 1;
        maxRun = Math.max(maxRun, run);
      } else {
        run = 0;
      }
    }
    expect(maxRun).toBe(1);
  });

  it('folgt der schrumpfenden Fläche: Gorilla bleibt unten mittig in der aktiven Bbox', () => {
    const g = gorilla();
    // Halbes Feld (rechte Hälfte „erobert" weggedacht → aktive linke Hälfte).
    const half = [
      { x: 0, y: 0 },
      { x: 480, y: 0 },
      { x: 480, y: 400 },
      { x: 0, y: 400 },
    ];
    updateDrumming(g, half, DT);
    expect(g.position.x).toBeCloseTo(240, 0);
    expect(g.position.y).toBeCloseTo(400 - 130, 0);
  });
});
