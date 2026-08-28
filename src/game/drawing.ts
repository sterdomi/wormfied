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
 *
 * Seit Instruktion 15 nur noch die Richtungstasten: das frühere `draw`-Feld
 * (durchgehend gehalten) brauchte einzig der inzwischen entfernte
 * "Leertaste loslassen"-Mechanismus (siehe `advanceDrawing`).
 */
export interface DrawInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/** Laufende Zeichen-Session: die entstehende Linie + die aktuelle Fahrtrichtung. */
export interface DrawSession {
  line: DrawnLine;
  /**
   * Achsparalleler Einheitsvektor – (±1,0) / (0,±1). Seit Instruktion 15
   * immer ab dem ersten Frame gesetzt: `tryEnterDrawing` bestimmt die
   * Anfangsrichtung direkt aus der Richtungseingabe, die den Übergang
   * `onEdge → drawing` überhaupt erst auslöst – anders als früher (Leertaste
   * löste den Wechsel ohne Richtung aus, Cursor kam ggf. erst später), daher
   * bleibt der `| null`-Typ hier nur aus Symmetrie zu `headingFromInput`
   * erhalten (dessen `current`-Parameter weiterhin `null` sein kann).
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
 * Steigende-Flanke-Detektor für einen booleschen Trigger – im Spiel noch für
 * den Neustart (Enter) genutzt (`restartTrigger` in `main.ts`). Die Leertaste
 * hat seit Instruktion 15 ihre eigene, input.ts-interne Flankenerkennung
 * (`InputState.drawJustPressed`), braucht diese Klasse also nicht mehr.
 *
 * `pressed(true)` liefert nur im ERSTEN Frame `true`, danach erst wieder nach
 * einem `pressed(false)` dazwischen.
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
 * Andock/Abdock-Toggle (Instruktion 15): auf dem Rand (`mode === 'onEdge'`)
 * schaltet ein frischer Tastendruck `player.isUndocked` um – ein zweiter
 * Druck, bevor der Spieler sich tatsächlich vom Rand entfernt hat, nimmt das
 * Abdocken wieder zurück (Punkt 3 UND 5 sind derselbe einfache Toggle). Für
 * sich genommen bewirkt das KEINE Positionsänderung – die normale
 * Rand-Bewegung (Instruktion 2) läuft unabhängig davon weiter.
 */
export function toggleUndocked(player: Player, drawJustPressed: boolean): void {
  if (player.mode !== 'onEdge' || !drawJustPressed) return;
  player.isUndocked = !player.isUndocked;
}

/**
 * Übergang `onEdge → drawing` (Instruktion 15, löst das leertasten-getriebene
 * `beginDrawing` aus Instruktion 3 ab): nur wenn der Spieler abgedockt ist
 * (`player.isUndocked`) UND die Richtungseingabe klar nach INNEN zeigt (per
 * Skalarprodukt mit der einwärts zeigenden Rand-Normale, wie zuvor der
 * "noch nicht losgefahren"-Schutz in `advanceDrawing`). Eingabe entlang der
 * Kante oder nach aussen hat hier bewusst KEINE Wirkung – der Spieler bleibt
 * dann auf der normalen Rand-Bewegung.
 *
 * Die Anfangsrichtung steht damit von Anfang an fest (kein "grün, aber noch
 * ohne Richtung"-Zwischenzustand mehr wie früher).
 */
export function tryEnterDrawing(
  player: Player,
  polygon: Point[],
  input: DrawInput,
): DrawSession | null {
  if (player.mode !== 'onEdge' || !player.isUndocked) return null;

  const wish = headingFromInput(null, input);
  if (!wish) return null;

  const inward = inwardNormal(polygon, player.segmentIndex);
  if (wish.x * inward.x + wish.y * inward.y <= 0) return null;

  player.mode = 'drawing';
  return {
    line: createLine(player.position),
    heading: wish,
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
 * `onEdge`: die Linie hat geometrisch den Rand erreicht (automatisches
 * Andocken, Instruktion 5/15 – die fertige Linie kommt in `completedLines`).
 * Ein "Loslassen der Leertaste, um mitten im Feld zum nächsten Randpunkt zu
 * verbinden" gibt es seit Instruktion 15 NICHT mehr (Toggle-Modell statt
 * Halten) – der Spieler bewegt sich frei weiter, bis er selbst zurück zum
 * Rand findet oder kollidiert.
 *
 * Rückgabe `false`, wenn weitergezeichnet wird ODER der Spieler stehen bleibt
 * (keine oder rein aussenwärtige Cursor-Eingabe, oder ein Bonusstein blockiert).
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
      // Automatisches Andocken (Instruktion 15, Punkt 6): der Spieler muss
      // sich für den nächsten Ausflug erneut abdocken.
      player.isUndocked = false;
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
