import { describe, it, expect } from 'vitest';
import { createEnemy } from './enemy';
import { ENEMY_SPEED, moveEnemy, randomDirection } from './enemyMovement';
import { createRectangularField } from './field';
import { isPointInPolygon } from './polygon';

describe('randomDirection', () => {
  it('liefert einen Einheitsvektor', () => {
    expect(Math.hypot(randomDirection(() => 0.3).x, randomDirection(() => 0.3).y)).toBeCloseTo(1);
  });
});

describe('moveEnemy', () => {
  const field = createRectangularField(400, 300);

  it('bewegt den Gegner delta-time-basiert in seine Richtung, solange er drin bleibt', () => {
    const enemy = createEnemy({ x: 200, y: 150 }, { x: 1, y: 0 });
    moveEnemy(enemy, field, 1, () => 0.5);
    expect(enemy.position.x).toBeCloseTo(200 + ENEMY_SPEED);
    expect(enemy.position.y).toBeCloseTo(150);
  });

  it('bleibt über viele Ticks zuverlässig innerhalb des Polygons', () => {
    const enemy = createEnemy({ x: 200, y: 150 }, { x: 1, y: 0 });
    let seed = 1;
    const rng = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < 3000; i++) {
      moveEnemy(enemy, field, 1 / 30, rng);
      expect(isPointInPolygon(enemy.position, field)).toBe(true);
    }
  });

  it('kehrt an einer Wand die Richtung um, wenn keine Zufallsrichtung passt (Fallback)', () => {
    // Direkt an der rechten Wand, Richtung nach draussen; rng() = 0 → jede
    // gewürfelte Richtung ist (1,0) → alle Versuche scheitern → Umkehr.
    const enemy = createEnemy({ x: 399, y: 150 }, { x: 1, y: 0 });
    moveEnemy(enemy, field, 1, () => 0);
    expect(enemy.direction.x).toBeLessThan(0);
    expect(isPointInPolygon(enemy.position, field)).toBe(true);
  });

  it('bleibt auch für ein nicht-konvexes (verkleinertes) Feld drin', () => {
    const lShaped = [
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      { x: 300, y: 120 },
      { x: 140, y: 120 },
      { x: 140, y: 300 },
      { x: 0, y: 300 },
    ];
    const enemy = createEnemy({ x: 60, y: 60 }, { x: 1, y: 1 });
    for (let i = 0; i < 1500; i++) {
      moveEnemy(enemy, lShaped, 1 / 30, () => Math.random());
      expect(isPointInPolygon(enemy.position, lShaped)).toBe(true);
    }
  });
});
