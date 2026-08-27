export interface Point {
  x: number;
  y: number;
}

/**
 * Erzeugt das initiale, rechteckige Spielfeld als geschlossenes Polygon:
 * die vier Ecken im Uhrzeigersinn, beginnend oben links.
 *
 *   0 ─────────▶ 1     Segment i verbindet Ecke i mit Ecke (i + 1) % 4.
 *   ▲           │      Segment 0 = obere Kante, 1 = rechte, 2 = untere,
 *   │           ▼      3 = linke Kante. "Vorwärts" (steigender Segment-Index
 *   3 ◀───────── 2     bzw. steigender Fortschritt) bedeutet im Uhrzeigersinn.
 *
 * WICHTIG – Kontext für später, hier NICHT zu implementieren: Sobald der
 * Spieler Bereiche einschliessen kann, bleibt die "offene Fläche" nicht
 * rechteckig. Dieses Polygon bekommt dann zusätzliche Punkte und eine
 * komplexere Form. Deshalb ist das Feld schon jetzt als allgemeine Punktliste
 * modelliert und nicht als `{ x, y, width, height }`. Das Rechteck ist nur der
 * Startzustand bzw. Spezialfall.
 */
export function createRectangularField(width: number, height: number): Point[] {
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
}

/**
 * Start- und Endecke des Rand-Segments mit Index `i`. Das Polygon ist
 * geschlossen: das letzte Segment führt von der letzten Ecke zurück zur ersten.
 */
export function segmentEndpoints(polygon: Point[], i: number): [Point, Point] {
  const n = polygon.length;
  return [polygon[i % n], polygon[(i + 1) % n]];
}

/** Länge des Rand-Segments mit Index `i`. */
export function segmentLength(polygon: Point[], i: number): number {
  const [a, b] = segmentEndpoints(polygon, i);
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Weltposition für "Segment `i`, Fortschritt `p`" mit `p` in [0, 1]
 * (0 = Startecke des Segments, 1 = Endecke).
 */
export function pointOnPerimeter(polygon: Point[], i: number, p: number): Point {
  const [a, b] = segmentEndpoints(polygon, i);
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
}
