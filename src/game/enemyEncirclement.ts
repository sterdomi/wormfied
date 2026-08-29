import type { Point } from './field';
import type { Vec } from './enemy';
import { fitsInPolygon } from './enemyMovement';

/**
 * Wie stark der Hauptgegner schrumpft, wenn ihm wenig Raum bleibt (Nutzer-
 * Feedback, drei Runden):
 *
 * 1. Erste Fassung mass "eingekesselt" an der GESAMT eroberten Fläche
 *    (`getClaimedPercentage`) – schrumpfte dadurch schon bei irgendeiner
 *    Eroberung irgendwo im Feld, unabhängig davon, ob um den Gegner herum
 *    überhaupt eng wurde ("wird zu schnell klein").
 * 2. Zweite Fassung schätzte die erreichbare Fläche per Grid-Flood-Fill –
 *    korrekt, aber aufwändiger als nötig.
 * 3. Dritte Fassung (Nutzer-Feedback: "auf der x Achse und auf der y Achse
 *    in beide Richtungen schauen, das ergibt auch ein Rechteck"): von der
 *    aktuellen Position aus in alle vier Achsrichtungen "strahlen", bis
 *    `fitsInPolygon` fehlschlägt (dieselbe Marge wie `moveEnemy`) – ein zu
 *    enger Durchgang stoppt den Strahl an genau der Stelle, unabhängig
 *    davon, wie weit das Polygon dahinter tatsächlich reicht, zählt also
 *    korrekt nicht mit. Die vier Reichweiten ergeben ein Rechteck
 *    (Breite × Höhe) um den Gegner.
 * 4. Jetzt (Nutzer-Feedback: "wird zu schnell klein, verschärfe
 *    Voraussetzungen") – zwei Verschärfungen, beide vom Aufrufer
 *    (`main.ts`) durchgesetzt:
 *    - Der Flächen-Trigger sank von "unter dem Doppelten der eigenen
 *      Fläche" auf `ENCIRCLEMENT_TRIGGER_MULTIPLIER` (1.3× statt 2×) – es
 *      muss spürbar enger werden, bevor überhaupt geschrumpft wird.
 *    - Zusätzliche Bedingung: der Hauptgegner schrumpft nur noch, wenn ALLE
 *      Mini-Gegner bereits besiegt sind (`main.ts`,
 *      `recomputeMainEnemyEncirclementScale`) – solange noch welche
 *      unterwegs sind, bleibt er in voller Grösse.
 *
 * Bewusst NICHT pro Frame neu berechnet – der Aufrufer (`main.ts`) ruft das
 * nur bei einer tatsächlichen Feldänderung (Level-Start, abgeschlossene
 * Linie) oder einem besiegten Mini-Gegner neu auf; zwischen zwei solchen
 * Ereignissen kann sich die erreichbare Fläche des Gegners ohnehin nicht
 * ändern, da `moveEnemy` ihn nie über eine zu enge Stelle hinaus lässt.
 */

/** Minimaler Render-Skalierungsfaktor bei starker Einkesselung. */
export const MAIN_ENEMY_MIN_SIZE_SCALE = 0.3;

/** Ab welchem Vielfachen der eigenen Fläche noch NICHT geschrumpft wird
 *  (Nutzer-Feedback: "verschärfe Voraussetzungen" – vorher 2×, jetzt 1.3×:
 *  es muss spürbar enger werden, bevor der Hauptgegner überhaupt kleiner
 *  wird). */
export const ENCIRCLEMENT_TRIGGER_MULTIPLIER = 1.3;

/** Schrittweite (Pixel) beim Abtasten jeder Achsrichtung – klein genug, um
 *  einen zu engen Durchgang zuverlässig zu erkennen (deutlich kleiner als
 *  übliche Gegner-Margen), günstig genug für nur vier Strahlen. */
export const REACH_STEP = 4;

const CARDINAL_DIRECTIONS: readonly Vec[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/**
 * Wie weit `from` sich in Richtung `dir` bewegen könnte, bevor `fitsInPolygon`
 * (volle `margin` Abstand zum Rand) fehlschlägt – in `step`-Schritten
 * abgetastet, `0` falls schon der erste Schritt fehlschlägt.
 */
function reachInDirection(
  polygon: Point[],
  from: Point,
  margin: number,
  dir: Vec,
  step: number,
  maxDistance: number,
): number {
  let distance = 0;
  while (distance < maxDistance) {
    const next = distance + step;
    const point = { x: from.x + dir.x * next, y: from.y + dir.y * next };
    if (!fitsInPolygon(point, polygon, margin)) break;
    distance = next;
  }
  return distance;
}

/**
 * Schätzt die um `from` herum verfügbare Fläche (Pixel²) innerhalb von
 * `polygon`: die Reichweite in alle vier Achsrichtungen (links/rechts/
 * hoch/runter, siehe `reachInDirection`) ergibt ein Rechteck
 * (`(links+rechts) × (hoch+runter)`) – dessen Fläche.
 *
 * Reine, deterministische Funktion (kein `Math.random`) – der Aufrufer
 * sollte sie trotzdem nicht pro Frame aufrufen, siehe Docstring oben.
 */
export function estimateReachableArea(
  polygon: Point[],
  from: Point,
  margin: number,
  step: number = REACH_STEP,
): number {
  if (polygon.length < 3) return 0;

  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  // Obergrenze für jeden Einzelstrahl: die Bounding-Box-Diagonale reicht in
  // jedem Fall über das gesamte Polygon hinaus, verhindert also eine
  // Endlosschleife bei einem (eigentlich unmöglichen) unbegrenzten Polygon.
  const maxDistance =
    Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + step;

  const [right, left, down, up] = CARDINAL_DIRECTIONS.map((dir) =>
    reachInDirection(polygon, from, margin, dir, step, maxDistance),
  );

  const width = left + right;
  const height = up + down;
  return width * height;
}

/**
 * Kreisfläche für einen Gegner-Durchmesser `size` – als "eigene Fläche" für
 * den Vergleich mit der erreichbaren Fläche (siehe `mainEnemyEncirclementScale`).
 */
export function enemyOwnArea(size: number): number {
  const radius = size / 2;
  return Math.PI * radius * radius;
}

/**
 * Render-Skalierungsfaktor für den Hauptgegner. Bleibt bei voller Grösse
 * (1), solange `reachableArea` mindestens `triggerMultiplier`-mal so gross
 * ist wie `ownArea` (Nutzer-Feedback: "nur kleiner werden, wenn die
 * verfügbare Fläche um ihn weniger als [`triggerMultiplier`]-mal ist als
 * er", verschärft von 2× auf 1.3×); darunter linear bis
 * `MAIN_ENEMY_MIN_SIZE_SCALE`, erreicht bei `reachableArea <= ownArea`
 * (kann sich selbst gerade noch "hinstellen").
 *
 * Rein visuell – der Kollisions-Trefferradius (`ENEMY_TOUCH_RADIUS` in
 * `collision.ts`) hängt nicht an `Enemy.size` und bleibt unverändert. Die
 * zusätzliche Bedingung "erst wenn alle Mini-Gegner besiegt sind" gehört
 * NICHT hierher (reine Flächen-Funktion) – die erzwingt der Aufrufer
 * (`main.ts`, `recomputeMainEnemyEncirclementScale`).
 */
export function mainEnemyEncirclementScale(
  reachableArea: number,
  ownArea: number,
  triggerMultiplier: number = ENCIRCLEMENT_TRIGGER_MULTIPLIER,
  minScale: number = MAIN_ENEMY_MIN_SIZE_SCALE,
): number {
  if (ownArea <= 0) return 1;
  const threshold = triggerMultiplier * ownArea;
  if (threshold <= ownArea) return reachableArea >= threshold ? 1 : minScale;
  const t = Math.max(0, Math.min(1, (reachableArea - ownArea) / (threshold - ownArea)));
  return minScale + t * (1 - minScale);
}
