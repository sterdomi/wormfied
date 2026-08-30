import { describe, it, expect } from 'vitest';
import {
  closestPointOnPolyline,
  segmentCrossesPolyline,
  segmentIntersection,
} from './geometry';

describe('segmentIntersection', () => {
  it('findet den Schnittpunkt zweier sich kreuzender Strecken', () => {
    const hit = segmentIntersection(
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 10, y: 0 },
    );
    expect(hit).not.toBeNull();
    expect(hit?.point).toEqual({ x: 5, y: 5 });
    expect(hit?.t).toBeCloseTo(0.5);
    expect(hit?.u).toBeCloseTo(0.5);
  });

  it('liefert null, wenn sich die Strecken nur als Geraden schneiden würden', () => {
    expect(
      segmentIntersection({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 5, y: 0 }, { x: 5, y: 10 }),
    ).toBeNull();
  });

  it('liefert null für parallele Strecken', () => {
    expect(
      segmentIntersection({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 }),
    ).toBeNull();
  });
});

describe('segmentCrossesPolyline', () => {
  const LINE = [
    { x: 0, y: 100 },
    { x: 100, y: 100 },
    { x: 100, y: 0 },
  ];

  it('true, wenn der Schritt eine Kante der Kette kreuzt', () => {
    expect(segmentCrossesPolyline({ x: 50, y: 90 }, { x: 50, y: 110 }, LINE)).toBe(true);
  });

  it('false, wenn der Schritt parallel neben der Kette bleibt', () => {
    expect(segmentCrossesPolyline({ x: 50, y: 90 }, { x: 60, y: 90 }, LINE)).toBe(false);
  });

  it('false bei leerer Kette', () => {
    expect(segmentCrossesPolyline({ x: 0, y: 0 }, { x: 10, y: 10 }, [])).toBe(false);
  });
});

describe('closestPointOnPolyline', () => {
  const LINE = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];

  it('projiziert senkrecht auf die Strecke', () => {
    const proj = closestPointOnPolyline(LINE, { x: 40, y: 25 });
    expect(proj.point).toEqual({ x: 40, y: 0 });
    expect(proj.distance).toBeCloseTo(25);
  });

  it('distance Infinity bei weniger als zwei Punkten', () => {
    expect(closestPointOnPolyline([{ x: 1, y: 1 }], { x: 0, y: 0 }).distance).toBe(Infinity);
  });
});
