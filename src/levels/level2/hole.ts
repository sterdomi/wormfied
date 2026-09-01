import type { Enemy } from '../../game/enemy';
import type { Point } from '../../game/field';
import { isPointInPolygon } from '../../game/polygon';
import { chainSegmentsInOrder, enterReturningFromHole } from './mouthSpit';

/**
 * Das „Loch" von Level 2: ein fester Punkt auf dem Feld, aus dem in Intervallen
 * ein neues Körperglied kriecht – die Schlange wird also länger. Das Glied
 * bekommt sofort die `returning`-Phase (`mouthSpit.ts`) und schliesst von selbst
 * ans Ketten-Ende auf, wo es andockt.
 *
 * Gedeckelt (`HOLE_MAX_CHAIN_LENGTH`): das Loch spawnt nur, solange die Kette
 * darunter liegt – Kanonen-Treffer werden also nachgefüllt, ohne dass die
 * Schlange unbegrenzt wächst.
 *
 * Verschliessbar: sobald die Lochposition nicht mehr im aktiven Feld-Polygon
 * liegt (der Spieler hat die Region ums Loch erobert / mit einer Linie
 * abgetrennt), stoppt der Spawner dauerhaft (`sealed`).
 *
 * Der Zustand hängt – wie `snakeBodyFor` – in einer `WeakMap` mit dem Kopf-
 * `Enemy` als Key: ein bei `rebuildField` frischer Kopf bekommt ein frisches,
 * un-versiegeltes Loch.
 */

/** Sekunden zwischen zwei Loch-Spawns. */
export const HOLE_SPAWN_INTERVAL_SECONDS = 8;
/** Maximale Ketten-Länge – darüber spawnt das Loch nicht. */
export const HOLE_MAX_CHAIN_LENGTH = 6;

export interface HoleState {
  /** Feste Position auf dem Feld (Bildschirmkoordinaten). */
  readonly position: Point;
  /** `true`, sobald das Loch aus dem aktiven Feld erobert wurde – Spawner aus. */
  sealed: boolean;
  /** Sekunden bis zum nächsten Spawn-Versuch. */
  secondsUntilNextSpawn: number;
}

/**
 * Frisches Loch für das Start-Feld: unteres Feld-Mittel (nicht die exakte Mitte,
 * dort startet der Kopf). `field` ist beim Level-Start das volle Rechteck.
 */
export function createHoleState(field: Point[]): HoleState {
  const xs = field.map((p) => p.x);
  const ys = field.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    position: {
      x: (minX + Math.max(...xs)) / 2,
      y: minY + (Math.max(...ys) - minY) * 0.72,
    },
    sealed: false,
    secondsUntilNextSpawn: HOLE_SPAWN_INTERVAL_SECONDS,
  };
}

const holeStates = new WeakMap<Enemy, HoleState>();

/** Loch-Zustand für diesen Kopf – legt beim ersten Aufruf eines an. */
export function holeStateFor(head: Enemy, field: Point[]): HoleState {
  let state = holeStates.get(head);
  if (!state) {
    state = createHoleState(field);
    holeStates.set(head, state);
  }
  return state;
}

/** Loch-Zustand für diesen Kopf, falls schon einer existiert (für `render.ts`). */
export function peekHoleState(head: Enemy): HoleState | undefined {
  return holeStates.get(head);
}

/**
 * Ein Frame Loch-Logik. Mutiert `state`. Ruft `spawnMiniEnemyAt` (aus dem
 * Update-Kontext) auf, wenn ein neues Glied fällig ist – der erzeugte Mini
 * wird direkt in die `returning`-Phase gesetzt.
 */
export function updateHole(
  state: HoleState,
  field: Point[],
  miniEnemies: readonly Enemy[],
  dt: number,
  spawnMiniEnemyAt: ((position: Point) => Enemy) | undefined,
): void {
  if (state.sealed) return;

  // Versiegeln: Loch nicht mehr im aktiven Feld → Spawner dauerhaft aus.
  if (!isPointInPolygon(state.position, field)) {
    state.sealed = true;
    return;
  }

  state.secondsUntilNextSpawn -= dt;
  if (state.secondsUntilNextSpawn > 0) return;
  // Timer immer neu setzen (auch wenn wegen Deckel nicht gespawnt wird): so
  // gibt ein Kanonen-Treffer bis zu `HOLE_SPAWN_INTERVAL_SECONDS` Ruhe.
  state.secondsUntilNextSpawn = HOLE_SPAWN_INTERVAL_SECONDS;

  if (!spawnMiniEnemyAt) return;
  if (chainSegmentsInOrder(miniEnemies).length >= HOLE_MAX_CHAIN_LENGTH) return;

  const mini = spawnMiniEnemyAt({ ...state.position });
  enterReturningFromHole(mini);
}
