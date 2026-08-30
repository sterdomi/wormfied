import { describe, it, expect } from 'vitest';
import { createRectangularField } from '../../game/field';
import { isPointInPolygon } from '../../game/polygon';
import {
  advanceSnakeHead,
  createSnakeHeadState,
  SNAKE_MAX_TURN_RATE_RAD_PER_SEC,
} from './snakeMovement';

const FIELD = createRectangularField(600, 400);
const MARGIN = 60;
const SPEED = 250;
const DT = 1 / 60;

const angleOf = (v: { x: number; y: number }): number => Math.atan2(v.y, v.x);

describe('advanceSnakeHead', () => {
  it('hält den Kopf über viele Frames im Feld-Polygon', () => {
    const state = createSnakeHeadState({ x: 1, y: 0 });
    let pos = { x: 300, y: 200 };
    for (let i = 0; i < 5000; i++) {
      // deterministische, aber wechselnde Zufallswerte
      const rng = (): number => ((i * 37) % 100) / 100;
      pos = advanceSnakeHead(pos, state, FIELD, MARGIN, SPEED, DT, rng);
      expect(isPointInPolygon(pos, FIELD)).toBe(true);
    }
  });

  it('dreht am Rand weg, statt aus dem Feld zu laufen', () => {
    const state = createSnakeHeadState({ x: 1, y: 0 });
    // Dicht an der rechten Wand, genau darauf zu.
    let pos = { x: 600 - MARGIN - 2, y: 200 };
    let maxX = pos.x;
    for (let i = 0; i < 200; i++) {
      pos = advanceSnakeHead(pos, state, FIELD, MARGIN, SPEED, DT, () => 0.5);
      expect(isPointInPolygon(pos, FIELD)).toBe(true);
      maxX = Math.max(maxX, pos.x);
    }
    // Der Kopf ist nicht stur weiter in die rechte Wand gelaufen – er bleibt
    // (bis auf einen Frame Toleranz) hinter dem Sicherheitsabstand.
    expect(maxX).toBeLessThanOrEqual(600 - MARGIN + 1);
  });

  it('überquert die aktive Zeichenlinie nicht (sie wirkt wie eine Wand)', () => {
    const state = createSnakeHeadState({ x: 1, y: 0 });
    // Senkrechte Linie bei x = 400, quer zum nach rechts laufenden Kopf.
    const line = [
      { x: 400, y: 0 },
      { x: 400, y: 400 },
    ];
    let pos = { x: 360, y: 200 };
    for (let i = 0; i < 600; i++) {
      pos = advanceSnakeHead(pos, state, FIELD, MARGIN, SPEED, DT, () => 0.5, line);
      expect(isPointInPolygon(pos, FIELD)).toBe(true);
      expect(pos.x).toBeLessThanOrEqual(400);
    }
  });

  it('begrenzt die Drehrate pro Frame', () => {
    const state = createSnakeHeadState({ x: 1, y: 0 });
    // Abbiege-Impuls sofort erzwingen, mit maximalem Ziel-Winkel (rng ~ 1).
    state.timeUntilTurn = 0;
    const before = angleOf(state.heading);

    advanceSnakeHead({ x: 300, y: 200 }, state, FIELD, MARGIN, SPEED, DT, () => 0.999);

    const delta = Math.abs(
      Math.atan2(Math.sin(angleOf(state.heading) - before), Math.cos(angleOf(state.heading) - before)),
    );
    expect(delta).toBeLessThanOrEqual(SNAKE_MAX_TURN_RATE_RAD_PER_SEC * DT + 1e-9);
    expect(delta).toBeGreaterThan(0);
  });
});
