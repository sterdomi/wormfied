import { segmentLength, type Point } from './field';
import { closestPointOnPerimeter } from './geometry';

/**
 * Ray-Casting-Punkt-in-Polygon-Test. Punkte exakt auf einer Kante liefern kein
 * definiertes Ergebnis (Randfall) – die Aufrufer behandeln das explizit.
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const straddlesY = a.y > point.y !== b.y > point.y;
    if (straddlesY && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Absolute Fläche eines geschlossenen Polygons (Gauss- / Shoelace-Formel).
 * Unabhängig von der Umlaufrichtung.
 */
export function polygonArea(polygon: Point[]): number {
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/**
 * Kleiner Abstand (in Bogenlänge), um Linien-Endpunkte, die exakt auf einer
 * Polygon-Ecke liegen, nicht zusätzlich als Ecke einzusammeln.
 */
const PARAM_EPSILON = 1e-6;

/**
 * Entfernt kollineare Zwischenpunkte und exakte Duplikate aus einem
 * geschlossenen Polygon – die Form bleibt exakt erhalten.
 *
 * Nötig, weil die gezeichnete Linie (distanzbasiert, alle paar Pixel ein Punkt)
 * sonst nach jedem Split hunderte fast identischer Rand-Segmente hinterlässt,
 * durch die sich der Spieler dann Schritt für Schritt quälen müsste.
 */
export function simplifyPolygon(polygon: Point[], epsilon = 1e-3): Point[] {
  let pts = polygon.filter((p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    return Math.hypot(p.x - q.x, p.y - q.y) > epsilon;
  });

  let changed = true;
  while (changed && pts.length > 3) {
    changed = false;
    const next: Point[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i - 1 + pts.length) % pts.length];
      const b = pts[i];
      const c = pts[(i + 1) % pts.length];
      // Zweifache Dreiecksfläche a-b-c; ~0 ⇒ b liegt auf der Strecke a→c.
      const twiceArea = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
      if (twiceArea < epsilon) changed = true;
      else next.push(b);
    }
    pts = next;
  }
  return pts;
}

/**
 * Teilt `polygon` an der abgeschlossenen Linie `line` (deren erster und letzter
 * Punkt je auf einer Polygon-Kante liegen) in ZWEI geschlossene Polygone.
 *
 * Idee: Start- und Endpunkt der Linie liegen bei den Bogenlängen `sA` bzw. `sB`
 * auf dem Rand. Das eine Teilpolygon besteht aus der Linie plus dem Rand-Bogen,
 * der von `sA` VORWÄRTS (steigende Bogenlänge, im Uhrzeigersinn, umlaufend)
 * nach `sB` läuft; das andere aus der Linie plus dem komplementären Bogen.
 * Beide werden so zusammengesetzt, dass ihre Umlaufrichtung der des
 * Ausgangspolygons (im Uhrzeigersinn) entspricht.
 */
export function splitPolygonByLine(polygon: Point[], line: Point[]): [Point[], Point[]] {
  const n = polygon.length;

  // Bogenlänge bis zur jeweiligen Ecke k.
  const cumulative: number[] = [0];
  for (let i = 1; i < n; i++) cumulative[i] = cumulative[i - 1] + segmentLength(polygon, i - 1);
  const perimeter = cumulative[n - 1] + segmentLength(polygon, n - 1);

  const locate = (p: Point): number => {
    const loc = closestPointOnPerimeter(polygon, p);
    return cumulative[loc.segmentIndex] + loc.progress * segmentLength(polygon, loc.segmentIndex);
  };
  const sA = locate(line[0]);
  const sB = locate(line[line.length - 1]);

  // Start ≈ Ende auf demselben Rand-Punkt: kein echter Split. Die Linie bildet
  // dann nur eine kleine Schlaufe – als "erobert" gilt sie selbst, das Feld
  // bleibt unverändert.
  const circDist = Math.min((sB - sA + perimeter) % perimeter, (sA - sB + perimeter) % perimeter);
  if (circDist < 1e-3) return [simplifyPolygon(line), polygon.slice()];

  // Ecken, die – vorwärts von `from` nach `to` (umlaufend) – auf dem Bogen
  // liegen, in Durchlaufreihenfolge.
  const arcVertices = (from: number, to: number): Point[] => {
    const arcLen = (to - from + perimeter) % perimeter;
    const hits: { d: number; point: Point }[] = [];
    for (let k = 0; k < n; k++) {
      const d = (cumulative[k] - from + perimeter) % perimeter;
      if (d > PARAM_EPSILON && d < arcLen - PARAM_EPSILON) hits.push({ d, point: polygon[k] });
    }
    hits.sort((x, y) => x.d - y.d);
    return hits.map((h) => h.point);
  };

  // region1: L0 → Rand-Bogen (sA vorwärts nach sB) → Lm → Linie rückwärts zu L1.
  const region1 = [line[0], ...arcVertices(sA, sB), ...line.slice(1).reverse()];
  // region2: Lm → Rand-Bogen (sB vorwärts nach sA) → L0 → Linie vorwärts zu L(m-1).
  const region2 = [line[line.length - 1], ...arcVertices(sB, sA), ...line.slice(0, -1)];

  return [simplifyPolygon(region1), simplifyPolygon(region2)];
}

/** Testpunkte auf dem Kreis um die Gegnerposition – so zählt das ganze
 *  Sprite mit, nicht nur der (auf einer Kante undefinierte) Mittelpunkt. */
const ENEMY_MEMBERSHIP_SAMPLES = 16;

/**
 * Grobes Mass dafür, wie stark der Gegner in `region` liegt: Mittelpunkt (zählt
 * doppelt, da verlässlichster Punkt) plus ein Kranz aus `ENEMY_MEMBERSHIP_SAMPLES`
 * Punkten im Sprite-Radius `radius`. `0` = Gegner ganz ausserhalb.
 */
function enemyOverlap(region: Point[], center: Point, radius: number): number {
  let count = isPointInPolygon(center, region) ? 2 : 0;
  if (radius > 0) {
    for (let i = 0; i < ENEMY_MEMBERSHIP_SAMPLES; i++) {
      const a = (i / ENEMY_MEMBERSHIP_SAMPLES) * Math.PI * 2;
      const p = { x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius };
      if (isPointInPolygon(p, region)) count++;
    }
  }
  return count;
}

/**
 * Welches der beiden Teilpolygone gilt als "erobert". Grundregel wie bisher:
 * das flächenmässig KLEINERE gewinnt. Aber – wie im Vorbild (Qix / Volfied) –
 * darf nie die Seite MIT dem Gegner erobert werden: er würde sonst in
 * erobertem Grund eingesperrt (Nutzer-Feedback), statt eingekesselt zu bleiben.
 *
 * Deshalb, wenn eine Gegnerposition (+ optional Sprite-`enemyRadius`) bekannt
 * ist:
 *  - Liegt der Gegner KLAR in der grösseren Seite (dort mind. doppelt so viel
 *    Sprite-Überlappung wie in der kleineren) → wie gewohnt die kleinere Seite
 *    erobern.
 *  - Ist der Gegner (auch nur teilweise) in der kleineren Seite oder sitzt er
 *    auf der Trennlinie → die kleinere Seite bleibt aktiv, die grössere wird
 *    erobert.
 *  - Gegner in KEINER Seite (bereits besiegt / weit weg) oder keine Position
 *    bekannt → die kleinere Seite gewinnt.
 */
export function determineClaimedRegion(
  regionA: Point[],
  regionB: Point[],
  enemyPosition?: Point,
  enemyRadius = 0,
): Point[] {
  const smaller = polygonArea(regionA) <= polygonArea(regionB) ? regionA : regionB;
  if (!enemyPosition) return smaller;

  const larger = smaller === regionA ? regionB : regionA;
  const inSmaller = enemyOverlap(smaller, enemyPosition, enemyRadius);
  const inLarger = enemyOverlap(larger, enemyPosition, enemyRadius);

  if (inSmaller === 0 && inLarger === 0) return smaller; // Gegner nirgends → Grundregel
  if (inLarger > inSmaller * 2) return smaller; // Gegner klar in der grösseren Seite
  return larger; // Gegner (teilweise) in der kleineren Seite / auf der Linie
}

export interface FieldSplit {
  /** Die eroberte Fläche (wird vollständig aus dem Foreground entfernt). */
  claimed: Point[];
  /** Das neue aktive Spielfeld-Polygon (die nicht-eroberte Seite). */
  active: Point[];
  /** Fläche von `claimed` – hier einmal berechnet, u.a. für die Prozentanzeige. */
  claimedArea: number;
}

/** Splittet das Feld an der Linie und wählt die eroberte / aktive Seite.
 *  `enemyRadius` (Sprite-Radius) macht die Seiten-Zuordnung robust, wenn der
 *  Gegner genau auf der neuen Linie / am Feldrand sitzt (siehe
 *  `determineClaimedRegion`). */
export function splitFieldByLine(
  polygon: Point[],
  line: Point[],
  enemyPosition?: Point,
  enemyRadius = 0,
): FieldSplit {
  const [a, b] = splitPolygonByLine(polygon, line);
  const claimed = determineClaimedRegion(a, b, enemyPosition, enemyRadius);
  return { claimed, active: claimed === a ? b : a, claimedArea: polygonArea(claimed) };
}

export interface AppliedLine extends FieldSplit {
  /** Spieler-Segmentindex auf dem neuen aktiven Polygon (am Linien-Endpunkt). */
  playerSegmentIndex: number;
  /** Spieler-Fortschritt auf diesem Segment (0..1). */
  playerSegmentProgress: number;
}

/**
 * Verarbeitet eine abgeschlossene Linie: Feld splitten, eroberte Seite
 * bestimmen (anhand der Gegnerposition, siehe `determineClaimedRegion`) und den
 * Spieler-Randzustand am Linien-Endpunkt auf dem neuen aktiven Polygon ableiten
 * (dort steht der Spieler nach Abschluss der Linie).
 */
export function applyCompletedLine(
  polygon: Point[],
  line: Point[],
  enemyPosition?: Point,
  enemyRadius = 0,
): AppliedLine {
  const split = splitFieldByLine(polygon, line, enemyPosition, enemyRadius);
  const proj = closestPointOnPerimeter(split.active, line[line.length - 1]);
  return {
    ...split,
    playerSegmentIndex: proj.segmentIndex,
    playerSegmentProgress: proj.progress,
  };
}
