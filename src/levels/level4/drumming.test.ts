import { describe, expect, it } from 'vitest';
import { createEnemy, type Enemy } from '../../game/enemy';
import {
  FIELD_H,
  FIELD_W,
  peekDrumming,
  SLAM_GAP_PATTERN,
  SLAM_STRIKE_SECONDS,
  SLAM_WINDUP_SECONDS,
  updateDrumming,
} from './drumming';

const DT = 1 / 60;

function gorilla(): Enemy {
  return createEnemy({ x: 0, y: 0 }, { speed: 0, size: 130 });
}

describe('updateDrumming – trommelnder Gorilla (Level 4)', () => {
  it('setzt den Gorilla auf einen festen Platz unten in der Feldmitte', () => {
    const g = gorilla();
    updateDrumming(g, DT);
    expect(g.position.x).toBeCloseTo(FIELD_W / 2, 0);
    expect(g.position.y).toBeGreaterThan(FIELD_H * 0.6);
    expect(g.position.y).toBeLessThanOrEqual(FIELD_H * 0.8);
  });

  it('grooved mit Einzelschlägen und schlägt dazwischen doppelt (alle Frames kommen vor)', () => {
    const g = gorilla();
    const frames = new Set<string>();
    let hits = 0;
    for (let i = 0; i < Math.round(14 / DT); i++) {
      updateDrumming(g, DT);
      const s = peekDrumming(g)!;
      frames.add(s.frame);
      if (s.hit) hits++;
    }
    for (const f of ['bereit', 'haende_hoch', 'schlag_links', 'schlag_rechts', 'schlag_beide']) {
      expect(frames.has(f)).toBe(true);
    }
    expect(hits).toBeGreaterThan(10);
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

  it('die Doppelschläge folgen dem Abstands-Muster 1, 3, 5, 3 s', () => {
    const g = gorilla();
    const slamTimes: number[] = [];
    let now = 0;
    for (let i = 0; i < Math.round(40 / DT); i++) {
      now += DT;
      updateDrumming(g, DT);
      if (peekDrumming(g)!.shockwave) slamTimes.push(now);
    }
    expect(slamTimes.length).toBeGreaterThanOrEqual(6);
    // Erster Doppelschlag: nach Pause[0] + Ausholen.
    expect(Math.abs(slamTimes[0] - (SLAM_GAP_PATTERN[0] + SLAM_WINDUP_SECONDS))).toBeLessThan(0.1);
    // Abstand Schlag k -> k+1 = Rest-Schlag + Groove-Pause[(k+1) % 4] + Ausholen.
    const overhead = SLAM_STRIKE_SECONDS + SLAM_WINDUP_SECONDS;
    for (let k = 0; k + 1 < slamTimes.length; k++) {
      const delta = slamTimes[k + 1] - slamTimes[k];
      const expectedGap = SLAM_GAP_PATTERN[(k + 1) % SLAM_GAP_PATTERN.length];
      expect(Math.abs(delta - overhead - expectedGap)).toBeLessThan(0.12);
    }
  });
});
