import { type Enemy, type Vec } from './enemy';
import { enemyMovementMargin } from './enemyMovement';
import type { Point } from './field';
import { advanceSnakeHead, createSnakeHeadState, type SnakeHeadState } from './snakeMovement';

/**
 * Wiederverwendbarer Schlangenkörper: der Hauptgegner ist der Kopf, die (bis
 * zu) drei Mini-Gegner sind seine Körperglieder – sie laufen NICHT mehr
 * eigenständig umher, sondern werden hier pro Frame auf den Kopf-Trail gesetzt,
 * sodass Kopf + Minis als EIN Körper erscheinen. Ursprünglich für Level 2 (die
 * Schlange) gebaut, level-agnostisch gehalten (hängt nur an `game/*`), damit
 * ein späteres Level mit ähnlichem Bewegungsmuster (z.B. ein Aal) es
 * wiederverwenden kann, ohne quer in ein anderes Level-Package zu importieren.
 *
 * Die Minis bleiben dabei ganz normale Einträge in `miniEnemies[]`: Kollision,
 * Einkesselung und Kanonentreffer entfernen ein Glied wie gewohnt – die Kette
 * wird dann einfach kürzer (die verbleibenden Glieder rücken nach).
 *
 * Der Trail-/Abbiege-Zustand hängt in einer modul-lokalen
 * `WeakMap<Enemy, SnakeBodyState>` mit dem Kopf-`Enemy` als Key – wie Level 1
 * seinen `walkStates` (frischer Kopf bei `rebuildField` → frischer Zustand, der
 * alte wird mitsamt Eintrag vom GC geholt). Das jeweilige Level-`behavior.ts`
 * holt ihn pro Frame über `snakeBodyFor(head)` und schreibt darin die
 * Mini-Positionen fort; `render.ts` liest danach nur noch `mini.position` /
 * `mini.direction`.
 */

/** Render-Grösse eines Körperglieds als Vielfaches der Kopf-Render-Grösse. */
export const BODY_MINI_SCALE = 0.75;

/**
 * Weglänge Kopf-Mittelpunkt → erstes Körperglied, als Vielfaches der
 * Kopf-Render-Grösse (`head.size`). Als Faktor gehalten, damit die Kette bei
 * einer Grössen-Änderung verbunden bleibt. Grösser = Glied sitzt weiter hinten.
 * Sehr klein (Nutzer-Feedback: „der erste Mini muss viel näher"): das erste
 * Glied sitzt praktisch direkt hinter dem Kopf, die Schlange wirkt als EIN
 * Körper statt als Perlenkette.
 */
export const HEAD_TO_BODY_GAP_FACTOR = 0.20;
/** Abstand zwischen zwei Körpergliedern, als Vielfaches von `head.size` –
 *  sehr eng (Nutzer-Feedback), damit die ganze Kette dicht am Kopf sitzt,
 *  siehe `HEAD_TO_BODY_GAP_FACTOR`. */
export const SEGMENT_SPACING_FACTOR = 0.20;

/** Kürzeste Kopf-Verschiebung, die einen neuen Trail-Punkt wert ist. */
const MIN_TRAIL_STEP = 0.5;

export interface SnakeBodyState {
  head: SnakeHeadState;
  /** Breadcrumb-Trail der Kopf-Positionen, `trail[0]` = neueste (Kopf). */
  trail: Point[];
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalizeOr(v: Vec, fallback: Vec): Vec {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { ...fallback };
  return { x: v.x / len, y: v.y / len };
}

export function createSnakeBodyState(head: Enemy): SnakeBodyState {
  const heading = normalizeOr(head.direction, { x: 1, y: 0 });
  return { head: createSnakeHeadState(heading), trail: [{ ...head.position }] };
}

/** Ziel-Weglänge hinter dem Kopf für Körperglied `index` (0 = direkt am Kopf). */
export function bodySegmentDistance(headSize: number, index: number): number {
  return headSize * (HEAD_TO_BODY_GAP_FACTOR + SEGMENT_SPACING_FACTOR * index);
}

/**
 * Sucht auf dem Trail den Punkt in Weglänge `arcDist` hinter dem Kopf. Reicht
 * der Trail nicht so weit (früh nach dem Spawn), wird ab dem ältesten Punkt
 * gerade nach hinten extrapoliert – damit stapeln sich die Glieder sauber
 * hinter dem Kopf, statt aus dem Ursprung `(0,0)` „hereinzufliegen".
 */
function sampleTrail(
  trail: Point[],
  arcDist: number,
  headwardFallback: Vec,
): { point: Point; direction: Vec } {
  let remaining = arcDist;
  for (let i = 0; i < trail.length - 1; i++) {
    const a = trail[i];
    const b = trail[i + 1];
    const segLen = dist(a, b);
    if (segLen <= 1e-6) continue;
    if (remaining <= segLen) {
      const tt = remaining / segLen;
      return {
        point: { x: a.x + (b.x - a.x) * tt, y: a.y + (b.y - a.y) * tt },
        // `a` ist der zum Kopf hin liegende Punkt → Richtung a - b zeigt kopfwärts.
        direction: normalizeOr({ x: a.x - b.x, y: a.y - b.y }, headwardFallback),
      };
    }
    remaining -= segLen;
  }
  const oldest = trail[trail.length - 1] ?? { x: 0, y: 0 };
  return {
    point: {
      x: oldest.x - headwardFallback.x * remaining,
      y: oldest.y - headwardFallback.y * remaining,
    },
    direction: { ...headwardFallback },
  };
}

/**
 * Ein Frame: Kopf schlangenartig bewegen (`advanceSnakeHead`), den Trail
 * fortschreiben/kappen und jedes Körperglied (`bodySegments`, = die aktuellen
 * `miniEnemies`) auf seinen Weglängen-Abstand setzen. Mutiert `head` UND die
 * `bodySegments`-Objekte in place (dieselben `Enemy`-Objekte wie in
 * `miniEnemies[]`).
 */
export function advanceSnakeBody(
  head: Enemy,
  body: SnakeBodyState,
  bodySegments: readonly Enemy[],
  polygon: Point[],
  dt: number,
  rng: () => number = Math.random,
  /** Aktive Zeichenlinie – der Kopf darf sie nicht überqueren. */
  activeLine: readonly Point[] = [],
): void {
  const margin = enemyMovementMargin(head);
  const newPos = advanceSnakeHead(
    head.position,
    body.head,
    polygon,
    margin,
    head.speed,
    dt,
    rng,
    activeLine,
  );
  head.position = newPos;
  head.direction = { ...body.head.heading };

  // Trail vorne verlängern (nur bei nennenswerter Kopf-Bewegung, damit er nicht
  // mit Null-Längen-Stücken zuwächst).
  if (body.trail.length === 0 || dist(newPos, body.trail[0]) >= MIN_TRAIL_STEP) {
    body.trail.unshift({ x: newPos.x, y: newPos.y });
  } else {
    body.trail[0] = { x: newPos.x, y: newPos.y };
  }

  // Trail hinten kappen: nur so viel Weglänge behalten, wie das hinterste Glied
  // (+ Reserve) braucht.
  const lastIndex = Math.max(0, bodySegments.length - 1);
  const maxNeeded =
    bodySegmentDistance(head.size, lastIndex) + head.size * SEGMENT_SPACING_FACTOR * 2;
  let acc = 0;
  let keep = body.trail.length;
  for (let i = 0; i < body.trail.length - 1; i++) {
    acc += dist(body.trail[i], body.trail[i + 1]);
    if (acc >= maxNeeded) {
      keep = i + 2; // diesen und den nächsten Punkt noch behalten
      break;
    }
  }
  if (keep < body.trail.length) body.trail.length = keep;

  const headward = normalizeOr(body.head.heading, { x: 1, y: 0 });
  bodySegments.forEach((seg, i) => {
    const sample = sampleTrail(body.trail, bodySegmentDistance(head.size, i), headward);
    seg.position = sample.point;
    seg.direction = sample.direction;
  });
}

/**
 * Modul-lokaler Zustands-Speicher, Kopf-`Enemy` als Key (siehe Datei-Docstring).
 * Von `behavior.ts` genutzt.
 */
const bodyStates = new WeakMap<Enemy, SnakeBodyState>();

export function snakeBodyFor(head: Enemy): SnakeBodyState {
  let state = bodyStates.get(head);
  if (!state) {
    state = createSnakeBodyState(head);
    bodyStates.set(head, state);
  }
  return state;
}
