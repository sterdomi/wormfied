import { beforeEach, describe, expect, it } from 'vitest';
import { createEnemy, type Enemy } from '../../game/enemy';
import { createRectangularField } from '../../game/field';
import {
  _resetElectric,
  COIL_SECONDS,
  DISCHARGE_SECONDS,
  GAP_PATTERN,
  UNCOIL_SECONDS,
  electricFieldFlash,
  updateElectric,
} from './electric';

const FIELD = createRectangularField(2000, 1400);
const DT = 1 / 60;
/** Fixe Zeit einer Attacke ab Blitz: Rest-Blitz + Ausrollen + Einrollen der nächsten. */
const ATTACK_OVERHEAD = DISCHARGE_SECONDS + UNCOIL_SECONDS + COIL_SECONDS;

function makeHead(): Enemy {
  const e = createEnemy({ x: 1000, y: 700 }, { speed: 250, size: 80 });
  e.direction = { x: 1, y: 0 };
  return e;
}
function makeSegments(n: number): Enemy[] {
  return Array.from({ length: n }, (_, i) =>
    createEnemy({ x: 1000 + i * 10, y: 700 }, { speed: 500, size: 60 }),
  );
}

describe('updateElectric – Strom-Attacke Level 3', () => {
  beforeEach(() => _resetElectric());

  it('schwimmt frei bis zur ersten Pause (GAP_PATTERN[0])', () => {
    const h = makeHead();
    const segs = makeSegments(4);
    for (let i = 0; i < Math.round((GAP_PATTERN[0] - 0.1) / DT); i++) {
      const tick = updateElectric(h, segs, FIELD, DT, i * DT * 1000);
      expect(tick.swimming).toBe(true);
      expect(tick.discharged).toBe(false);
    }
  });

  it('liefert genau ein Discharge-Signal pro Attacke und folgt dem Muster 1,3,5,3 s', () => {
    const h = makeHead();
    const segs = makeSegments(4);
    const dischargeTimes: number[] = [];
    let now = 0;
    // Lang genug für ~7 Attacken (Muster wiederholt sich nach 4).
    const totalSeconds = GAP_PATTERN.reduce((a, b) => a + b, 0) * 2 + ATTACK_OVERHEAD * 8 + 5;
    for (let i = 0; i < Math.round(totalSeconds / DT); i++) {
      now += DT * 1000;
      if (updateElectric(h, segs, FIELD, DT, now).discharged) dischargeTimes.push(now / 1000);
    }

    expect(dischargeTimes.length).toBeGreaterThanOrEqual(6);

    // Erster Blitz: nach Pause[0] + Einrollen.
    expect(Math.abs(dischargeTimes[0] - (GAP_PATTERN[0] + COIL_SECONDS))).toBeLessThan(0.08);

    // Abstand zwischen Blitz k und k+1 = fixe Overhead + Pause[(k+1) % 4].
    for (let k = 0; k + 1 < dischargeTimes.length; k++) {
      const delta = dischargeTimes[k + 1] - dischargeTimes[k];
      const expectedGap = GAP_PATTERN[(k + 1) % GAP_PATTERN.length];
      expect(Math.abs(delta - ATTACK_OVERHEAD - expectedGap)).toBeLessThan(0.08);
    }
  });

  it('legt Kopf + Segmente während des Einrollens auf eine Kreisform', () => {
    const h = makeHead();
    const segs = makeSegments(6);
    let now = 0;
    for (let i = 0; i < Math.round((GAP_PATTERN[0] + COIL_SECONDS * 0.9) / DT); i++) {
      now += DT * 1000;
      updateElectric(h, segs, FIELD, DT, now);
    }
    const center = { ...h.position };
    const radii = segs.map((s) => Math.hypot(s.position.x - center.x, s.position.y - center.y));
    expect(Math.min(...radii)).toBeGreaterThan(20); // vom Kopf abgesetzter Kranz
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(h.size); // grob rund
  });

  it('electricFieldFlash klingt nach dem Blitz über die Wanduhrzeit ab', () => {
    const h = makeHead();
    const segs = makeSegments(4);
    let now = 0;
    for (let i = 0; i < Math.round((GAP_PATTERN[0] + COIL_SECONDS + 0.05) / DT); i++) {
      now += DT * 1000;
      updateElectric(h, segs, FIELD, DT, now);
    }
    expect(electricFieldFlash(now)).toBeGreaterThan(0);
    expect(electricFieldFlash(now + 1000)).toBe(0);
  });
});
