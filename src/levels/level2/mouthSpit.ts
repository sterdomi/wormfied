import { type Enemy, type Vec } from '../../game/enemy';
import {
  createRandomWalkState,
  enemyMovementMargin,
  fitsInPolygon,
  moveEnemy,
  type RandomWalkState,
} from '../../game/enemyMovement';
import type { Point } from '../../game/field';

/**
 * „Maul-Spucke" von Level 2: Sobald der Spieler abdockt
 * (`LevelEnemyUpdateContext.playerJustUndocked`), spuckt der Schlangenkopf das
 * vorderste noch angedockte Körperglied (`miniEnemies`-Kette) durch den Mund
 * aus. Das Glied ist dann KEIN Ketten-Segment mehr, sondern durchläuft drei
 * Phasen:
 *
 *  1. `flying`    – fliegt geradlinig auf die beim Abschuss gemerkte
 *                   Spielerposition zu (`MOUTH_SPIT_SPEED`);
 *  2. `free`      – ab der Ankunft (bzw. Feldrand / Zeitlimit) läuft es
 *                   `FREE_ROAM_SECONDS` lang als ganz normaler, frei
 *                   umherlaufender Mini-Gegner (`moveEnemy`, dieselbe erratische
 *                   Achs-Bewegung wie Level 1);
 *  3. `returning` – danach fliegt es zum Ende der Schlange zurück
 *                   (`RETURN_SPEED`) und dockt dort wieder an – der Eintrag in
 *                   der `spitStates`-Map wird entfernt, `isChainSegment` ist
 *                   wieder `true`, und `advanceSnakeBody` reiht es HINTEN in die
 *                   Kette ein (`dockRank`).
 *
 * In allen Phasen bleibt es ein normaler Eintrag in `miniEnemies[]`: Kollision
 * mit dem Spieler, Kanonentreffer und Einkesselung wirken unverändert
 * (Nutzer-Feedback: „Kollision/Kanone wie gewohnt"). Gerendert wird es weiter
 * über `render.ts` mit demselben `gegner.png` wie die Ketten-Glieder.
 *
 * Der Phasen-/Lauf-Zustand hängt – wie `walkStates` im Level-1-Behavior – in
 * einer modul-lokalen `WeakMap` mit dem Mini-`Enemy` als Key: ein bei
 * `rebuildField` frisch erzeugtes Glied hat keinen Eintrag und gilt damit
 * wieder als Ketten-Segment; besiegte Glieder werden mitsamt Eintrag vom GC
 * geholt.
 */

/** Fluggeschwindigkeit eines frisch ausgespuckten Glieds (Pixel/Sekunde). */
export const MOUTH_SPIT_SPEED = 430;
/** Trefferradius um die gemerkte Spielerposition, ab dem das Glied „ankommt". */
const ARRIVAL_RADIUS = 26;
/** Not-Aus: nach so vielen Sekunden Flug wird das Glied auch ohne Ankunft frei. */
const MAX_FLIGHT_SECONDS = 4;
/** So lange läuft ein Glied frei umher, bevor es zur Schlange zurückkehrt. */
const FREE_ROAM_SECONDS = 3;
/** Rückflug-Tempo – bewusst > Kopf-Speed (250), damit das Glied aufschliesst. */
const RETURN_SPEED = 360;
/** Abstand zum Ketten-Ende, ab dem das zurückkehrende Glied wieder andockt. */
const DOCK_RADIUS = 50;
/**
 * So lange nach einem Maul-Spuck zeigt der Kopf die „Schuss"-Pose (ms).
 * Deutlich über einem kurzen Flash (Nutzer-Feedback „man sieht das
 * `gegner_schuss.png` nicht") – der Kopf steht bei angedockter Kette ohnehin
 * still, es gibt also keinen Bewegungs-Hinweis auf den Sprite-Wechsel.
 */
const SPIT_POSE_MS = 800;

/**
 * Wanduhrzeit (`performance.now()`) des letzten Maul-Spucks – von `render.ts`
 * über `isSpitPoseActive` abgefragt, um kurz das `gegner_schuss`-Sprite zu
 * zeigen. Modul-lokal wie der übrige Maul-Spuck-Zustand.
 */
let lastSpitAtMs = Number.NEGATIVE_INFINITY;

/** `true`, solange (seit dem letzten Ausspucken) die „Schuss"-Kopfpose gilt. */
export function isSpitPoseActive(nowMs: number): boolean {
  const since = nowMs - lastSpitAtMs;
  return since >= 0 && since < SPIT_POSE_MS;
}

/** Nur für Tests: „Schuss"-Pose zurücksetzen (kein Spuck kürzlich). */
export function _resetSpitPose(): void {
  lastSpitAtMs = Number.NEGATIVE_INFINITY;
}

type SpitPhase = 'flying' | 'free' | 'returning';

interface SpitState {
  phase: SpitPhase;
  /** Geschwindigkeitsvektor solange `flying` (Flugrichtung × `MOUTH_SPIT_SPEED`). */
  velocity: Vec;
  /** Beim Abschuss gemerkte Spielerposition – Ziel des `flying`-Flugs. */
  target: Point;
  /** Sekunden seit dem Abschuss (nur `flying`). */
  flightSeconds: number;
  /** Sekunden im freien Lauf (nur `free`), zählt bis `FREE_ROAM_SECONDS`. */
  freeSeconds: number;
  /** Erratischer Lauf-Zustand für `free` und das Ausweichen im Rückflug. */
  walk: RandomWalkState;
}

const spitStates = new WeakMap<Enemy, SpitState>();

/**
 * Andock-Reihenfolge der Ketten-Glieder – kleinerer Rang = näher am Kopf. Ein
 * neu (wieder) angedocktes Glied bekommt einen frischen, grösseren Rang und
 * hängt sich damit HINTEN an die Schlange, statt vorne einzuspringen (die
 * `miniEnemies[]`-Array-Reihenfolge allein würde das nicht leisten).
 */
const dockRank = new WeakMap<Enemy, number>();
let nextRank = 0;

/** Ist `mini` (noch bzw. wieder) ein angedocktes Ketten-Segment? */
export function isChainSegment(mini: Enemy): boolean {
  return !spitStates.has(mini);
}

/**
 * Die aktuell angedockten Glieder aus `minis`, sortiert nach Andock-Reihenfolge
 * (`dockRank`, Kopf-nah zuerst). Glieder ohne Rang (Level-Start bzw. nach
 * `rebuildField`) bekommen ihn hier in Array-Reihenfolge zugewiesen.
 */
export function chainSegmentsInOrder(minis: readonly Enemy[]): Enemy[] {
  const chain = minis.filter(isChainSegment);
  for (const mini of chain) {
    if (!dockRank.has(mini)) dockRank.set(mini, nextRank++);
  }
  return chain.sort((a, b) => dockRank.get(a)! - dockRank.get(b)!);
}

function normalizeOr(v: Vec, fallback: Vec): Vec {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { ...fallback };
  return { x: v.x / len, y: v.y / len };
}

/** Die Achsrichtung, die `v` am nächsten kommt – als Startrichtung fürs `moveEnemy`. */
function nearestCardinal(v: Vec): Vec {
  return Math.abs(v.x) >= Math.abs(v.y)
    ? { x: Math.sign(v.x) || 1, y: 0 }
    : { x: 0, y: Math.sign(v.y) || 1 };
}

/**
 * Spuckt `mini` vom Kopf `head` aus in Richtung `target` (Spielerposition im
 * Moment des Abdockens). Das Glied startet sichtbar vor dem Maul und fliegt
 * danach geradlinig weiter – ab jetzt gilt `isChainSegment(mini) === false`.
 */
export function spitMiniFromMouth(head: Enemy, mini: Enemy, target: Point): void {
  const forward = normalizeOr(head.direction, { x: 1, y: 0 });
  const toTarget = normalizeOr(
    { x: target.x - head.position.x, y: target.y - head.position.y },
    forward,
  );
  mini.position = {
    x: head.position.x + forward.x * head.size * 0.35,
    y: head.position.y + forward.y * head.size * 0.35,
  };
  mini.direction = { ...toTarget };
  lastSpitAtMs = performance.now(); // → `render.ts` zeigt kurz das Schuss-Sprite
  spitStates.set(mini, {
    phase: 'flying',
    velocity: { x: toTarget.x * MOUTH_SPIT_SPEED, y: toTarget.y * MOUTH_SPIT_SPEED },
    target: { x: target.x, y: target.y },
    flightSeconds: 0,
    freeSeconds: 0,
    walk: createRandomWalkState(),
  });
}

/**
 * Setzt `mini` direkt in die `returning`-Phase: es zählt ab jetzt NICHT als
 * Ketten-Segment (`isChainSegment === false`) und wandert unter
 * `advanceSpitMinis` von selbst ans Ketten-Ende, wo es andockt. Für neue
 * Glieder, die aus dem Loch kriechen (`level2/hole.ts`) – sie sollen weder
 * fliegen noch frei umherlaufen, nur zur Schlange aufschliessen.
 */
export function enterReturningFromHole(mini: Enemy): void {
  spitStates.set(mini, {
    phase: 'returning',
    velocity: { x: 0, y: 0 },
    target: { ...mini.position },
    flightSeconds: 0,
    freeSeconds: 0,
    walk: createRandomWalkState(),
  });
}

/**
 * Ein Frame für alle bereits ausgespuckten Glieder in `minis`:
 *  - `flying`    geradeaus auf ihr Ziel zu, danach `free`;
 *  - `free`      erratisch umherlaufen (`moveEnemy`), nach `FREE_ROAM_SECONDS`
 *                weiter zu `returning`;
 *  - `returning` zurück zu `dockPoint` (dem aktuellen Ketten-Ende bzw. dem Kopf,
 *                wenn die Kette leer ist); im Umkreis `DOCK_RADIUS` dockt das
 *                Glied wieder an (`spitStates`-Eintrag entfällt).
 *
 * Noch angedockte Ketten-Segmente werden übersprungen – deren Position setzt
 * `advanceSnakeBody`. Mutiert die betroffenen `Enemy`-Objekte.
 */
export function advanceSpitMinis(
  minis: readonly Enemy[],
  dockPoint: Point,
  polygon: Point[],
  dt: number,
  rng: () => number = Math.random,
  activeLine: readonly Point[] = [],
): void {
  for (const mini of minis) {
    const state = spitStates.get(mini);
    if (!state) continue; // angedocktes Ketten-Segment – nicht hier.

    if (state.phase === 'flying') {
      state.flightSeconds += dt;
      const next = {
        x: mini.position.x + state.velocity.x * dt,
        y: mini.position.y + state.velocity.y * dt,
      };
      const reachedTarget =
        Math.hypot(state.target.x - next.x, state.target.y - next.y) <= ARRIVAL_RADIUS;
      const hitWall = !fitsInPolygon(next, polygon, enemyMovementMargin(mini));
      if (reachedTarget || hitWall || state.flightSeconds >= MAX_FLIGHT_SECONDS) {
        if (!hitWall) mini.position = next;
        state.phase = 'free';
        mini.direction = nearestCardinal(state.velocity);
      } else {
        mini.position = next;
      }
      continue;
    }

    if (state.phase === 'free') {
      state.freeSeconds += dt;
      moveEnemy(mini, state.walk, polygon, dt, rng, activeLine);
      if (state.freeSeconds >= FREE_ROAM_SECONDS) state.phase = 'returning';
      continue;
    }

    // `returning`: zum Ketten-Ende zurückfliegen und dort wieder andocken.
    const toDock = { x: dockPoint.x - mini.position.x, y: dockPoint.y - mini.position.y };
    const gap = Math.hypot(toDock.x, toDock.y);
    if (gap <= DOCK_RADIUS) {
      spitStates.delete(mini);
      dockRank.set(mini, nextRank++); // hinten anhängen
      continue;
    }
    const dir = normalizeOr(toDock, mini.direction);
    const step = Math.min(RETURN_SPEED * dt, gap);
    const next = { x: mini.position.x + dir.x * step, y: mini.position.y + dir.y * step };
    if (fitsInPolygon(next, polygon, enemyMovementMargin(mini))) {
      mini.position = next;
      mini.direction = dir;
    } else {
      // Feldrand im Weg – diesen Frame erratisch ausweichen, weiter im Rückflug.
      moveEnemy(mini, state.walk, polygon, dt, rng, activeLine);
    }
  }
}
