import { describe, it, expect } from 'vitest';
import { createRectangularField, pointOnPerimeter, segmentLength } from './field';
import { Player } from './player';
import { applyCompletedLine, polygonArea } from './polygon';

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

describe('Feld-Update nach einem Polygon-Split', () => {
  it('setzt das neue Feld und einen konsistenten Spieler-Randzustand am Linien-Endpunkt', () => {
    const field = createRectangularField(800, 600);
    // Gerader Schnitt obere → untere Kante; der Spieler steht danach bei (400, 600).
    const line = [
      { x: 400, y: 0 },
      { x: 400, y: 600 },
    ];
    const result = applyCompletedLine(field, line);

    // Neues aktives Feld: die (gleich grosse) andere Hälfte.
    expect(polygonArea(result.active)).toBeCloseTo(240000);

    // Spieler-Zustand auf dem NEUEN Polygon rekonstruieren.
    const player = new Player(result.playerSegmentIndex, result.playerSegmentProgress);
    player.syncPosition(result.active);
    expect(player.position.x).toBeCloseTo(400);
    expect(player.position.y).toBeCloseTo(600);
  });
});
