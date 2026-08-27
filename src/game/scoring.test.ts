import { describe, it, expect } from 'vitest';
import { createRectangularField } from './field';
import { polygonArea, splitFieldByLine } from './polygon';
import { createScoring, formatClaimedPercentage, getClaimedPercentage } from './scoring';

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
