import { describe, it, expect } from 'vitest';
import {
  advanceDrawing,
  crossesOwnLine,
  DRAW_SPEED,
  EdgeTrigger,
  headingFromInput,
  toggleUndocked,
  tryEnterDrawing,
  type DrawInput,
  type DrawSession,
} from './drawing';
import { createRectangularField } from './field';
import type { DrawnLine } from './line';
import { Player } from './player';

const NONE: DrawInput = { up: false, down: false, left: false, right: false };
const field = createRectangularField(800, 600);

/** Spieler auf der oberen Kante (Segment 0), Position mittig darauf. */
function playerOnTopEdge(progress = 0.5): Player {
  const p = new Player(0, progress);
  p.syncPosition(field);
  return p;
}

/**
 * Simuliert den vollen Ablauf aus Instruktion 15, um in einem Test direkt zu
 * einer laufenden Zeichen-Session zu kommen: abdocken (Toggle), dann per
 * Richtungseingabe nach innen tatsächlich losfahren.
 */
function enterDrawing(p: Player, direction: Partial<DrawInput>): DrawSession {
  toggleUndocked(p, true);
  return tryEnterDrawing(p, field, { ...NONE, ...direction })!;
}

describe('EdgeTrigger – steigende Flanke (weiterhin für Neustart/Enter genutzt)', () => {
  it('feuert beim Drücken, nicht beim Halten, wieder nach Loslassen', () => {
    const trigger = new EdgeTrigger();
    expect(trigger.pressed(false)).toBe(false);
    expect(trigger.pressed(true)).toBe(true); // gedrückt
    expect(trigger.pressed(true)).toBe(false); // gehalten
    expect(trigger.pressed(false)).toBe(false); // losgelassen
    expect(trigger.pressed(true)).toBe(true); // erneut gedrückt
  });
});

describe('toggleUndocked – Abdocken/Abbrechen (Instruktion 15, Punkt 3 + 5)', () => {
  it('setzt isUndocked bei frischem Druck im onEdge-Zustand', () => {
    const p = playerOnTopEdge();
    expect(p.isUndocked).toBe(false);
    const posBefore = { ...p.position };

    toggleUndocked(p, true);

    expect(p.isUndocked).toBe(true);
    expect(p.mode).toBe('onEdge'); // keine Positions-/Modusänderung
    expect(p.position).toEqual(posBefore);
  });

  it('ein zweiter frischer Druck (noch onEdge) nimmt das Abdocken zurück', () => {
    const p = playerOnTopEdge();
    toggleUndocked(p, true);
    expect(p.isUndocked).toBe(true);

    toggleUndocked(p, true);

    expect(p.isUndocked).toBe(false);
  });

  it('ändert nichts ohne frischen Druck', () => {
    const p = playerOnTopEdge();
    toggleUndocked(p, false);
    expect(p.isUndocked).toBe(false);
  });

  it('hat keine Wirkung, solange der Spieler nicht onEdge ist', () => {
    const p = playerOnTopEdge();
    p.mode = 'drawing';
    toggleUndocked(p, true);
    expect(p.isUndocked).toBe(false);
  });
});

describe('tryEnterDrawing – Übergang onEdge → drawing (Instruktion 15, Punkt 4)', () => {
  it('bewirkt nichts, wenn der Spieler nicht abgedockt ist – Richtungseingabe nach innen bleibt wirkungslos', () => {
    const p = playerOnTopEdge();
    expect(p.isUndocked).toBe(false);

    const session = tryEnterDrawing(p, field, { ...NONE, down: true });

    expect(session).toBeNull();
    expect(p.mode).toBe('onEdge');
  });

  it('bewirkt nichts ohne Richtungseingabe, selbst wenn abgedockt', () => {
    const p = playerOnTopEdge();
    toggleUndocked(p, true);

    expect(tryEnterDrawing(p, field, NONE)).toBeNull();
    expect(p.mode).toBe('onEdge');
  });

  it('bewirkt nichts bei Eingabe ENTLANG der Kante (nicht nach innen)', () => {
    const p = playerOnTopEdge(); // obere Kante, "innen" = runter
    toggleUndocked(p, true);

    expect(tryEnterDrawing(p, field, { ...NONE, right: true })).toBeNull();
    expect(p.mode).toBe('onEdge');
    expect(p.isUndocked).toBe(true); // Toggle bleibt unberührt
  });

  it('wechselt bei abgedockter, klar nach innen gerichteter Eingabe zu drawing', () => {
    const p = playerOnTopEdge();
    const posBefore = { ...p.position };
    toggleUndocked(p, true);

    const session = tryEnterDrawing(p, field, { ...NONE, down: true });

    expect(session).not.toBeNull();
    expect(p.mode).toBe('drawing');
    expect(p.position).toEqual(posBefore); // Wechsel selbst bewegt noch nicht
    expect(session!.heading).toEqual({ x: 0, y: 1 }); // Richtung steht sofort fest
    expect(session!.hasLeftEdge).toBe(false);
    expect(session!.line.points).toEqual([posBefore]);
  });

  it('bei diagonaler Eingabe gewinnt die vertikale Richtung (wie headingFromInput)', () => {
    const p = playerOnTopEdge();
    toggleUndocked(p, true);
    const session = tryEnterDrawing(p, field, { ...NONE, down: true, right: true });
    expect(session!.heading).toEqual({ x: 0, y: 1 });
  });
});

describe('headingFromInput – achsparallel, keine Diagonale', () => {
  const DOWN = { x: 0, y: 1 };

  it('ohne Cursor-Eingabe: null (nicht bewegen)', () => {
    expect(headingFromInput(null, NONE)).toBeNull();
    expect(headingFromInput(DOWN, NONE)).toBeNull();
  });

  it('frisch gelöst (current null): gedrückte Richtung, vertikale gewinnt bei Diagonale', () => {
    expect(headingFromInput(null, { ...NONE, down: true })).toEqual({ x: 0, y: 1 });
    expect(headingFromInput(null, { ...NONE, right: true })).toEqual({ x: 1, y: 0 });
    expect(headingFromInput(null, { ...NONE, down: true, right: true })).toEqual({ x: 0, y: 1 });
  });

  it('quer zur Fahrtrichtung: 90°-Abbiegen', () => {
    expect(headingFromInput(DOWN, { ...NONE, right: true })).toEqual({ x: 1, y: 0 });
    expect(headingFromInput(DOWN, { ...NONE, left: true })).toEqual({ x: -1, y: 0 });
  });

  it('in Fahrtrichtung: geradeaus weiter', () => {
    expect(headingFromInput(DOWN, { ...NONE, down: true })).toEqual(DOWN);
  });

  it('nur 180°-Wende gedrückt: null (kein Zurück auf die eigene Linie)', () => {
    expect(headingFromInput(DOWN, { ...NONE, up: true })).toBeNull();
  });

  it('diagonale Eingabe: das 90°-Abbiegen gewinnt', () => {
    expect(headingFromInput(DOWN, { ...NONE, down: true, right: true })).toEqual({ x: 1, y: 0 });
  });
});

describe('advanceDrawing – grün, aber nur Cursor bewegen', () => {
  it('kein Cursor: Spieler bleibt stehen und grün', () => {
    const p = playerOnTopEdge();
    const session = enterDrawing(p, { down: true });
    const before = { ...p.position };
    const done = advanceDrawing(session, p, field, NONE, 0.1, []);
    expect(done).toBe(false);
    expect(p.mode).toBe('drawing');
    expect(p.position).toEqual(before);
  });

  it('Cursor ins Feld: Spieler fährt achsparallel hinein', () => {
    const p = playerOnTopEdge();
    const session = enterDrawing(p, { down: true }); // Eintritt selbst bewegt noch nicht
    advanceDrawing(session, p, field, { ...NONE, down: true }, 0.1, []);
    expect(p.position.x).toBeCloseTo(400);
    expect(p.position.y).toBeCloseTo(DRAW_SPEED * 0.1);
    expect(p.mode).toBe('drawing');
  });

  it('Cursor aus dem Feld heraus (auf dem Rand): blockiert', () => {
    const p = playerOnTopEdge();
    const session = enterDrawing(p, { down: true });
    const done = advanceDrawing(session, p, field, { ...NONE, up: true }, 0.1, []);
    expect(done).toBe(false);
    expect(p.position).toEqual({ x: 400, y: 0 });
    expect(p.mode).toBe('drawing');
  });

  it('ist Delta-Time-basiert (DRAW_SPEED px/s)', () => {
    const p = playerOnTopEdge();
    const session = enterDrawing(p, { down: true });
    const before = p.position.y;
    advanceDrawing(session, p, field, { ...NONE, down: true }, 0.5, []);
    expect(p.position.y - before).toBeCloseTo(DRAW_SPEED * 0.5);
  });

  it('90°-Abbiegen bewegt rein achsparallel weiter (kein Diagonalanteil)', () => {
    const p = playerOnTopEdge();
    const session = enterDrawing(p, { down: true });
    advanceDrawing(session, p, field, { ...NONE, down: true }, 0.2, []);
    const yAfterDown = p.position.y;
    advanceDrawing(session, p, field, { ...NONE, right: true }, 0.2, []);
    expect(p.position.y).toBeCloseTo(yAfterDown);
    expect(p.position.x).toBeCloseTo(400 + DRAW_SPEED * 0.2);
  });
});

describe('advanceDrawing – Bonusstein blockiert die Bewegung (Instruktion 14)', () => {
  it('verwirft den Frame-Schritt, wenn die Zielposition blockiert ist', () => {
    const p = playerOnTopEdge();
    const session = enterDrawing(p, { down: true });
    const before = { ...p.position };
    const alwaysBlocked = () => true;

    const done = advanceDrawing(session, p, field, { ...NONE, down: true }, 0.1, [], alwaysBlocked);

    expect(done).toBe(false);
    expect(p.position).toEqual(before);
  });

  it('bewegt sich normal, wenn die Zielposition NICHT blockiert ist', () => {
    const p = playerOnTopEdge();
    const session = enterDrawing(p, { down: true });
    const before = p.position.y;
    const neverBlocked = () => false;

    advanceDrawing(session, p, field, { ...NONE, down: true }, 0.1, [], neverBlocked);

    expect(p.position.y - before).toBeCloseTo(DRAW_SPEED * 0.1);
  });
});

describe('advanceDrawing – speedMultiplier (Instruktion 14, Geschwindigkeits-Boost)', () => {
  it('skaliert DRAW_SPEED, ohne die Konstante selbst zu verändern', () => {
    const p = playerOnTopEdge();
    const session = enterDrawing(p, { down: true });
    const before = p.position.y;

    advanceDrawing(session, p, field, { ...NONE, down: true }, 0.1, [], undefined, 2);

    expect(p.position.y - before).toBeCloseTo(DRAW_SPEED * 2 * 0.1);
    expect(DRAW_SPEED).toBe(160); // unverändert
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
    const session = enterDrawing(p, { down: true });
    session.line.points = [
      { x: 380, y: 0 },
      { x: 380, y: 60 },
      { x: 460, y: 60 },
    ];
    p.position = { x: 460, y: 30 };
    session.heading = { x: -1, y: 0 };

    const before = { ...p.position };
    const done = advanceDrawing(session, p, field, { ...NONE, left: true }, 0.5, []);

    expect(done).toBe(false);
    expect(p.position).toEqual(before);
  });
});

describe('advanceDrawing – Rand-Erkennung schliesst die Linie ab', () => {
  it('erreicht die gegenüberliegende Kante: Spieler zurück in onEdge, Linie gespeichert, isUndocked zurückgesetzt', () => {
    const p = playerOnTopEdge(); // (400, 0), Segment 0
    const session = enterDrawing(p, { down: true });
    const completed: DrawnLine[] = [];

    let done = false;
    for (let i = 0; i < 10_000 && !done; i++) {
      done = advanceDrawing(session, p, field, { ...NONE, down: true }, 1 / 60, completed);
    }

    expect(done).toBe(true);
    expect(p.mode).toBe('onEdge');
    expect(p.isUndocked).toBe(false); // automatisches Andocken setzt den Toggle zurück
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
    const session = enterDrawing(p, { down: true });
    const completed: DrawnLine[] = [];

    let done = false;
    for (let i = 0; i < 10_000 && !done; i++) {
      const input = i < 60 ? { ...NONE, down: true } : { ...NONE, right: true };
      done = advanceDrawing(session, p, field, input, 1 / 60, completed);
    }

    expect(done).toBe(true);
    expect(p.mode).toBe('onEdge');
    expect(p.segmentIndex).toBe(1); // rechte Kante
    expect(completed).toHaveLength(1);
  });
});
