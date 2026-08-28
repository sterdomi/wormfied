import { pointOnPerimeter, segmentLength, type Point } from './field';
import type { Player } from './player';

/** Bewegungsgeschwindigkeit des Spielers entlang des Feldrands (Pixel/Sekunde). */
export const EDGE_SPEED = 220;

/** Tastenzustand, wie ihn `setupInput()` liefert. */
export interface KeyInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

function clampUnit(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Laufrichtung ENTLANG DER AKTUELLEN KANTE aus dem Tastenzustand:
 *   +1 = im Uhrzeigersinn  (Polygon-Fortschritt steigt),
 *   -1 = gegen den Uhrzeigersinn,
 *    0 = keine oder widersprüchliche / quer stehende Eingabe.
 *
 * Idee (der kniffligste Teil des Auftrags, daher ausführlich):
 * Die gedrückten Pfeiltasten ergeben einen Wunsch-Richtungsvektor in
 * Bildschirmkoordinaten (x nach rechts, y nach unten). Diesen projizieren wir
 * per Skalarprodukt auf den Richtungsvektor der aktuellen Kante. Zeigt der
 * Wunsch grob in Kantenrichtung, ergibt das +1; zeigt er dagegen, -1; steht er
 * quer zur Kante, ist das Skalarprodukt 0 und der Spieler bleibt stehen.
 *
 * Damit ergibt sich die im Auftrag geforderte Logik automatisch je Kante:
 *   - obere Kante  (Richtung +x):  Pfeil-rechts → +1,  Pfeil-links  → -1
 *   - rechte Kante (Richtung +y):  Pfeil-runter → +1,  Pfeil-hoch   → -1
 *   - untere Kante (Richtung -x):  Pfeil-links  → +1,  Pfeil-rechts → -1
 *   - linke Kante  (Richtung -y):  Pfeil-hoch   → +1,  Pfeil-runter → -1
 * Tasten quer zur Kante (z.B. Pfeil-hoch auf der oberen Kante) bewirken nichts,
 * deshalb ist auch kein Diagonal-Handling nötig.
 */
export function edgeDirectionFromInput(
  polygon: Point[],
  segmentIndex: number,
  keys: KeyInput,
): -1 | 0 | 1 {
  const wishX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const wishY = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  if (wishX === 0 && wishY === 0) return 0;

  const n = polygon.length;
  const a = polygon[segmentIndex % n];
  const b = polygon[(segmentIndex + 1) % n];
  const dot = wishX * (b.x - a.x) + wishY * (b.y - a.y);

  if (dot > 0) return 1;
  if (dot < 0) return -1;
  return 0;
}

/**
 * Verschiebt (`segmentIndex`, `progress`) um eine VORZEICHENBEHAFTETE Distanz
 * `distance` entlang des geschlossenen Polygonrands.
 *
 * Läuft die Distanz über das Ende eines Segments hinaus, wird der Rest auf dem
 * nächsten Segment fortgesetzt (bei negativer Distanz umgekehrt auf dem
 * vorherigen). Genau daraus entsteht der automatische Ecken-Übergang: Wer auf
 * der oberen Kante nach rechts läuft und die obere-rechte Ecke erreicht, biegt
 * ohne Sonderbehandlung auf die rechte Kante ab.
 */
export function advanceAlongPerimeter(
  polygon: Point[],
  segmentIndex: number,
  progress: number,
  distance: number,
): { segmentIndex: number; progress: number } {
  const n = polygon.length;
  let i = ((segmentIndex % n) + n) % n;
  let len = segmentLength(polygon, i);
  let dist = progress * len + distance;

  // Schutz gegen entartete Polygone (Segmente der Länge 0): Iterationen deckeln.
  const maxSteps = n * 4 + 8;
  let guard = 0;

  while (dist < 0 && guard++ < maxSteps) {
    i = (i - 1 + n) % n;
    len = segmentLength(polygon, i);
    dist += len;
  }
  while (dist >= len && guard++ < maxSteps) {
    dist -= len;
    i = (i + 1) % n;
    len = segmentLength(polygon, i);
  }

  return { segmentIndex: i, progress: len > 0 ? clampUnit(dist / len) : 0 };
}

/**
 * Bewegt den Spieler für einen Frame entlang des Feldrands, basierend auf dem
 * aktuellen Tastenzustand und der Frame-Zeit `dt` (Sekunden) aus dem Game-Loop.
 * Die Bewegung ist damit framerate-unabhängig. Mutiert den übergebenen Spieler
 * und hält seine Weltposition konsistent.
 */
export function movePlayerAlongEdge(
  player: Player,
  polygon: Point[],
  keys: KeyInput,
  dt: number,
  /** Multiplikator auf `EDGE_SPEED`, z.B. für einen aktiven Geschwindigkeits-
   *  Boost (Instruktion 14) – die Konstante selbst bleibt dabei unverändert. */
  speedMultiplier = 1,
): void {
  const n = polygon.length;
  let segmentIndex = player.segmentIndex;
  let progress = player.segmentProgress;
  let dir = edgeDirectionFromInput(polygon, segmentIndex, keys);

  // An einer Ecke (progress ≈ 0 oder ≈ 1) grenzt der Spieler an ZWEI Segmente.
  // Steht das aktuelle Segment quer zur Eingabe (dir 0), aufs Nachbarsegment
  // umsteigen, falls die Eingabe DORT entlang zeigt. Wichtig z.B. direkt nach
  // einem Feld-Split, wo der Spieler exakt auf einer Ecke platziert wird.
  const AT_VERTEX = 1e-6;
  if (dir === 0) {
    const nextSeg = (segmentIndex + 1) % n;
    const prevSeg = (segmentIndex - 1 + n) % n;
    if (progress >= 1 - AT_VERTEX && edgeDirectionFromInput(polygon, nextSeg, keys) === 1) {
      segmentIndex = nextSeg;
      progress = 0;
      dir = 1;
    } else if (progress <= AT_VERTEX && edgeDirectionFromInput(polygon, prevSeg, keys) === -1) {
      segmentIndex = prevSeg;
      progress = 1;
      dir = -1;
    }
  }

  if (dir !== 0) {
    // Blickrichtung = Kantenvektor der Kante, auf der dieser Schritt beginnt,
    // mit Laufrichtung (`dir`) vorzeichenbehaftet – bleibt für die ganze
    // (gerade) Kante konstant. Nur bei tatsächlicher Bewegung aktualisiert,
    // siehe `Player.facing`.
    const a = polygon[segmentIndex % n];
    const b = polygon[(segmentIndex + 1) % n];
    const edgeLen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    player.facing = { x: ((b.x - a.x) / edgeLen) * dir, y: ((b.y - a.y) / edgeLen) * dir };

    const next = advanceAlongPerimeter(
      polygon,
      segmentIndex,
      progress,
      dir * EDGE_SPEED * speedMultiplier * dt,
    );
    segmentIndex = next.segmentIndex;
    progress = next.progress;
  }

  player.segmentIndex = segmentIndex;
  player.segmentProgress = progress;
  player.position = pointOnPerimeter(polygon, segmentIndex, progress);
}
