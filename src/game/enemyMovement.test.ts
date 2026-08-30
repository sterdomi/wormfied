import { describe, it, expect } from 'vitest';
import { createEnemy, enemyFacingAngle, type Enemy, type EnemySpec } from './enemy';
import {
  createRandomWalkState,
  ENEMY_PAUSE_DURATION_SECONDS,
  ENEMY_PAUSE_INTERVAL_SECONDS,
  ENEMY_SPEED,
  moveEnemies,
  moveEnemy,
  randomDirection,
  type RandomWalkState,
} from './enemyMovement';
import { createRectangularField, type Point } from './field';
import { closestPointOnPerimeter } from './geometry';
import { isPointInPolygon } from './polygon';

const MAIN: EnemySpec = { speed: ENEMY_SPEED, size: 40 };
const MINI: EnemySpec = { speed: ENEMY_SPEED * 1.5, size: 22 };

// Der Pausen-Zustand der Lauf-Bewegung liegt seit dem Behavior-Refactor NICHT
// mehr auf `Enemy`, sondern separat (`RandomWalkState`). Diese Test-Hülle hält
// ihn je Gegner in einer WeakMap – genau wie das Level-1-Behavior real.
const walks = new WeakMap<Enemy, RandomWalkState>();
const walkOf = (enemy: Enemy): RandomWalkState => {
  let state = walks.get(enemy);
  if (!state) walks.set(enemy, (state = createRandomWalkState()));
  return state;
};
const move = (enemy: Enemy, polygon: Point[], dt: number, rng?: () => number): void =>
  moveEnemy(enemy, walkOf(enemy), polygon, dt, rng ?? Math.random);

describe('randomDirection', () => {
  it('liefert einen Einheitsvektor', () => {
    expect(Math.hypot(randomDirection(() => 0.3).x, randomDirection(() => 0.3).y)).toBeCloseTo(1);
  });

  it('liefert NUR eine der vier Achsrichtungen, nie diagonal (Nutzer-Feedback: "schräg fahren darf nicht möglich sein")', () => {
    expect(randomDirection(() => 0)).toEqual({ x: 1, y: 0 });
    expect(randomDirection(() => 0.3)).toEqual({ x: -1, y: 0 });
    expect(randomDirection(() => 0.6)).toEqual({ x: 0, y: 1 });
    expect(randomDirection(() => 0.9)).toEqual({ x: 0, y: -1 });
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
    move(enemy, field, 1, () => 0.5);
    expect(enemy.position.x).toBeCloseTo(200 + MAIN.speed);
    expect(enemy.position.y).toBeCloseTo(150);
  });

  it('funktioniert mit derselben Funktion für Haupt- und Mini-Gegner', () => {
    const main = createEnemy({ x: 100, y: 150 }, MAIN, { x: 1, y: 0 });
    const mini = createEnemy({ x: 100, y: 150 }, MINI, { x: 1, y: 0 });
    move(main, field, 1, () => 0.5);
    move(mini, field, 1, () => 0.5);

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
      move(enemy, field, 1 / 30, rng);
      expect(isPointInPolygon(enemy.position, field)).toBe(true);
    }
  });

  it('hält über viele Ticks mindestens enemy.size/2 Abstand zum Rand (Nutzer-Feedback: "kommt durch zu kleine Lücken, da braucht es mehr marge")', () => {
    const enemy = createEnemy({ x: 200, y: 150 }, MAIN, { x: 1, y: 0 });
    const margin = MAIN.size / 2;
    let seed = 1;
    const rng = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < 3000; i++) {
      move(enemy, field, 1 / 30, rng);
      expect(enemy.position.x).toBeGreaterThanOrEqual(margin - 1e-6);
      expect(enemy.position.x).toBeLessThanOrEqual(400 - margin + 1e-6);
      expect(enemy.position.y).toBeGreaterThanOrEqual(margin - 1e-6);
      expect(enemy.position.y).toBeLessThanOrEqual(300 - margin + 1e-6);
    }
  });

  it('befreit sich nach einem plötzlichen Feld-Split neben ihm wieder, statt für immer stehen zu bleiben (Nutzer-Feedback: "jetzt bleibt er zu früh stehen")', () => {
    const enemy = createEnemy({ x: 200, y: 150 }, MAIN, { x: 1, y: 0 });

    // Plötzlicher "Split": das neue, aktive Feld reicht nur noch knapp über
    // die aktuelle Gegner-Position hinaus – die Marge (MAIN.size / 2 = 20)
    // ist an dieser Stelle klar verletzt, obwohl sich der Gegner nicht
    // bewegt hat (genau das passiert bei einem Feld-Split direkt neben ihm).
    const tightField = createRectangularField(enemy.position.x + 5, 300);
    const distanceBefore = closestPointOnPerimeter(tightField, enemy.position).distance;
    expect(distanceBefore).toBeLessThan(MAIN.size / 2);

    for (let i = 0; i < 60; i++) {
      move(enemy, tightField, 1 / 30, () => 0.5);
    }

    const distanceAfter = closestPointOnPerimeter(tightField, enemy.position).distance;
    expect(distanceAfter).toBeGreaterThan(distanceBefore); // hat sich befreit
    expect(isPointInPolygon(enemy.position, tightField)).toBe(true);
  });

  it('kehrt an einer Wand die Richtung um, wenn keine Zufallsrichtung passt (Fallback)', () => {
    const enemy = createEnemy({ x: 399, y: 150 }, MAIN, { x: 1, y: 0 });
    move(enemy, field, 1, () => 0);
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
      move(enemy, lShaped, 1 / 30, () => Math.random());
      expect(isPointInPolygon(enemy.position, lShaped)).toBe(true);
    }
  });
});

describe('moveEnemy – Pausen (Nutzer-Feedback: "manchmal für eine Sekunde anhalten")', () => {
  // Bewusst riesig: die Pause-Tests jagen absichtlich viele Sekunden
  // Bewegung durch einen einzigen `moveEnemy`-Aufruf (statt vieler kleiner
  // Ticks) – ein normal grosses Feld würde den Gegner dabei an die Wand
  // laufen lassen und die (hier irrelevante) Rand-Ausweichlogik auslösen.
  const field = createRectangularField(100_000, 100_000);
  const start = { x: 50_000, y: 50_000 };

  it('bewegt sich normal, solange das Pause-Intervall noch nicht erreicht ist', () => {
    const enemy = createEnemy(start, MAIN, { x: 1, y: 0 });
    move(enemy, field, ENEMY_PAUSE_INTERVAL_SECONDS - 1, () => 0.5);
    expect(enemy.position.x).toBeCloseTo(start.x + MAIN.speed * (ENEMY_PAUSE_INTERVAL_SECONDS - 1));
    expect(walkOf(enemy).pauseRemainingSeconds).toBe(0);
  });

  it('hält beim Erreichen des Intervalls an, statt sich zu bewegen', () => {
    const enemy = createEnemy(start, MAIN, { x: 1, y: 0 });
    move(enemy, field, ENEMY_PAUSE_INTERVAL_SECONDS, () => 0.5);
    expect(enemy.position).toEqual(start); // keine Bewegung diesen Frame
    expect(walkOf(enemy).pauseRemainingSeconds).toBe(ENEMY_PAUSE_DURATION_SECONDS);
  });

  it('bleibt für die gesamte Pausendauer stehen und bewegt sich danach wieder', () => {
    const enemy = createEnemy(start, MAIN, { x: 1, y: 0 });
    move(enemy, field, ENEMY_PAUSE_INTERVAL_SECONDS, () => 0.5); // Pause beginnt

    // Mitten in der Pause: weiterhin keine Bewegung.
    move(enemy, field, ENEMY_PAUSE_DURATION_SECONDS / 2, () => 0.5);
    expect(enemy.position).toEqual(start);
    expect(walkOf(enemy).pauseRemainingSeconds).toBeCloseTo(ENEMY_PAUSE_DURATION_SECONDS / 2);

    // Pause zu Ende: nächster Frame bewegt sich der Gegner wieder normal.
    move(enemy, field, ENEMY_PAUSE_DURATION_SECONDS / 2, () => 0.5);
    expect(walkOf(enemy).pauseRemainingSeconds).toBe(0);
    move(enemy, field, 1, () => 0.5);
    expect(enemy.position.x).toBeCloseTo(start.x + MAIN.speed);
  });
});

describe('moveEnemies', () => {
  it('bewegt alle Gegner der Liste', () => {
    const field = createRectangularField(400, 300);
    const list = [
      createEnemy({ x: 100, y: 150 }, MAIN, { x: 1, y: 0 }),
      createEnemy({ x: 100, y: 150 }, MINI, { x: 1, y: 0 }),
    ];
    moveEnemies(list, walkOf, field, 1, () => 0.5);
    expect(list[0].position.x).toBeCloseTo(100 + MAIN.speed);
    expect(list[1].position.x).toBeCloseTo(100 + MINI.speed);
  });
});
