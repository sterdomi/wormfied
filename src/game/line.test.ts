import { describe, it, expect } from 'vitest';
import { appendPoint, createLine, lineLength, POINT_MIN_DISTANCE } from './line';

describe('createLine', () => {
  it('startet mit dem Startpunkt als einzigem (kopiertem) Punkt', () => {
    const start = { x: 10, y: 20 };
    const line = createLine(start);
    expect(line.points).toEqual([{ x: 10, y: 20 }]);
    start.x = 999;
    expect(line.points[0]).toEqual({ x: 10, y: 20 }); // keine geteilte Referenz
  });
});

describe('appendPoint', () => {
  it('hängt einen Punkt erst ab dem Mindestabstand an', () => {
    const line = createLine({ x: 0, y: 0 });
    appendPoint(line, { x: POINT_MIN_DISTANCE - 1, y: 0 });
    expect(line.points).toHaveLength(1); // zu nah -> verworfen
    appendPoint(line, { x: POINT_MIN_DISTANCE, y: 0 });
    expect(line.points).toHaveLength(2);
  });

  it('mit minDistance 0 wird immer angehängt (exakter Endpunkt)', () => {
    const line = createLine({ x: 0, y: 0 });
    appendPoint(line, { x: 0.01, y: 0 }, 0);
    expect(line.points).toHaveLength(2);
  });
});

describe('lineLength', () => {
  it('summiert die Abschnittslängen', () => {
    const line = createLine({ x: 0, y: 0 });
    appendPoint(line, { x: 0, y: 30 }, 0);
    appendPoint(line, { x: 40, y: 30 }, 0);
    expect(lineLength(line)).toBe(70);
  });
});
