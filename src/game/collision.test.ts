import { describe, it, expect } from 'vitest';
import {
  checkLineCollision,
  checkUnshieldedPlayerCollision,
  ENEMY_TOUCH_RADIUS,
} from './collision';
import type { DrawnLine } from './line';

const line: DrawnLine = {
  points: [
    { x: 100, y: 100 },
    { x: 100, y: 300 },
    { x: 260, y: 300 },
  ],
};

describe('checkLineCollision', () => {
  it('erkennt einen Gegner exakt auf der Linie', () => {
    expect(checkLineCollision({ x: 100, y: 200 }, line)).toBe(true); // Mitte des 1. Segments
    expect(checkLineCollision({ x: 180, y: 300 }, line)).toBe(true); // auf dem 2. Segment
  });

  it('erkennt einen Gegner knapp neben der Linie (innerhalb des Radius)', () => {
    expect(checkLineCollision({ x: 100 + ENEMY_TOUCH_RADIUS - 1, y: 200 }, line)).toBe(true);
  });

  it('meldet keine Kollision für einen weit entfernten Gegner', () => {
    expect(checkLineCollision({ x: 400, y: 50 }, line)).toBe(false);
    expect(checkLineCollision({ x: 100 + ENEMY_TOUCH_RADIUS + 2, y: 200 }, line)).toBe(false);
  });

  it('berücksichtigt den optionalen Kopf-Punkt (Spielerposition)', () => {
    expect(checkLineCollision({ x: 300, y: 300 }, line)).toBe(false);
    expect(
      checkLineCollision({ x: 300, y: 300 }, line, ENEMY_TOUCH_RADIUS, { x: 340, y: 300 }),
    ).toBe(true);
  });

  it('behandelt eine Ein-Punkt-Linie (gerade gestartet)', () => {
    const dot: DrawnLine = { points: [{ x: 50, y: 50 }] };
    expect(checkLineCollision({ x: 52, y: 50 }, dot)).toBe(true);
    expect(checkLineCollision({ x: 200, y: 200 }, dot)).toBe(false);
  });
});

describe('checkUnshieldedPlayerCollision', () => {
  const player = { x: 200, y: 200 };
  const near = { x: 203, y: 200 }; // < ENEMY_TOUCH_RADIUS entfernt
  const far = { x: 400, y: 200 };

  it('löst nur bei aufgebrauchtem Schild aus', () => {
    expect(checkUnshieldedPlayerCollision(near, player, 50)).toBe(false); // Schild noch da
    expect(checkUnshieldedPlayerCollision(near, player, 0)).toBe(true);
  });

  it('braucht auch bei leerem Schild einen nahen Gegner', () => {
    expect(checkUnshieldedPlayerCollision(far, player, 0)).toBe(false);
  });

  it('behandelt Grenzfälle des Schilds', () => {
    expect(checkUnshieldedPlayerCollision(near, player, 0.1)).toBe(false);
    expect(checkUnshieldedPlayerCollision(near, player, -5)).toBe(true);
  });
});
