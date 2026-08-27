import { describe, it, expect } from 'vitest';
import { DRAW_SPEED } from './drawing';
import type { DrawnLine } from './line';
import { advanceSpark, createSpark, SPARK_SPEED } from './spark';

// Gerade Linie entlang der x-Achse: p0 = (0,0), p1 = (200,0), Kopf = (300,0).
const line: DrawnLine = {
  points: [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
  ],
};
const head = { x: 300, y: 0 };

describe('SPARK_SPEED', () => {
  it('ist doppelt so schnell wie das Zeichnen', () => {
    expect(SPARK_SPEED).toBe(DRAW_SPEED * 2);
  });
});

describe('createSpark', () => {
  it('startet am der Gegnerposition nächsten Punkt der Linie', () => {
    const spark = createSpark(line, head, { x: 50, y: 25 });
    expect(spark.distance).toBeCloseTo(50);
    expect(spark.position).toEqual({ x: 50, y: 0 });
  });
});

describe('advanceSpark', () => {
  it('fährt SPARK_SPEED px/s die Linie entlang Richtung Kopf', () => {
    const spark = createSpark(line, head, { x: 0, y: 0 });
    const hit = advanceSpark(spark, line, head, 0.1);
    expect(spark.distance).toBeCloseTo(SPARK_SPEED * 0.1);
    expect(spark.position.x).toBeCloseTo(SPARK_SPEED * 0.1);
    expect(hit).toBe(false);
  });

  it('meldet einen Treffer, sobald der Ball den Kopf (innerhalb des Radius) erreicht', () => {
    const spark = createSpark(line, head, { x: 260, y: 0 });
    let hit = false;
    let steps = 0;
    for (; steps < 100 && !hit; steps++) hit = advanceSpark(spark, line, head, 1 / 60);
    expect(hit).toBe(true);
    expect(steps).toBeGreaterThan(1); // hat sich erst hinbewegen müssen
    expect(spark.position.x).toBeGreaterThan(289); // dicht am Kopf (300)
  });

  it('holt einen mit Zeichengeschwindigkeit fliehenden Spieler ein', () => {
    const l: DrawnLine = { points: [{ x: 0, y: 0 }] };
    let h = { x: 120, y: 0 };
    const spark = createSpark(l, h, { x: 0, y: 0 });

    let hit = false;
    for (let i = 0; i < 1000 && !hit; i++) {
      h = { x: h.x + DRAW_SPEED * (1 / 60), y: 0 }; // Spieler flieht mit 1×
      hit = advanceSpark(spark, l, h, 1 / 60);
    }
    expect(hit).toBe(true);
  });
});
