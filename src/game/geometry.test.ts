import { describe, it, expect } from 'vitest';
import { segmentIntersection } from './geometry';

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
