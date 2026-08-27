import { describe, it, expect } from 'vitest';
import { ENEMY_LINE_TOUCH_RADIUS, enemyTouchesLine } from './collision';
import type { DrawnLine } from './line';

const line: DrawnLine = {
  points: [
    { x: 100, y: 100 },
    { x: 100, y: 300 },
    { x: 260, y: 300 },
  ],
};

describe('enemyTouchesLine', () => {
  it('erkennt einen Gegner exakt auf der Linie', () => {
    expect(enemyTouchesLine({ x: 100, y: 200 }, line)).toBe(true); // Mitte des 1. Segments
    expect(enemyTouchesLine({ x: 180, y: 300 }, line)).toBe(true); // auf dem 2. Segment
  });

  it('erkennt einen Gegner knapp neben der Linie (innerhalb des Radius)', () => {
    expect(enemyTouchesLine({ x: 100 + ENEMY_LINE_TOUCH_RADIUS - 1, y: 200 }, line)).toBe(true);
  });

  it('meldet keine Kollision für einen weit entfernten Gegner', () => {
    expect(enemyTouchesLine({ x: 400, y: 50 }, line)).toBe(false);
    expect(enemyTouchesLine({ x: 100 + ENEMY_LINE_TOUCH_RADIUS + 2, y: 200 }, line)).toBe(false);
  });

  it('berücksichtigt den optionalen Kopf-Punkt (Spielerposition)', () => {
    // Ohne head endet die Linie bei (260,300); (300,300) liegt zu weit weg.
    expect(enemyTouchesLine({ x: 300, y: 300 }, line)).toBe(false);
    // Mit head bis (340,300) liegt (300,300) auf dem verlängerten Segment.
    expect(
      enemyTouchesLine({ x: 300, y: 300 }, line, ENEMY_LINE_TOUCH_RADIUS, { x: 340, y: 300 }),
    ).toBe(true);
  });

  it('behandelt eine Ein-Punkt-Linie (gerade gestartet)', () => {
    const dot: DrawnLine = { points: [{ x: 50, y: 50 }] };
    expect(enemyTouchesLine({ x: 52, y: 50 }, dot)).toBe(true);
    expect(enemyTouchesLine({ x: 200, y: 200 }, dot)).toBe(false);
  });
});
