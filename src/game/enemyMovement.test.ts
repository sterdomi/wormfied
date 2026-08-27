import { describe, it, expect } from 'vitest';
import { createEnemy, enemyFacingAngle, type EnemySpec } from './enemy';
import { ENEMY_SPEED, moveEnemies, moveEnemy, randomDirection } from './enemyMovement';
import { createRectangularField } from './field';
import { isPointInPolygon } from './polygon';

const MAIN: EnemySpec = { speed: ENEMY_SPEED, size: 40 };
const MINI: EnemySpec = { speed: ENEMY_SPEED * 1.5, size: 22 };

describe('randomDirection', () => {
  it('liefert einen Einheitsvektor', () => {
    expect(Math.hypot(randomDirection(() => 0.3).x, randomDirection(() => 0.3).y)).toBeCloseTo(1);
  });
});

describe('enemyFacingAngle', () => {
  // Sprite-Kopf zeigt lokal nach oben (0, -1). Dreht man ihn um den Winkel,
  // muss (0,-1) auf die Bewegungsrichtung fallen.
  const rotatedUp = (angle: number) => ({
    x: Math.sin(angle),
    y: -Math.cos(angle),
  });

  it('richtet den (nach oben schauenden) Sprite auf die Bewegungsrichtung aus', () => {
    for (const dir of [
      { x: 0, y: -1 }, // hoch
      { x: 1, y: 0 }, // rechts
      { x: 0, y: 1 }, // runter
      { x: -1, y: 0 }, // links
      { x: 0.6, y: 0.8 }, // diagonal
    ]) {
      const r = rotatedUp(enemyFacingAngle(dir));
      expect(r.x).toBeCloseTo(dir.x);
      expect(r.y).toBeCloseTo(dir.y);
    }
  });
});

describe('moveEnemy', () => {
  const field = createRectangularField(400, 300);

  it('bewegt einen Gegner delta-time-basiert mit seiner eigenen speed', () => {
    const enemy = createEnemy({ x: 200, y: 150 }, MAIN, { x: 1, y: 0 });
    moveEnemy(enemy, field, 1, () => 0.5);
    expect(enemy.position.x).toBeCloseTo(200 + MAIN.speed);
    expect(enemy.position.y).toBeCloseTo(150);
  });

  it('funktioniert mit derselben Funktion für Haupt- und Mini-Gegner', () => {
    const main = createEnemy({ x: 100, y: 150 }, MAIN, { x: 1, y: 0 });
    const mini = createEnemy({ x: 100, y: 150 }, MINI, { x: 1, y: 0 });
    moveEnemy(main, field, 1, () => 0.5);
    moveEnemy(mini, field, 1, () => 0.5);

    expect(main.position.x).toBeCloseTo(100 + MAIN.speed);
    expect(mini.position.x).toBeCloseTo(100 + MINI.speed);
    expect(mini.position.x).toBeGreaterThan(main.position.x); // Mini ist schneller
    expect(isPointInPolygon(main.position, field)).toBe(true);
    expect(isPointInPolygon(mini.position, field)).toBe(true);
  });

  it('bleibt über viele Ticks zuverlässig innerhalb des Polygons', () => {
    const enemy = createEnemy({ x: 200, y: 150 }, MAIN, { x: 1, y: 0 });
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
    const enemy = createEnemy({ x: 399, y: 150 }, MAIN, { x: 1, y: 0 });
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
    const enemy = createEnemy({ x: 60, y: 60 }, MAIN, { x: 1, y: 1 });
    for (let i = 0; i < 1500; i++) {
      moveEnemy(enemy, lShaped, 1 / 30, () => Math.random());
      expect(isPointInPolygon(enemy.position, lShaped)).toBe(true);
    }
  });
});

describe('moveEnemies', () => {
  it('bewegt alle Gegner der Liste', () => {
    const field = createRectangularField(400, 300);
    const list = [
      createEnemy({ x: 100, y: 150 }, MAIN, { x: 1, y: 0 }),
      createEnemy({ x: 100, y: 150 }, MINI, { x: 1, y: 0 }),
    ];
    moveEnemies(list, field, 1, () => 0.5);
    expect(list[0].position.x).toBeCloseTo(100 + MAIN.speed);
    expect(list[1].position.x).toBeCloseTo(100 + MINI.speed);
  });
});
