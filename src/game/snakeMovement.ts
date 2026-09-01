import type { Vec } from './enemy';
import type { Point } from './field';
import { fitsInPolygon } from './enemyMovement';
import { closestPointOnPerimeter, closestPointOnPolyline, segmentCrossesPolyline } from './geometry';
import { isPointInPolygon } from './polygon';

/**
 * Wiederverwendbare schlangenartige Kopf-Bewegung – bewusst NICHT die
 * achsparallele, erratische Lauf-Bewegung von Level 1 (`moveEnemy` in
 * `enemyMovement.ts`). Der Kopf läuft kontinuierlich in Richtung seines
 * Headings, ändert dieses in einem lockeren Abbiegetakt und kurvt dabei mit
 * begrenzter Drehrate – so entsteht ein weicher Slalom statt harter Knicke.
 * Ursprünglich für Level 2 (die Schlange) gebaut, level-agnostisch gehalten,
 * damit ein späteres Level mit ähnlichem Bewegungsmuster (z.B. ein Aal) es
 * wiederverwenden kann.
 *
 * Wichtig für die Optik: das Heading dreht sich IMMER nur mit begrenzter Rate,
 * auch beim Ausweichen vom Rand (kein Springen). Sonst zeigt der Kopf-Sprite
 * plötzlich in eine ganz andere Richtung als der nachgezogene Körper
 * (`snakeBody.ts`), und der Körper sieht „geknickt" aus. Deshalb wird der
 * Rand über eine Vorausschau FRÜH erkannt und das Ziel-Heading sanft am Rand
 * entlang gelenkt, statt erst im letzten Moment hart zu korrigieren.
 *
 * Der Bewegungsmuster-Zustand (`SnakeHeadState`) liegt bewusst neben `Enemy`
 * (vgl. Docstring in `enemy.ts` – „Snake-Abbiegetakt") und wird vom jeweiligen
 * Level-Behavior je Kopf gehalten (`snakeBody.ts`, `WeakMap`).
 */

/** Mittlerer Abstand (Sekunden) zwischen zwei Abbiege-Impulsen. */
export const SNAKE_TURN_INTERVAL_SECONDS = 2.2;
/** ± Zufallsstreuung um `SNAKE_TURN_INTERVAL_SECONDS`. */
const SNAKE_TURN_INTERVAL_JITTER_SECONDS = 0.9;
/** Maximale Drehrate des Headings im freien Lauf (Radiant/Sekunde) – ~110°/s. */
export const SNAKE_MAX_TURN_RATE_RAD_PER_SEC = Math.PI * 0.62;
/**
 * Erhöhte Drehrate bei akuter Rand-Gefahr (~300°/s) – schnell genug, um in dem
 * `margin`-Puffer vor der Wand einzulenken, aber immer noch eine Drehung über
 * mehrere Frames, kein Sprung.
 */
export const SNAKE_EVADE_TURN_RATE_RAD_PER_SEC = Math.PI * 1.7;
/** Wie stark ein neu gewürfeltes Ziel-Heading maximal vom aktuellen abweicht. */
export const SNAKE_TARGET_TURN_MAX_RAD = Math.PI * 0.45;
/** Vorausschau (in Bewegungsschritten), um den Rand früh & sanft einzulenken. */
const LOOKAHEAD_STEPS = 7;
/** Wie viele Richtungen rundum abgetastet werden, um die „inwärtigste" zu finden. */
const INWARD_SAMPLES = 24;

export interface SnakeHeadState {
  /** Aktuelles Heading (Einheitsvektor). */
  heading: Vec;
  /** Ziel-Heading, auf das mit begrenzter Drehrate zugesteuert wird. */
  targetHeading: Vec;
  /** Sekunden bis zum nächsten Abbiege-Impuls. */
  timeUntilTurn: number;
}

function normalizeOr(v: Vec, fallback: Vec): Vec {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { ...fallback };
  return { x: v.x / len, y: v.y / len };
}

function angleOf(v: Vec): number {
  return Math.atan2(v.y, v.x);
}

function vecFromAngle(a: number): Vec {
  return { x: Math.cos(a), y: Math.sin(a) };
}

function rotate(v: Vec, a: number): Vec {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

function dot(a: Vec, b: Vec): number {
  return a.x * b.x + a.y * b.y;
}

/** Kleinste vorzeichenbehaftete Winkeldifferenz `to - from`, in [-π, π]. */
function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/** Dreht `heading` um höchstens `maxStep` Richtung `target`. */
function steerToward(heading: Vec, target: Vec, maxStep: number): Vec {
  const wanted = angleDelta(angleOf(heading), angleOf(target));
  const applied = Math.max(-maxStep, Math.min(maxStep, wanted));
  return vecFromAngle(angleOf(heading) + applied);
}

export function createSnakeHeadState(heading: Vec = { x: 1, y: 0 }): SnakeHeadState {
  const h = normalizeOr(heading, { x: 1, y: 0 });
  return { heading: h, targetHeading: { ...h }, timeUntilTurn: SNAKE_TURN_INTERVAL_SECONDS };
}

function nextTurnInterval(rng: () => number): number {
  return SNAKE_TURN_INTERVAL_SECONDS + (rng() * 2 - 1) * SNAKE_TURN_INTERVAL_JITTER_SECONDS;
}

/**
 * Ein Ziel-Heading, das an einem Hindernis (Feld-Rand ODER aktive Zeichenlinie)
 * ENTLANG führt statt frontal hinein: die vom Hindernis weg zeigende Richtung,
 * gemischt mit der Tangente, die der aktuellen Laufrichtung am ähnlichsten ist.
 */
function alongObstacleTarget(position: Point, near: Point, heading: Vec): Vec {
  const away = normalizeOr({ x: position.x - near.x, y: position.y - near.y }, heading);
  const tangentA = { x: -away.y, y: away.x };
  const tangentB = { x: away.y, y: -away.x };
  const along = dot(tangentA, heading) >= dot(tangentB, heading) ? tangentA : tangentB;
  return normalizeOr(
    { x: along.x * 0.8 + away.x * 0.55, y: along.y * 0.8 + away.y * 0.55 },
    away,
  );
}

/**
 * Ausweich-Ziel mit Ecken-Absicherung: normalerweise `alongObstacleTarget` (am
 * Hindernis entlang gleiten). Führt dieses „Entlang" aber nach kurzer Strecke
 * selbst aus dem Feld – der typische Ecken-Fall, wo die Tangente des einen
 * Randes genau in den anderen Rand zeigt –, wird stattdessen Richtung
 * Feldinneres gelenkt (`mostInwardDirection`, grösster Randabstand). Ohne das
 * bleibt der Kopf in der Ecke hängen: Schritt 2 würfe jeden Frame wieder ein
 * „entlang = in die andere Wand"-Ziel, das die Erholungs-Drehung aus Schritt 5
 * neutralisiert.
 */
function cornerAwareEvadeTarget(
  position: Point,
  near: Point,
  heading: Vec,
  polygon: Point[],
  margin: number,
  step: number,
  activeLine: readonly Point[],
): Vec {
  const along = alongObstacleTarget(position, near, heading);
  const probe = { x: position.x + along.x * step * 3, y: position.y + along.y * step * 3 };
  if (fitsInPolygon(probe, polygon, margin)) return along;
  return mostInwardDirection(position, polygon, step, activeLine) ?? along;
}

/**
 * Die Richtung (aus `INWARD_SAMPLES` rundum), deren Ein-Schritt-Probe im Feld
 * liegt, die aktive Linie nicht kreuzt und den grössten Abstand zum Rand hat –
 * also „am weitesten weg von der Wand". `null`, wenn KEINE Probe passt.
 */
function mostInwardDirection(
  position: Point,
  polygon: Point[],
  step: number,
  activeLine: readonly Point[],
): Vec | null {
  let best: { dir: Vec; distance: number } | null = null;
  for (let i = 0; i < INWARD_SAMPLES; i++) {
    const dir = vecFromAngle((i / INWARD_SAMPLES) * Math.PI * 2);
    const probe = { x: position.x + dir.x * step, y: position.y + dir.y * step };
    if (!isPointInPolygon(probe, polygon)) continue;
    if (segmentCrossesPolyline(position, probe, activeLine)) continue;
    const distance = closestPointOnPerimeter(polygon, probe).distance;
    if (!best || distance > best.distance) best = { dir, distance };
  }
  return best?.dir ?? null;
}

/**
 * Ein Frame Kopf-Bewegung. Mutiert `state` (Heading/Ziel-Heading/Abbiege-Timer)
 * und liefert die neue Kopf-Position. `margin` = Sprite-Radius (Sicherheits-
 * abstand zum Rand, analog `enemyMovementMargin`). `rng` ist für Tests
 * injizierbar.
 */
export function advanceSnakeHead(
  position: Point,
  state: SnakeHeadState,
  polygon: Point[],
  margin: number,
  speed: number,
  dt: number,
  rng: () => number = Math.random,
  /** Aktive Zeichenlinie – der Kopf darf sie nicht überqueren (Wand). */
  activeLine: readonly Point[] = [],
): Point {
  const step = speed * dt;

  /** Ziel gültig: im Feld (mit Marge) UND der Schritt kreuzt die aktive Linie nicht. */
  const canReach = (to: Point): boolean =>
    fitsInPolygon(to, polygon, margin) && !segmentCrossesPolyline(position, to, activeLine);

  // 1. Abbiegetakt: ab und zu ein neues Ziel-Heading würfeln.
  state.timeUntilTurn -= dt;
  if (state.timeUntilTurn <= 0) {
    const turn = (rng() * 2 - 1) * SNAKE_TARGET_TURN_MAX_RAD;
    state.targetHeading = normalizeOr(rotate(state.heading, turn), state.heading);
    state.timeUntilTurn = nextTurnInterval(rng);
  }

  // 2. Vorausschau: droht ein paar Schritte weiter der Rand ODER die aktive
  //    Zeichenlinie, das Ziel-Heading schon jetzt am Hindernis entlang
  //    umlenken – die Drehung selbst bleibt ratenbegrenzt (Schritt 3), weich.
  const lookAhead = {
    x: position.x + state.heading.x * step * LOOKAHEAD_STEPS,
    y: position.y + state.heading.y * step * LOOKAHEAD_STEPS,
  };
  let evading = false;
  if (!fitsInPolygon(lookAhead, polygon, margin)) {
    evading = true;
    state.targetHeading = cornerAwareEvadeTarget(
      position,
      closestPointOnPerimeter(polygon, position).point,
      state.heading,
      polygon,
      margin,
      step,
      activeLine,
    );
  } else if (segmentCrossesPolyline(position, lookAhead, activeLine)) {
    evading = true;
    state.targetHeading = cornerAwareEvadeTarget(
      position,
      closestPointOnPolyline(activeLine, position).point,
      state.heading,
      polygon,
      margin,
      step,
      activeLine,
    );
  }

  // 3. Heading Richtung Ziel-Heading drehen – beim Ausweichen schneller, aber
  //    nie springend.
  const rate = evading ? SNAKE_EVADE_TURN_RATE_RAD_PER_SEC : SNAKE_MAX_TURN_RATE_RAD_PER_SEC;
  state.heading = steerToward(state.heading, state.targetHeading, rate * dt);

  // 4. Schritt setzen, solange er im Feld bleibt (Normalfall).
  const advance = (dir: Vec): Point => ({
    x: position.x + dir.x * step,
    y: position.y + dir.y * step,
  });
  const next = advance(state.heading);
  if (canReach(next)) return next;

  // 5. Der reguläre Schritt passt nicht (Kopf sitzt im `margin`-Puffer vor der
  //    Wand): Heading ratenbegrenzt Richtung „am weitesten von der Wand weg"
  //    drehen und mit dem TATSÄCHLICH gedrehten Heading so weit gehen, wie es
  //    passt. Reicht die Drehung diesen Frame noch nicht, bleibt der Kopf kurz
  //    stehen (1–3 Frames) und dreht weiter – kein Sprung, damit Kopf-Sprite
  //    und nachgezogener Körper zusammen bleiben.
  const inward = mostInwardDirection(position, polygon, step, activeLine);
  if (inward) {
    state.targetHeading = { ...inward };
    state.heading = steerToward(state.heading, inward, SNAKE_EVADE_TURN_RATE_RAD_PER_SEC * dt);
    const moved = advance(state.heading);
    if (canReach(moved)) return moved;
    // Der Kopf sitzt im `margin`-Puffer (oder in einer Ecke): den ratenbegrenzt
    // gedrehten Schritt trotzdem nehmen, wenn er im Feld bleibt, die aktive
    // Linie nicht kreuzt UND den Randabstand vergrössert – so schiebt sich der
    // Kopf aus der Ecke heraus, statt einzufrieren (vgl. Verbesserungs-Fallback
    // in `moveEnemy`). Reine Bewegung tiefer in die Enge bleibt blockiert.
    if (
      isPointInPolygon(moved, polygon) &&
      !segmentCrossesPolyline(position, moved, activeLine) &&
      closestPointOnPerimeter(polygon, moved).distance >
        closestPointOnPerimeter(polygon, position).distance
    ) {
      return moved;
    }
  }

  // 6. Nichts geht – diesen Frame stehen bleiben (Heading ist oben bereits
  //    Richtung Feldinneres weitergedreht).
  return position;
}
