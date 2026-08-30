import type { Vec } from '../../game/enemy';
import type { Point } from '../../game/field';
import { fitsInPolygon } from '../../game/enemyMovement';
import { closestPointOnPerimeter } from '../../game/geometry';
import { isPointInPolygon } from '../../game/polygon';

/**
 * Schlangenartige Bewegung des Schlangenkopfs (Level 2) – bewusst NICHT die
 * achsparallele, erratische Lauf-Bewegung von Level 1 (`moveEnemy` in
 * `enemyMovement.ts`). Der Kopf läuft kontinuierlich in Richtung seines
 * Headings, ändert dieses in einem lockeren Abbiegetakt und kurvt dabei mit
 * begrenzter Drehrate – so entsteht ein weicher Schlangen-Slalom statt harter
 * Knicke.
 *
 * Wichtig für die Optik: das Heading dreht sich IMMER nur mit begrenzter Rate,
 * auch beim Ausweichen vom Rand (kein Springen). Sonst zeigt der Kopf-Sprite
 * plötzlich in eine ganz andere Richtung als der nachgezogene Körper
 * (`snakeBody.ts`), und die Schlange sieht „geknickt" aus. Deshalb wird der
 * Rand über eine Vorausschau FRÜH erkannt und das Ziel-Heading sanft am Rand
 * entlang gelenkt, statt erst im letzten Moment hart zu korrigieren.
 *
 * Der Bewegungsmuster-Zustand (`SnakeHeadState`) liegt bewusst neben `Enemy`
 * (vgl. Docstring in `enemy.ts` – „Snake-Abbiegetakt") und wird vom Level-2-
 * Behavior je Kopf gehalten (`snakeBody.ts`, `WeakMap`).
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
 * Ein Ziel-Heading, das am Rand ENTLANG führt (nicht frontal hinein): die ins
 * Feld zeigende Normale, gemischt mit der Rand-Tangente, die der aktuellen
 * Laufrichtung am ähnlichsten ist.
 */
function alongWallTarget(position: Point, polygon: Point[], heading: Vec): Vec {
  const near = closestPointOnPerimeter(polygon, position).point;
  const inward = normalizeOr({ x: position.x - near.x, y: position.y - near.y }, heading);
  const tangentA = { x: -inward.y, y: inward.x };
  const tangentB = { x: inward.y, y: -inward.x };
  const along = dot(tangentA, heading) >= dot(tangentB, heading) ? tangentA : tangentB;
  return normalizeOr(
    { x: along.x * 0.8 + inward.x * 0.55, y: along.y * 0.8 + inward.y * 0.55 },
    inward,
  );
}

/**
 * Die Richtung (aus `INWARD_SAMPLES` rundum), deren Ein-Schritt-Probe im Feld
 * liegt und den grössten Abstand zum Rand hat – also „am weitesten weg von der
 * Wand". `null`, wenn KEINE Probe im Feld liegt (entarteter Fall).
 */
function mostInwardDirection(position: Point, polygon: Point[], step: number): Vec | null {
  let best: { dir: Vec; distance: number } | null = null;
  for (let i = 0; i < INWARD_SAMPLES; i++) {
    const dir = vecFromAngle((i / INWARD_SAMPLES) * Math.PI * 2);
    const probe = { x: position.x + dir.x * step, y: position.y + dir.y * step };
    if (!isPointInPolygon(probe, polygon)) continue;
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
): Point {
  const step = speed * dt;

  // 1. Abbiegetakt: ab und zu ein neues Ziel-Heading würfeln.
  state.timeUntilTurn -= dt;
  if (state.timeUntilTurn <= 0) {
    const turn = (rng() * 2 - 1) * SNAKE_TARGET_TURN_MAX_RAD;
    state.targetHeading = normalizeOr(rotate(state.heading, turn), state.heading);
    state.timeUntilTurn = nextTurnInterval(rng);
  }

  // 2. Vorausschau: droht ein paar Schritte weiter der Rand, das Ziel-Heading
  //    schon jetzt am Rand entlang umlenken – die Drehung selbst bleibt
  //    ratenbegrenzt (Schritt 3), also weich.
  const lookAhead = {
    x: position.x + state.heading.x * step * LOOKAHEAD_STEPS,
    y: position.y + state.heading.y * step * LOOKAHEAD_STEPS,
  };
  const evading = !fitsInPolygon(lookAhead, polygon, margin);
  if (evading) {
    state.targetHeading = alongWallTarget(position, polygon, state.heading);
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
  if (fitsInPolygon(next, polygon, margin)) return next;

  // 5. Der reguläre Schritt passt nicht (Kopf sitzt im `margin`-Puffer vor der
  //    Wand): Heading ratenbegrenzt Richtung „am weitesten von der Wand weg"
  //    drehen und mit dem TATSÄCHLICH gedrehten Heading so weit gehen, wie es
  //    passt. Reicht die Drehung diesen Frame noch nicht, bleibt der Kopf kurz
  //    stehen (1–3 Frames) und dreht weiter – kein Sprung, damit Kopf-Sprite
  //    und nachgezogener Körper zusammen bleiben.
  const inward = mostInwardDirection(position, polygon, step);
  if (inward) {
    state.targetHeading = { ...inward };
    state.heading = steerToward(state.heading, inward, SNAKE_EVADE_TURN_RATE_RAD_PER_SEC * dt);
    const moved = advance(state.heading);
    if (fitsInPolygon(moved, polygon, margin)) return moved;
  }

  // 6. Nichts geht – diesen Frame stehen bleiben (Heading ist oben bereits
  //    Richtung Feldinneres weitergedreht).
  return position;
}
