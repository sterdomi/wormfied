import { describe, it, expect } from 'vitest';
import { createRectangularField } from './field';
import { polygonArea, splitFieldByLine } from './polygon';
import {
  createScoring,
  EXTRA_LIFE_SCORE_THRESHOLD,
  extraLivesFromScore,
  formatClaimedPercentage,
  getClaimedPercentage,
  LEVEL_COMPLETE_THRESHOLD,
  POINTS_PER_PERCENT,
  registerClaim,
} from './scoring';

describe('getClaimedPercentage', () => {
  it('liefert den Anteil in Prozent', () => {
    expect(getClaimedPercentage(25, 100)).toBe(25);
    expect(getClaimedPercentage(120_000, 480_000)).toBe(25);
    expect(getClaimedPercentage(240_000, 480_000)).toBe(50);
  });

  it('rundet auf eine Nachkommastelle', () => {
    expect(getClaimedPercentage(1, 3)).toBe(33.3);
    expect(getClaimedPercentage(2, 3)).toBe(66.7);
  });

  it('ist robust gegen Gesamtfläche 0', () => {
    expect(getClaimedPercentage(10, 0)).toBe(0);
  });

  it('deckelt bei 100', () => {
    expect(getClaimedPercentage(150, 100)).toBe(100);
  });
});

describe('formatClaimedPercentage', () => {
  it('formatiert NN.N% mit führender Null (wie im Referenzbild)', () => {
    expect(formatClaimedPercentage(0)).toBe('00.0%');
    expect(formatClaimedPercentage(1)).toBe('01.0%');
    expect(formatClaimedPercentage(12.3)).toBe('12.3%');
    expect(formatClaimedPercentage(100)).toBe('100.0%');
  });
});

describe('claimedArea kumulativ über mehrere Splits', () => {
  it('addiert die in splitFieldByLine berechnete Fläche des eroberten Polygons', () => {
    const field = createRectangularField(800, 600); // 480_000
    const scoring = createScoring(polygonArea(field));
    expect(scoring.totalFieldArea).toBe(480_000);
    expect(scoring.claimedArea).toBe(0);

    // Schnitt nahe der linken Kante: schmale linke Hälfte (100 x 600) erobert.
    const split1 = splitFieldByLine(field, [
      { x: 100, y: 0 },
      { x: 100, y: 600 },
    ]);
    expect(split1.claimedArea).toBeCloseTo(60_000);
    scoring.claimedArea += split1.claimedArea;
    expect(getClaimedPercentage(scoring.claimedArea, scoring.totalFieldArea)).toBeCloseTo(12.5);

    // Zweiter Schnitt auf dem verkleinerten Feld: 300 x 600 = 180_000 erobert.
    const split2 = splitFieldByLine(split1.active, [
      { x: 400, y: 0 },
      { x: 400, y: 600 },
    ]);
    expect(split2.claimedArea).toBeCloseTo(180_000);
    scoring.claimedArea += split2.claimedArea;

    expect(scoring.claimedArea).toBeCloseTo(240_000);
    expect(getClaimedPercentage(scoring.claimedArea, scoring.totalFieldArea)).toBeCloseTo(50);
  });
});

describe('registerClaim – Punktevergabe', () => {
  it('vergibt Punkte proportional zum Flächenanteil dieser Eroberung', () => {
    const scoring = createScoring(1000); // Gesamtfläche 1000
    scoring.claimedArea = 125; // Gesamtsumme (12.5 %) – für den 80 %-Check
    const outcome = registerClaim(scoring, 125); // diese Eroberung: 12.5 %

    // 12.5 % × POINTS_PER_PERCENT, gerundet
    expect(outcome.pointsAwarded).toBe(Math.round(12.5 * POINTS_PER_PERCENT));
    expect(scoring.score).toBe(outcome.pointsAwarded);
    expect(outcome.levelJustCompleted).toBe(false);
  });

  it('rundet den Score-Zuwachs auf eine ganze Zahl', () => {
    const scoring = createScoring(30_000);
    scoring.claimedArea = 1234;
    const outcome = registerClaim(scoring, 1234);
    expect(Number.isInteger(outcome.pointsAwarded)).toBe(true);
    expect(Number.isInteger(scoring.score)).toBe(true);
  });
});

describe('Extra-Leben bei Score-Schwellen', () => {
  const T = EXTRA_LIFE_SCORE_THRESHOLD;

  it('extraLivesFromScore zählt jede überschrittene Schwelle', () => {
    expect(extraLivesFromScore(0, T - 1)).toBe(0);
    expect(extraLivesFromScore(T - 1, T)).toBe(1);
    expect(extraLivesFromScore(T + 5, T + 6)).toBe(0);
    expect(extraLivesFromScore(0, 3 * T + 500)).toBe(3); // Sprung über mehrere
    expect(extraLivesFromScore(T + 100, 4 * T + 100)).toBe(3);
  });

  it('ein Claim, der genau eine Schwelle überschreitet, gibt 1 Extra-Leben', () => {
    const scoring = createScoring(1_000_000);
    scoring.score = T - 50;
    // kleiner Claim: +? Punkte, gerade über die Schwelle
    const area = (60 / POINTS_PER_PERCENT) * (1_000_000 / 100); // ~60 Punkte
    scoring.claimedArea = area;
    const outcome = registerClaim(scoring, area);
    expect(scoring.score).toBeGreaterThanOrEqual(T);
    expect(outcome.extraLives).toBe(1);
  });

  it('ein sehr grosser Claim in einem Schritt gibt mehrere Extra-Leben', () => {
    const scoring = createScoring(500);
    // volle Fläche auf einen Schlag: 100 % × POINTS_PER_PERCENT Punkte
    scoring.claimedArea = 500;
    const outcome = registerClaim(scoring, 500);
    const expectedLives = Math.floor((100 * POINTS_PER_PERCENT) / T);
    expect(outcome.extraLives).toBe(expectedLives);
    expect(expectedLives).toBeGreaterThan(1); // POINTS_PER_PERCENT so gewählt, dass das geht
  });
});

describe('isLevelComplete bei 80 %', () => {
  const total = 100_000;

  const afterClaimingPercent = (percent: number) => {
    const scoring = createScoring(total);
    scoring.claimedArea = (percent / 100) * total;
    registerClaim(scoring, scoring.claimedArea);
    return scoring;
  };

  it('wird bei genau 80 % true', () => {
    expect(LEVEL_COMPLETE_THRESHOLD).toBe(80);
    expect(afterClaimingPercent(80).isLevelComplete).toBe(true);
  });

  it('wird knapp über 80 % true', () => {
    expect(afterClaimingPercent(80.4).isLevelComplete).toBe(true);
  });

  it('bleibt bei 79.9 % false', () => {
    const s = createScoring(total);
    s.claimedArea = 0.799 * total;
    registerClaim(s, s.claimedArea);
    expect(s.isLevelComplete).toBe(false);
  });

  it('levelJustCompleted nur beim erstmaligen Erreichen', () => {
    const s = createScoring(total);
    s.claimedArea = 0.5 * total;
    expect(registerClaim(s, 0.5 * total).levelJustCompleted).toBe(false);
    s.claimedArea = 0.85 * total;
    expect(registerClaim(s, 0.35 * total).levelJustCompleted).toBe(true);
    s.claimedArea = 0.9 * total;
    expect(registerClaim(s, 0.05 * total).levelJustCompleted).toBe(false); // schon complete
  });
});
