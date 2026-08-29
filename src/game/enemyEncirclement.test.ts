import { describe, it, expect } from 'vitest';
import {
  enemyOwnArea,
  estimateReachableArea,
  MAIN_ENEMY_MIN_SIZE_SCALE,
  mainEnemyEncirclementScale,
} from './enemyEncirclement';
import { createRectangularField } from './field';

describe('estimateReachableArea (Nutzer-Feedback: Rechteck aus der Reichweite auf x- und y-Achse in beide Richtungen)', () => {
  it('entspricht (grob, schrittweite-bedingt) der exakten Polygonfläche ohne Marge', () => {
    const field = createRectangularField(200, 100);
    // Bei margin=0 kann ein Strahl exakt AUF dem Rand landen (Grenzfall für
    // `isPointInPolygon` uneindeutig) – grosszügige Toleranz statt exakter
    // Gleichheit, es geht nur darum, dass ohne Hindernisse ungefähr die volle
    // Fläche herauskommt.
    const area = estimateReachableArea(field, { x: 100, y: 50 }, 0, 5);
    expect(area).toBeCloseTo(20000, -4); // 200×100, Toleranz ±5000
  });

  it('schrumpft mit steigender Marge (Rand-Erosion)', () => {
    const field = createRectangularField(200, 100);
    const noMargin = estimateReachableArea(field, { x: 100, y: 50 }, 0, 5);
    const withMargin = estimateReachableArea(field, { x: 100, y: 50 }, 20, 5);
    expect(withMargin).toBeLessThan(noMargin);
    // Erodiertes Rechteck ≈ (200 - 2·20) × (100 - 2·20) = 160 × 60 = 9600.
    expect(withMargin).toBeCloseTo(9600, -2);
  });

  it('zählt die Fläche hinter einem zu engen Durchgang NICHT mit (Nutzer-Feedback: "wenn es einen kleinen Durchgang hat, durch den er nicht fahren kann, zählt das nicht")', () => {
    // Zwei 200×200-Räume, verbunden durch einen nur 20px hohen Korridor
    // (x 200–300, y 90–110) – bei margin=20 passt kein Punkt im Korridor
    // rein (Abstand zu beiden Korridor-Kanten dort maximal 10 < 20), der
    // Strahl nach rechts stoppt also VOR dem Korridor statt bis Raum B
    // durchzureichen.
    const dumbbellNarrow = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 90 },
      { x: 300, y: 90 },
      { x: 300, y: 0 },
      { x: 500, y: 0 },
      { x: 500, y: 200 },
      { x: 300, y: 200 },
      { x: 300, y: 110 },
      { x: 200, y: 110 },
      { x: 200, y: 200 },
      { x: 0, y: 200 },
    ];
    const margin = 20;
    const fromRoomA = estimateReachableArea(dumbbellNarrow, { x: 100, y: 100 }, margin, 4);

    // Nur Raum A (erodiert, ≈ (200 - 2·20)² = 160² = 25600) – nicht Raum A +
    // Korridor + Raum B (das gesamte Polygon hat ~82000 Fläche).
    expect(fromRoomA).toBeCloseTo(25600, -3);
  });

  it('reicht bis in Raum B, sobald der Durchgang breit genug ist', () => {
    // Gleiche Form, aber Korridor 60px hoch (> 2 × margin 20) statt 20px.
    const dumbbellWide = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 70 },
      { x: 300, y: 70 },
      { x: 300, y: 0 },
      { x: 500, y: 0 },
      { x: 500, y: 200 },
      { x: 300, y: 200 },
      { x: 300, y: 130 },
      { x: 200, y: 130 },
      { x: 200, y: 200 },
      { x: 0, y: 200 },
    ];
    const margin = 20;
    const fromRoomA = estimateReachableArea(dumbbellWide, { x: 100, y: 100 }, margin, 4);

    // Deutlich mehr als der isolierte Raum A (~25600) – der Strahl nach
    // rechts reicht jetzt durch den Korridor bis in Raum B.
    expect(fromRoomA).toBeGreaterThan(50000);
  });

  it('links+rechts (bzw. hoch+runter) ergänzen sich in einem einfachen Rechteck zur vollen Breite (bzw. Höhe), unabhängig von der Position', () => {
    // Kein Hindernis zwischen den Wänden: näher an der linken Wand bedeutet
    // weniger Reichweite nach links, aber genau entsprechend mehr nach
    // rechts – die Summe (und damit die Rechteck-Fläche) bleibt gleich. Das
    // Schrumpfen greift erst, wenn die Position in einem tatsächlich
    // kleineren Teilbereich liegt (siehe Dumbbell-Tests oben).
    const field = createRectangularField(200, 100);
    const nearWall = estimateReachableArea(field, { x: 5, y: 50 }, 0, 4);
    const centered = estimateReachableArea(field, { x: 100, y: 50 }, 0, 4);
    expect(nearWall).toBeCloseTo(centered, -3);
  });
});

describe('enemyOwnArea', () => {
  it('liefert die Kreisfläche für den Durchmesser', () => {
    expect(enemyOwnArea(80)).toBeCloseTo(Math.PI * 40 * 40);
  });
});

describe('mainEnemyEncirclementScale (Nutzer-Feedback: "verschärfe Voraussetzungen" – Trigger von 2× auf 1.3× eigene Fläche gesenkt)', () => {
  it('volle Grösse, solange erreichbare Fläche mindestens 1.3× so gross ist (Default-Trigger)', () => {
    expect(mainEnemyEncirclementScale(130, 100)).toBe(1);
    expect(mainEnemyEncirclementScale(500, 100)).toBe(1);
  });

  it('minimale Grösse, sobald erreichbare Fläche auf die eigene Fläche fällt (oder kleiner)', () => {
    expect(mainEnemyEncirclementScale(100, 100)).toBeCloseTo(MAIN_ENEMY_MIN_SIZE_SCALE);
    expect(mainEnemyEncirclementScale(50, 100)).toBeCloseTo(MAIN_ENEMY_MIN_SIZE_SCALE);
  });

  it('linear dazwischen', () => {
    // Mitte zwischen ownArea (100) und 1.3×ownArea (130) = 115.
    expect(mainEnemyEncirclementScale(115, 100)).toBeCloseTo((1 + MAIN_ENEMY_MIN_SIZE_SCALE) / 2);
  });

  it('nimmt einen expliziten triggerMultiplier statt des Default-Werts', () => {
    // Mit explizit 2× (alter Wert) verhält sie sich wie vor der Verschärfung.
    expect(mainEnemyEncirclementScale(200, 100, 2)).toBe(1);
    expect(mainEnemyEncirclementScale(150, 100, 2)).toBeCloseTo(
      (1 + MAIN_ENEMY_MIN_SIZE_SCALE) / 2,
    );
  });

  it('robust gegen ownArea <= 0', () => {
    expect(mainEnemyEncirclementScale(100, 0)).toBe(1);
  });
});
