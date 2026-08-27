import { describe, it, expect } from 'vitest';
import { createRectangularField } from './field';
import {
  applyCompletedLine,
  determineClaimedRegion,
  polygonArea,
  simplifyPolygon,
  splitFieldByLine,
  splitPolygonByLine,
} from './polygon';

describe('polygonArea', () => {
  it('berechnet die Rechteckfläche', () => {
    expect(polygonArea(createRectangularField(800, 600))).toBe(480000);
  });

  it('berechnet die Dreiecksfläche', () => {
    expect(
      polygonArea([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 3 },
      ]),
    ).toBe(6);
  });

  it('ist unabhängig von der Umlaufrichtung', () => {
    const cw = createRectangularField(10, 20);
    const ccw = [...cw].reverse();
    expect(polygonArea(ccw)).toBe(polygonArea(cw));
  });
});

describe('simplifyPolygon', () => {
  it('entfernt kollineare Zwischenpunkte, behält die Ecken', () => {
    const dense = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 }, // kollinear auf der oberen Kante
      { x: 10, y: 10 },
      { x: 5, y: 10 }, // kollinear auf der unteren Kante
      { x: 0, y: 10 },
    ];
    expect(simplifyPolygon(dense)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
  });

  it('lässt echte Ecken unberührt', () => {
    const rect = createRectangularField(30, 20);
    expect(simplifyPolygon(rect)).toHaveLength(4);
  });
});

describe('splitPolygonByLine', () => {
  const field = createRectangularField(800, 600); // Fläche 480000

  it('reduziert eine gerade Linie mit vielen Zwischenpunkten auf saubere Rechtecke', () => {
    const line = [
      { x: 400, y: 0 },
      { x: 400, y: 150 },
      { x: 400, y: 300 },
      { x: 400, y: 450 },
      { x: 400, y: 600 },
    ];
    const [a, b] = splitPolygonByLine(field, line);
    expect(a).toHaveLength(4);
    expect(b).toHaveLength(4);
  });

  it('gerade Linie obere → untere Kante ergibt zwei gleich grosse Rechtecke', () => {
    const line = [
      { x: 400, y: 0 },
      { x: 400, y: 600 },
    ];
    const [a, b] = splitPolygonByLine(field, line);
    expect(polygonArea(a)).toBeCloseTo(240000);
    expect(polygonArea(b)).toBeCloseTo(240000);
    expect(polygonArea(a) + polygonArea(b)).toBeCloseTo(polygonArea(field));
  });

  it('L-Schnitt obere → rechte Kante: Flächensumme bleibt erhalten', () => {
    const line = [
      { x: 200, y: 0 },
      { x: 200, y: 200 },
      { x: 800, y: 200 },
    ];
    const [a, b] = splitPolygonByLine(field, line);
    const areas = [polygonArea(a), polygonArea(b)].sort((x, y) => x - y);
    expect(areas[0]).toBeCloseTo(120000); // Ecke: 600 x 200
    expect(areas[1]).toBeCloseTo(360000);
    expect(areas[0] + areas[1]).toBeCloseTo(480000);
  });

  it('rechteckige Bucht von der oberen Kante: Flächensumme bleibt erhalten', () => {
    const line = [
      { x: 200, y: 0 },
      { x: 200, y: 300 },
      { x: 600, y: 300 },
      { x: 600, y: 0 },
    ];
    const [a, b] = splitPolygonByLine(field, line);
    const areas = [polygonArea(a), polygonArea(b)].sort((x, y) => x - y);
    expect(areas[0]).toBeCloseTo(120000); // Bucht: 400 x 300
    expect(areas[1]).toBeCloseTo(360000);
  });

  it('degenerierter Fall (Start = Ende auf demselben Randpunkt): Feld bleibt unverändert', () => {
    const line = [
      { x: 400, y: 0 },
      { x: 400, y: 40 },
      { x: 420, y: 40 },
      { x: 400, y: 0 }, // exakt zurück zum Start
    ];
    const [a, b] = splitPolygonByLine(field, line);
    // eine Seite ist die kleine Schlaufe, die andere exakt das volle Feld
    const bigger = polygonArea(a) >= polygonArea(b) ? a : b;
    expect(polygonArea(bigger)).toBe(480000);
  });
});

describe('determineClaimedRegion', () => {
  it('liefert das kleinere Polygon zurück', () => {
    const small = createRectangularField(10, 10); // 100
    const big = createRectangularField(100, 100); // 10000
    expect(determineClaimedRegion(big, small)).toBe(small);
    expect(determineClaimedRegion(small, big)).toBe(small);
  });
});

describe('splitFieldByLine', () => {
  it('claimed = kleinere Hälfte, active = grössere Hälfte', () => {
    const field = createRectangularField(800, 600);
    const line = [
      { x: 100, y: 0 },
      { x: 100, y: 600 },
    ];
    const { claimed, active } = splitFieldByLine(field, line);
    expect(polygonArea(claimed)).toBeCloseTo(60000); // 100 x 600
    expect(polygonArea(active)).toBeCloseTo(420000); // 700 x 600
  });
});

describe('applyCompletedLine', () => {
  it('leitet den Spieler-Randzustand am Linien-Endpunkt auf dem neuen Feld ab', () => {
    const field = createRectangularField(800, 600);
    const line = [
      { x: 100, y: 0 },
      { x: 100, y: 600 },
    ];
    const r = applyCompletedLine(field, line);

    expect(polygonArea(r.active)).toBeCloseTo(420000);
    expect(r.playerSegmentIndex).toBeGreaterThanOrEqual(0);
    expect(r.playerSegmentIndex).toBeLessThan(r.active.length);
    expect(r.playerSegmentProgress).toBeGreaterThanOrEqual(0);
    expect(r.playerSegmentProgress).toBeLessThanOrEqual(1);
  });
});
