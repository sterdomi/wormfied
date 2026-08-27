import { describe, it, expect } from 'vitest';
import { createRectangularField } from './field';
import { Player } from './player';
import {
  EDGE_SPEED,
  advanceAlongPerimeter,
  edgeDirectionFromInput,
  movePlayerAlongEdge,
  type KeyInput,
} from './playerMovement';

const NONE: KeyInput = { up: false, down: false, left: false, right: false };
const field = createRectangularField(800, 600);
// Umfang = 800 + 600 + 800 + 600 = 2800

describe('edgeDirectionFromInput', () => {
  it('obere Kante (Segment 0): rechts läuft im Uhrzeigersinn, links dagegen', () => {
    expect(edgeDirectionFromInput(field, 0, { ...NONE, right: true })).toBe(1);
    expect(edgeDirectionFromInput(field, 0, { ...NONE, left: true })).toBe(-1);
  });

  it('obere Kante: hoch/runter stehen quer zur Kante und bewegen nicht', () => {
    expect(edgeDirectionFromInput(field, 0, { ...NONE, up: true })).toBe(0);
    expect(edgeDirectionFromInput(field, 0, { ...NONE, down: true })).toBe(0);
  });

  it('rechte Kante (Segment 1): runter läuft im Uhrzeigersinn (wie im Auftrag beschrieben)', () => {
    expect(edgeDirectionFromInput(field, 1, { ...NONE, down: true })).toBe(1);
    expect(edgeDirectionFromInput(field, 1, { ...NONE, up: true })).toBe(-1);
  });

  it('untere Kante (Segment 2): links läuft im Uhrzeigersinn', () => {
    expect(edgeDirectionFromInput(field, 2, { ...NONE, left: true })).toBe(1);
  });

  it('gegensätzliche Tasten heben sich auf', () => {
    expect(edgeDirectionFromInput(field, 0, { ...NONE, left: true, right: true })).toBe(0);
  });
});

describe('advanceAlongPerimeter – Ecken- und Polygon-Übergänge', () => {
  it('läuft vorwärts über die obere-rechte Ecke von Segment 0 auf Segment 1', () => {
    // Start 100 px vor der Ecke (obere Kante, Länge 800), 150 px vorwärts.
    const res = advanceAlongPerimeter(field, 0, 700 / 800, 150);
    expect(res.segmentIndex).toBe(1);
    expect(res.progress).toBeCloseTo(50 / 600); // 150 - 100 in die rechte Kante
  });

  it('läuft rückwärts über die obere-linke Ecke von Segment 0 auf Segment 3', () => {
    // Start 30 px hinter der Ecke, 50 px rückwärts -> 20 px vor dem Ende von Segment 3.
    const res = advanceAlongPerimeter(field, 0, 30 / 800, -50);
    expect(res.segmentIndex).toBe(3);
    expect(res.progress).toBeCloseTo((600 - 20) / 600);
  });

  it('wickelt über mehrere Ecken und das Polygon-Ende hinweg (volle Runde)', () => {
    const res = advanceAlongPerimeter(field, 0, 0, 2800);
    expect(res.segmentIndex).toBe(0);
    expect(res.progress).toBeCloseTo(0);
  });
});

describe('movePlayerAlongEdge', () => {
  it('ist Delta-Time-basiert: EDGE_SPEED Pixel pro Sekunde entlang der Kante', () => {
    const p = new Player(0, 0);
    movePlayerAlongEdge(p, field, { ...NONE, right: true }, 1);
    expect(p.segmentIndex).toBe(0);
    expect(p.position.x).toBeCloseTo(EDGE_SPEED);
    expect(p.position.y).toBeCloseTo(0);

    // Halbe Frame-Zeit -> halbe Strecke.
    movePlayerAlongEdge(p, field, { ...NONE, right: true }, 0.5);
    expect(p.position.x).toBeCloseTo(EDGE_SPEED * 1.5);
  });

  it('trägt den Ecken-Übergang in Segment-Index und Weltposition korrekt nach', () => {
    const p = new Player(0, 790 / 800); // 10 px vor der oberen-rechten Ecke
    movePlayerAlongEdge(p, field, { ...NONE, right: true }, 1); // EDGE_SPEED px vorwärts
    expect(p.segmentIndex).toBe(1); // jetzt auf der rechten Kante
    expect(p.segmentProgress).toBeCloseTo((EDGE_SPEED - 10) / 600);
    expect(p.position.x).toBeCloseTo(800);
    expect(p.position.y).toBeCloseTo(EDGE_SPEED - 10);
  });

  it('bewegt sich nicht ohne Eingabe', () => {
    const p = new Player(1, 0.4);
    movePlayerAlongEdge(p, field, NONE, 1);
    expect(p.segmentIndex).toBe(1);
    expect(p.segmentProgress).toBeCloseTo(0.4);
  });
});
