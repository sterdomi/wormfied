import { describe, it, expect } from 'vitest';
import { createEnemy, type EnemySpec } from './enemy';
import { createRectangularField } from './field';
import { defeatMiniEnemy, removeCapturedMiniEnemies, spawnMiniEnemies } from './miniEnemies';
import { isPointInPolygon } from './polygon';
import { createScoring, defaultMiniEnemyDefeatedPoints } from './scoring';
import type { Explosion } from './explosion';

const SPEC: EnemySpec = { speed: 120, size: 22 };

describe('spawnMiniEnemies', () => {
  it('platziert die gewünschte Anzahl innerhalb des Polygons mit Mindestabstand', () => {
    const field = createRectangularField(800, 600);
    const mainPos = { x: 400, y: 300 };
    const minDistance = 60;

    const minis = spawnMiniEnemies(field, 3, SPEC, [mainPos], minDistance, Math.random);

    expect(minis).toHaveLength(3);
    for (const m of minis) {
      expect(isPointInPolygon(m.position, field)).toBe(true);
      expect(m.speed).toBe(SPEC.speed);
      expect(m.size).toBe(SPEC.size);
      // Abstand zum Hauptgegner …
      expect(Math.hypot(m.position.x - mainPos.x, m.position.y - mainPos.y)).toBeGreaterThanOrEqual(
        minDistance,
      );
    }
    // … und zueinander
    for (let i = 0; i < minis.length; i++) {
      for (let j = i + 1; j < minis.length; j++) {
        const a = minis[i].position;
        const b = minis[j].position;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(minDistance);
      }
    }
  });
});

describe('removeCapturedMiniEnemies', () => {
  const claimed = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  it('entfernt Mini-Gegner im eroberten Teilpolygon, behält die anderen', () => {
    const inside = createEnemy({ x: 50, y: 50 }, SPEC);
    const outside = createEnemy({ x: 300, y: 300 }, SPEC);

    const survivors = removeCapturedMiniEnemies([inside, outside], claimed);

    expect(survivors).toHaveLength(1);
    expect(survivors[0]).toBe(outside);
  });

  it('entfernt mehrere gefangene Mini-Gegner auf einmal', () => {
    const list = [
      createEnemy({ x: 10, y: 10 }, SPEC),
      createEnemy({ x: 90, y: 90 }, SPEC),
      createEnemy({ x: 500, y: 500 }, SPEC),
    ];
    expect(removeCapturedMiniEnemies(list, claimed)).toHaveLength(1);
  });
});

describe('defeatMiniEnemy (geteilte Logik: Einschliessen UND Spieler-Projektil-Treffer)', () => {
  it('erzeugt eine Explosion an der Gegnerposition und vergibt Bonus-Punkte', () => {
    const enemy = createEnemy({ x: 42, y: 84 }, SPEC);
    const scoring = createScoring(1000);
    const explosions: Explosion[] = [];

    defeatMiniEnemy(enemy, scoring, explosions);

    expect(scoring.score).toBe(defaultMiniEnemyDefeatedPoints);
    expect(explosions).toHaveLength(1);
    expect(explosions[0].position).toEqual({ x: 42, y: 84 });
  });

  it('nutzt die level-eigenen Punkte, falls angegeben', () => {
    const enemy = createEnemy({ x: 0, y: 0 }, SPEC);
    const scoring = createScoring(1000);
    const explosions: Explosion[] = [];

    defeatMiniEnemy(enemy, scoring, explosions, { miniEnemyPoints: 777, mainEnemyPoints: 3000 });

    expect(scoring.score).toBe(777);
  });
});
