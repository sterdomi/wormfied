import type { Enemy } from '../../game/enemy';

/**
 * Level 4 – Dschungel: ein **Gorilla** sitzt fix unten in der Feldmitte und
 * **trommelt** (Bongo zwischen den Beinen, in jedem Frame mitgezeichnet).
 *
 * Grund-Groove: abwechselnd Einzelschläge links/rechts im `BEAT_SECONDS`-Takt.
 * Dazwischen, im Muster **1, 3, 5, 3 s** (wie die Level-3-Strom-Attacke,
 * `SLAM_GAP_PATTERN`), holt er mit beiden Händen aus (`haende_hoch`) und
 * **schlägt doppelt** (`schlag_beide`) – dabei löst er eine **Schockwelle** aus
 * (`shockwave`-Flanke; siehe `shockwave.ts` / `behavior.ts`).
 *
 * `hit` = eine Flanke pro **Einzelschlag** (für `bongo_split`). `shockwave` =
 * eine Flanke beim Doppelschlag (nur `boom`, kein Bongo). Zustand pro
 * Gorilla-`Enemy` in einer WeakMap.
 */

export type GorillaFrame =
  | 'bereit'
  | 'haende_hoch'
  | 'schlag_beide'
  | 'schlag_links'
  | 'schlag_rechts'
  | 'bruellen';

/** Sekunden-Abstände zwischen zwei Doppelschlägen (= Schockwellen) – wie Level 3. */
export const SLAM_GAP_PATTERN: readonly number[] = [1, 3, 5, 3];
/** Grund-Groove: Takt der Einzelschläge (L/R) zwischen den Doppelschlägen. */
const BEAT_SECONDS = 0.5;
/** Anteil des Beats, in dem der Einzelschlag-Frame gezeigt wird (Rest: `bereit`). */
const SINGLE_STRIKE_FRAC = 0.34;
/** Ausholen vor dem Doppelschlag (Frame `haende_hoch`). */
export const SLAM_WINDUP_SECONDS = 0.34;
/** Doppelschlag-Frame sichtbar (`schlag_beide`); Schockwelle beim Eintritt. */
export const SLAM_STRIKE_SECONDS = 0.18;

/**
 * Logische Feldgrösse (wie `FIELD_WIDTH`/`FIELD_HEIGHT` in `main.ts`). Level 4
 * sperrt die unteren 20 % (`blocksDrawingAt`), dort sitzt der Gorilla – fixer
 * Platz, folgt keiner schrumpfenden Fläche.
 */
export const FIELD_W = 960;
export const FIELD_H = 540;
/** Anteil der Höhe, der unten für den Spieler gesperrt ist (Gorilla-Bereich). */
export const BLOCKED_BOTTOM_FRACTION = 0.2;
/** Bildschirm-y der Grundlinie des Gorillas (= Feld-Unterkante). */
export const GORILLA_BASE_Y = FIELD_H;
/** Kollisions-/Logikpunkt des Gorillas: bodennah, aber noch im bespielbaren Feld. */
const GORILLA_COLLISION_Y = FIELD_H * (1 - BLOCKED_BOTTOM_FRACTION) - 8;

/** Einzelschläge im Groove – lösen den `bongo_split`-Sound aus (`hit`-Flanke). */
const SINGLE_STRIKE_FRAMES: ReadonlySet<GorillaFrame> = new Set(['schlag_links', 'schlag_rechts']);

type Phase = 'groove' | 'windup' | 'strike';

interface DrumState {
  phase: Phase;
  /** Sekunden in `windup` / `strike`. */
  phaseT: number;
  /** Sekunden im aktuellen Groove-Beat. */
  beatT: number;
  beatSide: 'L' | 'R';
  /** Sekunden bis zum nächsten Doppelschlag. */
  slamTimer: number;
  slamIndex: number;
  frame: GorillaFrame;
  /** Flanke: ein Schlag trifft auf (für `bongo_split`). */
  hit: boolean;
  /** Flanke: der Doppelschlag – löst die Schockwelle aus. */
  shockwave: boolean;
}

const states = new WeakMap<Enemy, DrumState>();

function createState(): DrumState {
  return {
    phase: 'groove',
    phaseT: 0,
    beatT: BEAT_SECONDS,
    beatSide: 'L',
    slamTimer: SLAM_GAP_PATTERN[0],
    slamIndex: 0,
    frame: 'bereit',
    hit: false,
    shockwave: false,
  };
}

/**
 * Ein Frame Trommel-Logik. Mutiert `gorilla.position` (fixer Platz unten mittig)
 * + `gorilla.direction` und den WeakMap-Zustand.
 */
export function updateDrumming(gorilla: Enemy, dt: number): void {
  let s = states.get(gorilla);
  if (!s) {
    s = createState();
    states.set(gorilla, s);
  }

  let next: GorillaFrame;

  if (s.phase === 'groove') {
    s.slamTimer -= dt;
    if (s.slamTimer <= 0) {
      s.phase = 'windup';
      s.phaseT = 0;
      next = 'haende_hoch';
    } else {
      s.beatT -= dt;
      if (s.beatT <= 0) {
        s.beatT += BEAT_SECONDS;
        s.beatSide = s.beatSide === 'L' ? 'R' : 'L';
      }
      const p = 1 - s.beatT / BEAT_SECONDS; // 0..1 im Beat
      next =
        p < SINGLE_STRIKE_FRAC
          ? s.beatSide === 'L'
            ? 'schlag_links'
            : 'schlag_rechts'
          : 'bereit';
    }
  } else if (s.phase === 'windup') {
    s.phaseT += dt;
    next = 'haende_hoch';
    if (s.phaseT >= SLAM_WINDUP_SECONDS) {
      s.phase = 'strike';
      s.phaseT = 0;
    }
  } else {
    s.phaseT += dt;
    next = 'schlag_beide';
    if (s.phaseT >= SLAM_STRIKE_SECONDS) {
      s.phase = 'groove';
      s.phaseT = 0;
      s.beatT = BEAT_SECONDS;
      s.slamIndex = (s.slamIndex + 1) % SLAM_GAP_PATTERN.length;
      s.slamTimer = SLAM_GAP_PATTERN[s.slamIndex];
    }
  }

  s.hit = SINGLE_STRIKE_FRAMES.has(next) && !SINGLE_STRIKE_FRAMES.has(s.frame);
  s.shockwave = next === 'schlag_beide' && s.frame !== 'schlag_beide';
  s.frame = next;

  gorilla.position = { x: FIELD_W / 2, y: GORILLA_COLLISION_Y };
  gorilla.direction = { x: 0, y: -1 };
}

/** Zustand für den Renderer / die Logik, falls schon einer existiert. */
export function peekDrumming(gorilla: Enemy): Readonly<DrumState> | undefined {
  return states.get(gorilla);
}
