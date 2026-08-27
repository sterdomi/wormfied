import { describe, it, expect } from 'vitest';
import { createRectangularField, pointOnPerimeter, segmentLength } from './field';

describe('createRectangularField', () => {
  it('liefert genau vier Eckpunkte', () => {
    expect(createRectangularField(800, 600)).toHaveLength(4);
  });

  it('liefert die Rechteck-Ecken im Uhrzeigersinn ab oben links', () => {
    expect(createRectangularField(800, 600)).toEqual([
      { x: 0, y: 0 },
      { x: 800, y: 0 },
      { x: 800, y: 600 },
      { x: 0, y: 600 },
    ]);
  });

  it('skaliert mit den übergebenen Massen', () => {
    expect(createRectangularField(320, 240)).toEqual([
      { x: 0, y: 0 },
      { x: 320, y: 0 },
      { x: 320, y: 240 },
      { x: 0, y: 240 },
    ]);
  });
});

describe('segmentLength', () => {
  it('entspricht den vier Kantenlängen (Segment 3 schliesst das Polygon)', () => {
    const f = createRectangularField(800, 600);
    expect(segmentLength(f, 0)).toBe(800); // oben
    expect(segmentLength(f, 1)).toBe(600); // rechts
    expect(segmentLength(f, 2)).toBe(800); // unten
    expect(segmentLength(f, 3)).toBe(600); // links
  });
});

describe('pointOnPerimeter', () => {
  it('interpoliert linear entlang eines Segments', () => {
    const f = createRectangularField(800, 600);
    expect(pointOnPerimeter(f, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(pointOnPerimeter(f, 0, 0.5)).toEqual({ x: 400, y: 0 });
    expect(pointOnPerimeter(f, 1, 0.5)).toEqual({ x: 800, y: 300 });
    expect(pointOnPerimeter(f, 3, 1)).toEqual({ x: 0, y: 0 });
  });
});
