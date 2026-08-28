import { inwardNormal, type Point } from './field';
import { closestPointOnPerimeter, segmentIntersection } from './geometry';
import { appendPoint, createLine, type DrawnLine } from './line';
import type { Player } from './player';
import { clamp } from '../utils/math';

/**
 * Geschwindigkeit beim Zeichnen im Feld (Pixel/Sekunde). Eigene Konstante,
 * unabhängig von der Rand-Geschwindigkeit (`EDGE_SPEED = 220`).
 */
export const DRAW_SPEED = 160;

/**
 * Abstand zum Feld-Rand, bis zu dem der Spieler als "noch auf dem Rand" gilt.
 * Klein gehalten: fängt nur "steht exakt auf der Kante" und Float-Rauschen ab.
 */
const EDGE_EPSILON = 0.5;

/**
 * Nur die für das Zeichnen relevanten Felder des abstrakten `InputState`.
 * Entkoppelt `drawing.ts` von `engine/input.ts` – jede Eingabequelle, die ein
 * strukturell passendes Objekt liefert, funktioniert (auch ein Test-Literal).
 */
export interface DrawInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  /**
   * Leertaste GEHALTEN. Solange `true`, ist der Spieler "grün"/gelöst; wird sie
   * losgelassen, dockt er wieder an den Rand an (wenn er noch dort ist) bzw.
   * bleibt stehen (Platzhalter, wenn schon im Feldinneren). Das AUSLÖSEN läuft
   * über die steigende Flanke (siehe `EdgeTrigger`), nicht über diesen Wert.
   */
  draw: boolean;
}

/** Laufende Zeichen-Session: die entstehende Linie + die aktuelle Fahrtrichtung. */
export interface DrawSession {
  line: DrawnLine;
  /**
   * Achsparalleler Einheitsvektor – (±1,0) / (0,±1) – oder `null`, solange der
   * Spieler seit dem Lösen noch keine Cursor-Richtung gewählt hat.
   */
  heading: Point | null;
  /**
   * Wird `true`, sobald sich der Spieler das erste Mal vom Rand gelöst hat.
   * Davor: Cursor nach aussen ist blockiert und ein Rand-Kontakt zählt nicht
   * als Andocken (der Spieler steht ja noch auf der Start-Kante). Danach zählt
   * jeder Rand-Kontakt.
   */
  hasLeftEdge: boolean;
}

export interface PerimeterHit {
  point: Point;
  segmentIndex: number;
  /** Fortschritt auf dem getroffenen Segment (0..1). */
  progress: number;
}

/**
 * Steigende-Flanke-Detektor für einen booleschen Trigger (hier: Leertaste).
 *
 * `pressed(true)` liefert nur im ERSTEN Frame `true`, danach erst wieder nach
 * einem `pressed(false)` dazwischen. Dadurch kann man nach dem Wieder-Andocken
 * an den Rand nicht durch blosses Gedrückthalten sofort erneut lösen – die
 * Leertaste muss dafür neu gedrückt werden.
 */
export class EdgeTrigger {
  private wasActive = false;

  pressed(active: boolean): boolean {
    const rising = active && !this.wasActive;
    this.wasActive = active;
    return rising;
  }
}

/**
 * "Löst" den Spieler vom Rand, wenn er dort ist (`mode === 'onEdge'`) UND die
 * Leertaste in DIESEM Frame neu gedrückt wurde (`drawPressed`).
 *
 * Wichtig: Der Spieler bewegt sich dabei NICHT. Er wird nur "grün" und wartet
 * auf Cursor-Eingabe. Ohne Cursor-Eingabe – und anschliessendem Loslassen der
 * Leertaste – dockt er unverändert wieder an (siehe `advanceDrawing`).
 */
export function beginDrawing(player: Player, drawPressed: boolean): DrawSession | null {
  if (player.mode !== 'onEdge' || !drawPressed) return null;

  player.mode = 'drawing';
  return {
    line: createLine(player.position),
    heading: null,
    hasLeftEdge: false,
  };
}

/**
 * Fahrtrichtung fürs nächste Frame aus dem Cursor-Zustand. NUR achsparallel,
 * keine Diagonale. `null` bedeutet "diesen Frame nicht bewegen".
 *
 *  - keine Cursor-Taste                       → `null` (stehen bleiben)
 *  - `current === null` (frisch gelöst)       → gedrückte Richtung; bei zwei
 *    Achsen gewinnt die vertikale (senkrecht zu den waagrechten Start-Kanten)
 *  - Taste quer zur aktuellen Richtung        → 90°-Abbiegen
 *  - Taste in aktueller Richtung              → geradeaus weiter
 *  - nur Taste GEGEN die aktuelle Richtung    → `null` (kein Zurück auf die Linie)
 */
export function headingFromInput(current: Point | null, input: DrawInput): Point | null {
  const wishX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const wishY = (input.down ? 1 : 0) - (input.up ? 1 : 0);

  const candidates: Point[] = [];
  if (wishX !== 0) candidates.push({ x: wishX, y: 0 });
  if (wishY !== 0) candidates.push({ x: 0, y: wishY });
  if (candidates.length === 0) return null;

  if (current === null) {
    return candidates.find((c) => c.x === 0) ?? candidates[0];
  }

  // Skalarprodukt 0 ⇒ senkrecht zur aktuellen Richtung ⇒ 90°-Abbiegen.
  const turn = candidates.find((c) => c.x * current.x + c.y * current.y === 0);
  if (turn) return turn;

  const straight = candidates.find((c) => c.x === current.x && c.y === current.y);
  return straight ?? null;
}

/**
 * Schneidet der Bewegungsschritt `from → to` eine bereits gezeichnete
 * Linien-Kante? Das zuletzt aufgezeichnete Segment wird ausgeklammert – dort
 * hängt der aktuelle Schritt zwangsläufig an, ein 90°-Abbiegen ist erlaubt.
 */
export function crossesOwnLine(line: DrawnLine, from: Point, to: Point): boolean {
  const pts = line.points;
  for (let i = 0; i < pts.length - 2; i++) {
    const hit = segmentIntersection(from, to, pts[i], pts[i + 1]);
    // `t === 0` == Berührung direkt am Startpunkt `from` (dem Ende des bisher
    // gezeichneten Pfads) – das ist kein echtes Kreuzen.
    if (hit && hit.t > 0) return true;
  }
  return false;
}

/**
 * Ein Frame Zeichen-Bewegung. Mutiert `player` und `session`.
 *
 * Rückgabe `true`, wenn die Session verbraucht ist – der Spieler ist wieder
 * `onEdge`:
 *  - Linie hat den Rand erreicht → fertige Linie kommt in `completedLines`
 *  - Leertaste im Feldinneren losgelassen → gerade Verbindung zum
 *    nächstgelegenen Randpunkt, fertige Linie kommt in `completedLines`
 *  - Leertaste losgelassen, bevor der Spieler je losgefahren ist → er dockt
 *    unverändert wieder an, die (leere/entartete) Linie wird verworfen
 *
 * Rückgabe `false`, wenn weitergezeichnet wird ODER der Spieler stehen bleibt
 * (keine oder rein aussenwärtige Cursor-Eingabe, während die Leertaste hält).
 */
export function advanceDrawing(
  session: DrawSession,
  player: Player,
  polygon: Point[],
  input: DrawInput,
  dt: number,
  completedLines: DrawnLine[],
  /** Liefert `true`, wenn `p` ein Hindernis (z.B. ein Bonusstein, Instruktion
   *  14) schneiden würde – die Bewegung diesen Frame wird dann verworfen. */
  isBlocked?: (p: Point) => boolean,
  /** Multiplikator auf `DRAW_SPEED`, z.B. für einen aktiven Geschwindigkeits-
   *  Boost (Instruktion 14) – die Konstante selbst bleibt dabei unverändert. */
  speedMultiplier = 1,
): boolean {
  const from: Point = { x: player.position.x, y: player.position.y };

  if (!input.draw) {
    const snap = closestPointOnPerimeter(polygon, from);

    if (!session.hasLeftEdge) {
      // Nie vom Rand gelöst → unverändert wieder andocken, "rot". Die
      // (leere/entartete) Linie wird verworfen.
      player.segmentIndex = snap.segmentIndex;
      player.segmentProgress = snap.progress;
      player.position = { x: snap.point.x, y: snap.point.y };
      player.mode = 'onEdge';
      return true;
    }

    // Leertaste mitten im Feld losgelassen: gerade Verbindung zum
    // nächstgelegenen Randpunkt ergänzen, dann die Linie normal abschliessen
    // (der Aufrufer splittet daraufhin das Feld).
    //
    // TODO(später): Der Gegner existiert inzwischen; das eigentliche Abbrechen
    // bzw. Bestrafen (Linie bricht ab ohne Fläche zu erobern, oder kostet ein
    // Leben) hängt am Leben-/Schild-System der nächsten Instruktion. Bis dahin
    // ist diese Regel ein Platzhalter ohne Risiko.
    appendPoint(session.line, snap.point, 0);
    player.position = { x: snap.point.x, y: snap.point.y };
    player.segmentIndex = snap.segmentIndex;
    player.segmentProgress = snap.progress;
    player.mode = 'onEdge';
    completedLines.push(session.line);
    return true;
  }

  const heading = headingFromInput(session.heading, input);
  if (!heading) return false; // keine Cursor-Eingabe → "grün" stehen bleiben

  // Solange der Spieler noch nicht losgefahren ist, darf er nur ins Feld hinein
  // oder an der Kante entlang – nicht nach aussen aus dem Feld heraus.
  if (!session.hasLeftEdge) {
    const inward = inwardNormal(polygon, closestPointOnPerimeter(polygon, from).segmentIndex);
    if (heading.x * inward.x + heading.y * inward.y < 0) return false;
  }

  session.heading = heading;

  const step = DRAW_SPEED * speedMultiplier * dt;
  const to: Point = { x: from.x + heading.x * step, y: from.y + heading.y * step };

  // Bonusstein wirkt wie eine feste Wand (Instruktion 14, Punkt 5): einfache
  // "Bewegung blockieren"-Lösung, keine Ausweich-/Gleit-Physik – der Spieler
  // bleibt diesen Frame auf der letzten gültigen Position stehen.
  if (isBlocked?.(to)) return false;

  // Rand-Kontakt zählt erst als Andocken, wenn der Spieler sich vom Rand gelöst
  // hat – sonst würde der Startpunkt auf der Einfahrtskante sofort treffen.
  if (session.hasLeftEdge) {
    const hit = findPerimeterHit(polygon, from, to);
    if (hit) {
      appendPoint(session.line, hit.point, 0); // Endpunkt exakt übernehmen
      player.position = { x: hit.point.x, y: hit.point.y };
      player.segmentIndex = hit.segmentIndex;
      player.segmentProgress = hit.progress;
      player.mode = 'onEdge';
      completedLines.push(session.line);
      return true;
    }
  }

  // Eigene Linie nicht kreuzen: Schritt in diesem Frame verwerfen.
  if (crossesOwnLine(session.line, from, to)) return false;

  player.position = to;
  player.facing = heading; // tatsächliche Bewegung → Blickrichtung nachziehen
  appendPoint(session.line, to); // distanzbasiert – siehe line.ts

  // Einmal deutlich vom Rand entfernt: ab jetzt zählt jeder Rand-Kontakt.
  if (!session.hasLeftEdge && closestPointOnPerimeter(polygon, to).distance > EDGE_EPSILON) {
    session.hasLeftEdge = true;
  }
  return false;
}

/**
 * Erster Schnittpunkt des Bewegungsschritts `from → to` mit einer Polygon-Kante
 * (der mit kleinstem t, also der dem Spieler nächste), oder `null`. Reine
 * Geometrie – das Ausblenden des Startrands passiert im Aufrufer.
 */
export function findPerimeterHit(polygon: Point[], from: Point, to: Point): PerimeterHit | null {
  let best: (PerimeterHit & { t: number }) | null = null;

  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const hit = segmentIntersection(from, to, a, b);
    if (!hit) continue;
    if (best && hit.t >= best.t) continue;

    best = { point: hit.point, segmentIndex: i, progress: clamp(hit.u, 0, 1), t: hit.t };
  }

  if (!best) return null;
  return { point: best.point, segmentIndex: best.segmentIndex, progress: best.progress };
}
