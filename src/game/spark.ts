import { DRAW_SPEED } from './drawing';
import type { Point } from './field';
import type { DrawnLine } from './line';

/**
 * Berührt der Gegner die gezeichnete Linie, löst sich ein "Stromball" und fährt
 * die Linie entlang Richtung Spieler – mit doppelter Zeichengeschwindigkeit.
 * Ein Leben kostet es nur, wenn der Ball den Spieler tatsächlich erreicht.
 */
export const SPARK_SPEED = DRAW_SPEED * 2;

/** Trefferradius Stromball ↔ Spieler. */
export const SPARK_HIT_RADIUS = 10;

export interface Spark {
  /** Bereits zurückgelegte Bogenlänge ab dem Linien-Startpunkt (Punkt 0). */
  distance: number;
  /** Abgeleitete Weltposition (Rendering + Trefferprüfung). */
  position: Point;
}

/** Stützpunktkette der aktiven Linie inkl. Kopf (aktuelle Spielerposition). */
function pathOf(line: DrawnLine, head: Point): Point[] {
  return [...line.points, head];
}

function totalLength(path: Point[]): number {
  let sum = 0;
  for (let i = 1; i < path.length; i++) {
    sum += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  }
  return sum;
}

/** Weltposition bei Bogenlänge `s` entlang `path` (geklammert). */
function pointAtArcLength(path: Point[], s: number): Point {
  if (s <= 0) return { x: path[0].x, y: path[0].y };
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + segLen >= s) {
      const t = segLen === 0 ? 0 : (s - acc) / segLen;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    acc += segLen;
  }
  const last = path[path.length - 1];
  return { x: last.x, y: last.y };
}

/** Bogenlänge des Punktes auf `path`, der `p` am nächsten liegt. */
function arcLengthOfClosest(path: Point[], p: Point): number {
  let bestDist = Infinity;
  let bestArc = 0;
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const segLen = Math.hypot(abx, aby);
    const lenSq = abx * abx + aby * aby;
    const raw = lenSq === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
    const t = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    const d = Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
    if (d < bestDist) {
      bestDist = d;
      bestArc = acc + segLen * t;
    }
    acc += segLen;
  }
  return bestArc;
}

/** Erzeugt einen Stromball am (der Gegnerposition nächsten) Punkt der Linie. */
export function createSpark(line: DrawnLine, head: Point, enemyPos: Point): Spark {
  const path = pathOf(line, head);
  const distance = arcLengthOfClosest(path, enemyPos);
  return { distance, position: pointAtArcLength(path, distance) };
}

/**
 * Ein Frame Stromball-Bewegung: `SPARK_SPEED · dt` weiter Richtung Spieler
 * (Kopf-Ende der Linie). Mutiert `spark`. Rückgabe `true`, sobald der Ball den
 * Spieler erreicht hat – dann stirbt der Spieler.
 */
export function advanceSpark(spark: Spark, line: DrawnLine, head: Point, dt: number): boolean {
  const path = pathOf(line, head);
  const total = totalLength(path);
  spark.distance = Math.min(total, spark.distance + SPARK_SPEED * dt);
  spark.position = pointAtArcLength(path, spark.distance);

  const reachedHead = spark.distance >= total - 1e-6;
  const nearPlayer =
    Math.hypot(spark.position.x - head.x, spark.position.y - head.y) <= SPARK_HIT_RADIUS;
  return reachedHead || nearPlayer;
}
