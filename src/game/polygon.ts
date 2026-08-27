import { segmentLength, type Point } from './field';
import { closestPointOnPerimeter } from './geometry';

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

/**
 * Welches der beiden Teilpolygone gilt als "erobert".
 *
 * TODO(Instruktion 6): Sobald der Gegner existiert, bestimmt DESSEN Position,
 * welche Seite erobert wird (die Seite OHNE Gegner) – nicht mehr die
 * Flächengrösse. Platzhalter bis dahin: das kleinere der beiden Polygone.
 */
export function determineClaimedRegion(regionA: Point[], regionB: Point[]): Point[] {
  return polygonArea(regionA) <= polygonArea(regionB) ? regionA : regionB;
}

export interface FieldSplit {
  /** Die eroberte Fläche (wird vollständig aus dem Foreground entfernt). */
  claimed: Point[];
  /** Das neue aktive Spielfeld-Polygon (die nicht-eroberte Seite). */
  active: Point[];
}

/** Splittet das Feld an der Linie und wählt die eroberte / aktive Seite. */
export function splitFieldByLine(polygon: Point[], line: Point[]): FieldSplit {
  const [a, b] = splitPolygonByLine(polygon, line);
  const claimed = determineClaimedRegion(a, b);
  return { claimed, active: claimed === a ? b : a };
}

export interface AppliedLine extends FieldSplit {
  /** Spieler-Segmentindex auf dem neuen aktiven Polygon (am Linien-Endpunkt). */
  playerSegmentIndex: number;
  /** Spieler-Fortschritt auf diesem Segment (0..1). */
  playerSegmentProgress: number;
}

/**
 * Verarbeitet eine abgeschlossene Linie: Feld splitten, eroberte Seite
 * bestimmen und den Spieler-Randzustand am Linien-Endpunkt auf dem neuen
 * aktiven Polygon ableiten (dort steht der Spieler nach Abschluss der Linie).
 */
export function applyCompletedLine(polygon: Point[], line: Point[]): AppliedLine {
  const split = splitFieldByLine(polygon, line);
  const proj = closestPointOnPerimeter(split.active, line[line.length - 1]);
  return {
    ...split,
    playerSegmentIndex: proj.segmentIndex,
    playerSegmentProgress: proj.progress,
  };
}
