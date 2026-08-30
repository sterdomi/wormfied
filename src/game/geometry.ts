import type { Point } from './field';

export interface SegmentHit {
  point: Point;
  /** Parameter entlang der ersten Strecke p1→p2 (0..1). */
  t: number;
  /** Parameter entlang der zweiten Strecke p3→p4 (0..1). */
  u: number;
}

/**
 * Schnittpunkt zweier Strecken p1→p2 und p3→p4, oder `null` wenn sie sich nicht
 * innerhalb ihrer Längen schneiden.
 *
 * Parallele und kollineare Strecken werden als "kein Schnitt" behandelt – für
 * die Rand-Erkennung beim Zeichnen (Bewegungsschritt gegen Polygon-Kanten)
 * reicht das; ein exakt entlang der Kante verlaufender Schritt zählt bewusst
 * nicht als Treffer.
 */
export function segmentIntersection(p1: Point, p2: Point, p3: Point, p4: Point): SegmentHit | null {
  const rx = p2.x - p1.x;
  const ry = p2.y - p1.y;
  const sx = p4.x - p3.x;
  const sy = p4.y - p3.y;

  const denom = rx * sy - ry * sx;
  if (denom === 0) return null;

  const qx = p3.x - p1.x;
  const qy = p3.y - p1.y;
  const t = (qx * sy - qy * sx) / denom;
  const u = (qx * ry - qy * rx) / denom;

  if (t < 0 || t > 1 || u < 0 || u > 1) return null;

  return { point: { x: p1.x + t * rx, y: p1.y + t * ry }, t, u };
}

export interface PerimeterProjection {
  /** Nächstgelegener Punkt auf dem Polygonrand. */
  point: Point;
  /** Segment, auf dem dieser Punkt liegt. */
  segmentIndex: number;
  /** Fortschritt auf diesem Segment (0..1). */
  progress: number;
  /** Abstand von `p` zu `point`. */
  distance: number;
}

/**
 * Projiziert `p` auf den geschlossenen Polygonrand und liefert den
 * nächstgelegenen Randpunkt samt Segment, Fortschritt und Abstand.
 */
export function closestPointOnPerimeter(polygon: Point[], p: Point): PerimeterProjection {
  const n = polygon.length;
  let best: PerimeterProjection | null = null;

  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lenSq = abx * abx + aby * aby;
    const raw = lenSq === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
    const t = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    const point = { x: a.x + abx * t, y: a.y + aby * t };
    const distance = Math.hypot(p.x - point.x, p.y - point.y);

    if (!best || distance < best.distance) {
      best = { point, segmentIndex: i, progress: t, distance };
    }
  }

  if (!best) throw new Error('closestPointOnPerimeter: leeres Polygon');
  return best;
}

/**
 * Wie `closestPointOnPerimeter`, aber für eine OFFENE Punktkette (Polyline) –
 * kein Segment vom letzten zurück zum ersten Punkt. `distance` ist `Infinity`
 * bei weniger als zwei Punkten.
 */
export function closestPointOnPolyline(polyline: readonly Point[], p: Point): PerimeterProjection {
  let best: PerimeterProjection | null = null;
  for (let i = 0; i + 1 < polyline.length; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lenSq = abx * abx + aby * aby;
    const raw = lenSq === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
    const t = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    const point = { x: a.x + abx * t, y: a.y + aby * t };
    const distance = Math.hypot(p.x - point.x, p.y - point.y);
    if (!best || distance < best.distance) best = { point, segmentIndex: i, progress: t, distance };
  }
  return best ?? { point: { ...p }, segmentIndex: -1, progress: 0, distance: Infinity };
}

/**
 * Kreuzt die Strecke `from → to` eine der Kanten der offenen Punktkette
 * `polyline`? Für „die aktive Zeichenlinie ist eine Wand für Gegner"
 * (Nutzer-Feedback): ein Gegner-Schritt, der die Linie schneidet, ist verboten.
 */
export function segmentCrossesPolyline(
  from: Point,
  to: Point,
  polyline: readonly Point[],
): boolean {
  for (let i = 0; i + 1 < polyline.length; i++) {
    if (segmentIntersection(from, to, polyline[i], polyline[i + 1])) return true;
  }
  return false;
}
