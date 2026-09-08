import { beforeEach, describe, expect, it } from 'vitest';
import { createEnemy, type Enemy } from '../../game/enemy';
import { createRectangularField, type Point } from '../../game/field';
import { fitsInPolygon } from '../../game/enemyMovement';
import { BODY_MINI_SCALE } from '../../game/snakeBody';
import {
  _resetElectric,
  COIL_SECONDS,
  DISCHARGE_SECONDS,
  GAP_PATTERN,
  UNCOIL_SECONDS,
  electricCoilScale,
  electricFieldFlash,
  electricForegroundBlackout,
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

  it('legt Kopf + Segmente beim Einrollen auf eine Kreisform', () => {
    const h = makeHead();
    const segs = makeSegments(6);
    let now = 0;
    for (let i = 0; i < Math.round((GAP_PATTERN[0] + COIL_SECONDS + 0.02) / DT); i++) {
      now += DT * 1000;
      updateElectric(h, segs, FIELD, DT, now);
    }
    const center = { ...h.position };
    const radii = segs.map((s) => Math.hypot(s.position.x - center.x, s.position.y - center.y));
    expect(Math.min(...radii)).toBeGreaterThan(20); // vom Kopf abgesetzter Kranz
    // Alle Glieder – auch das letzte (Schwanz) – auf ~demselben Radius.
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(2);
  });

  it('verteilt alle Glieder gleichmässig auf dem Kreis (auch den Schwanz)', () => {
    const h = makeHead();
    const n = 7;
    const segs = makeSegments(n);
    let now = 0;
    for (let i = 0; i < Math.round((GAP_PATTERN[0] + COIL_SECONDS + 0.02) / DT); i++) {
      now += DT * 1000;
      updateElectric(h, segs, FIELD, DT, now);
    }
    const center = { ...h.position };
    const angles = segs
      .map((s) => Math.atan2(s.position.y - center.y, s.position.x - center.x))
      .sort((a, b) => a - b);
    const gaps = angles.map((a, i) => {
      const next = i + 1 < angles.length ? angles[i + 1] : angles[0] + Math.PI * 2;
      return next - a;
    });
    const expectedGap = (Math.PI * 2) / n;
    for (const g of gaps) expect(Math.abs(g - expectedGap)).toBeLessThan(0.05);
  });

  it('schrumpft den Kranz bei Einkreisung, sodass kein Körperglied durch eine Linie ragt', () => {
    const h = makeHead(); // Position (1000,700), size 80
    const segs = makeSegments(9);
    // Enges Pocket-Polygon um den Kopf (wie nach dem Einkreisen: `field` ist
    // bereits das kleine, von den Zeichenlinien begrenzte Feld).
    const pocket: Point[] = [
      { x: 880, y: 580 },
      { x: 1120, y: 580 },
      { x: 1120, y: 820 },
      { x: 880, y: 820 },
    ];
    // Körperteil-Radius im Kranz (alle Glieder gleich gross, kein TAIL_RENDER_SCALE).
    const overhang = (h.size * BODY_MINI_SCALE) / 2;

    let now = 0;
    for (let i = 0; i < Math.round((GAP_PATTERN[0] + COIL_SECONDS + DISCHARGE_SECONDS) / DT); i++) {
      now += DT * 1000;
      updateElectric(h, segs, pocket, DT, now);
    }

    // Kranz geschrumpft (frei wären es 80 * 1.35 = 108 px Radius).
    expect(electricCoilScale()).toBeLessThan(1);
    const center = { ...h.position };
    const radii = segs.map((s) => Math.hypot(s.position.x - center.x, s.position.y - center.y));
    expect(Math.max(...radii)).toBeLessThan(108);

    // Kein Körperglied (mit voller Sprite-Ausdehnung) ragt aus dem Pocket.
    for (const s of segs) {
      expect(fitsInPolygon(s.position, pocket, overhang)).toBe(true);
    }
  });

  it('setzt die Kreismitte bei nicht-konvexem Feld nicht in die Aussparung (Kopf bleibt in seiner Kammer)', () => {
    // U-förmiges Feld (wie nach mehreren Eroberungen); der Kopf sitzt im linken
    // Pfeiler. `clampToField` zieht Richtung Bounding-Box-Mitte – die läge in
    // der Aussparung; der Aal darf trotzdem nicht dorthin „springen".
    const uField: Point[] = [
      { x: 0, y: 0 },
      { x: 1200, y: 0 },
      { x: 1200, y: 1000 },
      { x: 800, y: 1000 },
      { x: 800, y: 300 },
      { x: 400, y: 300 },
      { x: 400, y: 1000 },
      { x: 0, y: 1000 },
    ];
    const inNotch = (p: Point): boolean => p.x > 400 && p.x < 800 && p.y > 300;
    const h = createEnemy({ x: 200, y: 700 }, { speed: 250, size: 80 });
    h.direction = { x: 0, y: -1 };
    const segs = makeSegments(7).map((s, i) => {
      s.position = { x: 200, y: 700 + i * 10 };
      return s;
    });

    let now = 0;
    for (let i = 0; i < Math.round((GAP_PATTERN[0] + COIL_SECONDS + DISCHARGE_SECONDS + 0.1) / DT); i++) {
      now += DT * 1000;
      updateElectric(h, segs, uField, DT, now);
      expect(inNotch(h.position)).toBe(false);
      for (const s of segs) expect(inNotch(s.position)).toBe(false);
    }
  });

  it('macht den Foreground schwarz: blackout 0 beim Schwimmen, 1 beim Blitz', () => {
    const h = makeHead();
    const segs = makeSegments(4);
    updateElectric(h, segs, FIELD, DT, 0);
    expect(electricForegroundBlackout()).toBe(0);
    let now = 0;
    for (let i = 0; i < Math.round((GAP_PATTERN[0] + COIL_SECONDS + 0.02) / DT); i++) {
      now += DT * 1000;
      updateElectric(h, segs, FIELD, DT, now);
    }
    expect(electricForegroundBlackout()).toBe(1);
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
