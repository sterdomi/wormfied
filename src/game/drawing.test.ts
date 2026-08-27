import { describe, it, expect } from 'vitest';
import {
  advanceDrawing,
  beginDrawing,
  crossesOwnLine,
  DRAW_SPEED,
  EdgeTrigger,
  headingFromInput,
  type DrawInput,
} from './drawing';
import { createRectangularField } from './field';
import type { DrawnLine } from './line';
import { Player } from './player';

const NONE: DrawInput = { up: false, down: false, left: false, right: false, draw: false };
const HELD: DrawInput = { ...NONE, draw: true }; // Leertaste gehalten, keine Cursor
const field = createRectangularField(800, 600);

/** Spieler auf der oberen Kante (Segment 0), Position mittig darauf. */
function playerOnTopEdge(progress = 0.5): Player {
  const p = new Player(0, progress);
  p.syncPosition(field);
  return p;
}

describe('EdgeTrigger – Leertaste nur als steigende Flanke', () => {
  it('feuert beim Drücken, nicht beim Halten, wieder nach Loslassen', () => {
    const trigger = new EdgeTrigger();
    expect(trigger.pressed(false)).toBe(false);
    expect(trigger.pressed(true)).toBe(true); // gedrückt
    expect(trigger.pressed(true)).toBe(false); // gehalten
    expect(trigger.pressed(false)).toBe(false); // losgelassen
    expect(trigger.pressed(true)).toBe(true); // erneut gedrückt
  });
});

describe('beginDrawing – vom Rand lösen', () => {
  it('wird mit frisch gedrückter Leertaste "drawing", OHNE sich zu bewegen', () => {
    const p = playerOnTopEdge();
    const posBefore = { ...p.position };
    const session = beginDrawing(p, true);
    expect(session).not.toBeNull();
    expect(p.mode).toBe('drawing');
    expect(p.position).toEqual(posBefore); // keine Bewegung
    expect(session?.heading).toBeNull(); // Richtung erst per Cursor
    expect(session?.line.points).toEqual([{ x: 400, y: 0 }]);
  });

  it('startet nicht ohne Leertasten-Flanke', () => {
    const p = playerOnTopEdge();
    expect(beginDrawing(p, false)).toBeNull();
    expect(p.mode).toBe('onEdge');
  });

  it('startet nicht, wenn der Spieler nicht auf dem Rand ist (mode !== onEdge)', () => {
    const p = playerOnTopEdge();
    p.mode = 'drawing';
    expect(beginDrawing(p, true)).toBeNull();
  });

  it('Input-Abstraktion: der Trigger ist ein reiner Boolean, egal aus welcher Quelle', () => {
    const p = playerOnTopEdge();
    const fromGamepad = new EdgeTrigger().pressed(true);
    expect(beginDrawing(p, fromGamepad)).not.toBeNull();
    expect(p.mode).toBe('drawing');
  });
});

describe('headingFromInput – achsparallel, keine Diagonale', () => {
  const DOWN = { x: 0, y: 1 };

  it('ohne Cursor-Eingabe: null (nicht bewegen)', () => {
    expect(headingFromInput(null, HELD)).toBeNull();
    expect(headingFromInput(DOWN, HELD)).toBeNull();
  });

  it('frisch gelöst (current null): gedrückte Richtung, vertikale gewinnt bei Diagonale', () => {
    expect(headingFromInput(null, { ...HELD, down: true })).toEqual({ x: 0, y: 1 });
    expect(headingFromInput(null, { ...HELD, right: true })).toEqual({ x: 1, y: 0 });
    expect(headingFromInput(null, { ...HELD, down: true, right: true })).toEqual({ x: 0, y: 1 });
  });

  it('quer zur Fahrtrichtung: 90°-Abbiegen', () => {
    expect(headingFromInput(DOWN, { ...HELD, right: true })).toEqual({ x: 1, y: 0 });
    expect(headingFromInput(DOWN, { ...HELD, left: true })).toEqual({ x: -1, y: 0 });
  });

  it('in Fahrtrichtung: geradeaus weiter', () => {
    expect(headingFromInput(DOWN, { ...HELD, down: true })).toEqual(DOWN);
  });

  it('nur 180°-Wende gedrückt: null (kein Zurück auf die eigene Linie)', () => {
    expect(headingFromInput(DOWN, { ...HELD, up: true })).toBeNull();
  });

  it('diagonale Eingabe: das 90°-Abbiegen gewinnt', () => {
    expect(headingFromInput(DOWN, { ...HELD, down: true, right: true })).toEqual({ x: 1, y: 0 });
  });
});

describe('advanceDrawing – grün, aber nur Cursor bewegen', () => {
  it('Leertaste gedrückt, kein Cursor: Spieler bleibt stehen und grün', () => {
    const p = playerOnTopEdge();
    const session = beginDrawing(p, true)!;
    const before = { ...p.position };
    const done = advanceDrawing(session, p, field, HELD, 0.1, []);
    expect(done).toBe(false);
    expect(p.mode).toBe('drawing');
    expect(p.position).toEqual(before);
  });

  it('Cursor ins Feld: Spieler fährt achsparallel hinein', () => {
    const p = playerOnTopEdge();
    const session = beginDrawing(p, true)!;
    advanceDrawing(session, p, field, { ...HELD, down: true }, 0.1, []);
    expect(p.position.x).toBeCloseTo(400);
    expect(p.position.y).toBeCloseTo(DRAW_SPEED * 0.1);
    expect(p.mode).toBe('drawing');
  });

  it('Cursor aus dem Feld heraus (auf dem Rand): blockiert', () => {
    const p = playerOnTopEdge();
    const session = beginDrawing(p, true)!;
    const done = advanceDrawing(session, p, field, { ...HELD, up: true }, 0.1, []);
    expect(done).toBe(false);
    expect(p.position).toEqual({ x: 400, y: 0 });
    expect(p.mode).toBe('drawing');
  });

  it('ist Delta-Time-basiert (DRAW_SPEED px/s)', () => {
    const p = playerOnTopEdge();
    const session = beginDrawing(p, true)!;
    advanceDrawing(session, p, field, { ...HELD, down: true }, 0.5, []);
    expect(p.position.y).toBeCloseTo(DRAW_SPEED * 0.5);
  });

  it('90°-Abbiegen bewegt rein achsparallel weiter (kein Diagonalanteil)', () => {
    const p = playerOnTopEdge();
    const session = beginDrawing(p, true)!;
    advanceDrawing(session, p, field, { ...HELD, down: true }, 0.2, []);
    const yAfterDown = p.position.y;
    advanceDrawing(session, p, field, { ...HELD, right: true }, 0.2, []);
    expect(p.position.y).toBeCloseTo(yAfterDown);
    expect(p.position.x).toBeCloseTo(400 + DRAW_SPEED * 0.2);
  });
});

describe('advanceDrawing – Leertaste loslassen', () => {
  it('losgelassen, ohne sich bewegt zu haben: wieder "rot" auf dem Rand', () => {
    const p = playerOnTopEdge();
    const session = beginDrawing(p, true)!;
    const completed: DrawnLine[] = [];
    const done = advanceDrawing(session, p, field, NONE, 0.1, completed);
    expect(done).toBe(true);
    expect(p.mode).toBe('onEdge');
    expect(p.position).toEqual({ x: 400, y: 0 });
    expect(p.segmentIndex).toBe(0);
    expect(p.segmentProgress).toBeCloseTo(0.5);
    expect(completed).toHaveLength(0); // nichts gezeichnet → keine Linie
  });

  it('losgelassen im Feldinneren: Platzhalter – Spieler bleibt stehen (drawing)', () => {
    const p = playerOnTopEdge();
    const session = beginDrawing(p, true)!;
    for (let i = 0; i < 5; i++) advanceDrawing(session, p, field, { ...HELD, down: true }, 0.1, []);
    const inside = { ...p.position };
    const done = advanceDrawing(session, p, field, NONE, 0.1, []);
    expect(done).toBe(false);
    expect(p.mode).toBe('drawing');
    expect(p.position).toEqual(inside);
  });
});

describe('crossesOwnLine', () => {
  const line: DrawnLine = {
    points: [
      { x: 0, y: 0 },
      { x: 0, y: 50 },
      { x: 50, y: 50 },
      { x: 50, y: 20 },
    ],
  };

  it('erkennt das Kreuzen einer früheren Linien-Kante', () => {
    expect(crossesOwnLine(line, { x: 50, y: 15 }, { x: -10, y: 15 })).toBe(true);
  });

  it('meldet keinen Treffer für einen freien Schritt', () => {
    expect(crossesOwnLine(line, { x: 50, y: 15 }, { x: 50, y: 5 })).toBe(false);
  });

  it('ignoriert das zuletzt aufgezeichnete Segment (90°-Abbiegen erlaubt)', () => {
    expect(crossesOwnLine(line, { x: 60, y: 30 }, { x: 40, y: 30 })).toBe(false);
  });
});

describe('advanceDrawing – blockiert das Kreuzen der eigenen Linie', () => {
  it('verwirft den Frame-Schritt, wenn er die eigene Linie queren würde', () => {
    const p = playerOnTopEdge();
    const session = beginDrawing(p, true)!;
    session.line.points = [
      { x: 380, y: 0 },
      { x: 380, y: 60 },
      { x: 460, y: 60 },
    ];
    p.position = { x: 460, y: 30 };
    session.heading = { x: -1, y: 0 };

    const before = { ...p.position };
    const done = advanceDrawing(session, p, field, { ...HELD, left: true }, 0.5, []);

    expect(done).toBe(false);
    expect(p.position).toEqual(before);
  });
});

describe('advanceDrawing – Rand-Erkennung schliesst die Linie ab', () => {
  it('erreicht die gegenüberliegende Kante: Spieler zurück in onEdge, Linie gespeichert', () => {
    const p = playerOnTopEdge(); // (400, 0), Segment 0
    const session = beginDrawing(p, true)!;
    const completed: DrawnLine[] = [];

    let done = false;
    for (let i = 0; i < 10_000 && !done; i++) {
      done = advanceDrawing(session, p, field, { ...HELD, down: true }, 1 / 60, completed);
    }

    expect(done).toBe(true);
    expect(p.mode).toBe('onEdge');
    expect(p.segmentIndex).toBe(2); // untere Kante
    expect(p.position.x).toBeCloseTo(400);
    expect(p.position.y).toBeCloseTo(600);
    expect(p.segmentProgress).toBeCloseTo(0.5);

    expect(completed).toHaveLength(1);
    const pts = completed[0].points;
    expect(pts[0]).toEqual({ x: 400, y: 0 });
    expect(pts[pts.length - 1].x).toBeCloseTo(400);
    expect(pts[pts.length - 1].y).toBeCloseTo(600);
  });

  it('nach einem 90°-Abbiegen wird eine seitliche Kante erreicht', () => {
    const p = playerOnTopEdge(); // (400, 0)
    const session = beginDrawing(p, true)!;
    const completed: DrawnLine[] = [];

    let done = false;
    for (let i = 0; i < 10_000 && !done; i++) {
      const input = i < 60 ? { ...HELD, down: true } : { ...HELD, right: true };
      done = advanceDrawing(session, p, field, input, 1 / 60, completed);
    }

    expect(done).toBe(true);
    expect(p.mode).toBe('onEdge');
    expect(p.segmentIndex).toBe(1); // rechte Kante
    expect(completed).toHaveLength(1);
  });
});
