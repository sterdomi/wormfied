import type { Enemy } from '../../game/enemy';

/**
 * Level 4 – Dschungel: ein **Gorilla** sitzt unten in der Feldmitte und
 * **trommelt einen Rhythmus** (Bongo zwischen den Beinen, in jedem Frame
 * mitgezeichnet). Erste Ausbaustufe: nur die Trommel-Animation nach einem
 * festen Muster – noch keine Wirkung auf den Spieler, keine Papageien.
 *
 * Muster (`PATTERN`) wird endlos durchlaufen, ein Schritt pro `BEAT_SECONDS`.
 * Pro Beat wählt `frameFor` den Gorilla-Frame; `render.ts` zeichnet ihn.
 * `hit` ist in genau EINEM Frame `true`, sobald ein Schlag „auftrifft" – als
 * Haken für spätere Effekte / Sound / Spawns auf den Beat.
 *
 * Zustand pro Gorilla-`Enemy` in einer WeakMap (wie `snakeBodyFor`).
 */

export type GorillaFrame =
  | 'bereit'
  | 'haende_hoch'
  | 'schlag_beide'
  | 'schlag_links'
  | 'schlag_rechts'
  | 'bruellen';

type Beat = 'L' | 'R' | 'both' | 'roar' | 'rest';

/** Rhythmus – ein Schritt pro `BEAT_SECONDS`, wiederholt sich endlos. */
const PATTERN: readonly Beat[] = [
  'L',
  'R',
  'L',
  'both',
  'R',
  'L',
  'R',
  'both',
  'L',
  'R',
  'L',
  'both',
  'R',
  'L',
  'both',
  'roar',
];
/** Sekunden pro Beat (~140-BPM-Gefühl). */
export const BEAT_SECONDS = 0.42;

/**
 * Logische Feldgrösse (wie `FIELD_WIDTH`/`FIELD_HEIGHT` in `main.ts`). Level 4
 * sperrt die unteren 20 % (`createStartField`), dort sitzt der Gorilla –
 * fixer Platz, folgt keiner schrumpfenden Fläche.
 */
export const FIELD_W = 960;
export const FIELD_H = 540;
/** Anteil der Höhe, der unten gesperrt ist (Gorilla-Bereich, schwarze Linie). */
export const BLOCKED_BOTTOM_FRACTION = 0.2;
/** Bildschirm-y der Grundlinie des Gorillas (= Feld-Unterkante). */
export const GORILLA_BASE_Y = FIELD_H;
/** Kollisions-/Logikpunkt des Gorillas: bodennah, aber noch im bespielbaren Feld. */
const GORILLA_COLLISION_Y = FIELD_H * (1 - BLOCKED_BOTTOM_FRACTION) - 8;

const STRIKE_FRAMES: ReadonlySet<GorillaFrame> = new Set([
  'schlag_links',
  'schlag_rechts',
  'schlag_beide',
]);

interface DrumState {
  step: number;
  /** Sekunden im aktuellen Beat. */
  t: number;
  frame: GorillaFrame;
  /** `true` in genau dem Frame, in dem ein Schlag auftrifft. */
  hit: boolean;
}

const states = new WeakMap<Enemy, DrumState>();

/** Gorilla-Frame für `beat` beim Beat-Fortschritt `p` (0..1). */
function frameFor(beat: Beat, p: number): GorillaFrame {
  switch (beat) {
    case 'rest':
      return 'bereit';
    case 'roar':
      if (p < 0.16) return 'haende_hoch';
      if (p < 0.72) return 'bruellen';
      return 'bereit';
    case 'both':
      if (p < 0.34) return 'haende_hoch'; // Ausholen
      if (p < 0.5) return 'schlag_beide'; // Doppelschlag
      return 'bereit';
    default:
      // 'L' | 'R' – schneller Einzelschlag ohne Ausholen
      if (p < 0.3) return beat === 'L' ? 'schlag_links' : 'schlag_rechts';
      return 'bereit';
  }
}

/**
 * Ein Frame Trommel-Logik. Mutiert `gorilla.position` (fixer Platz unten mittig)
 * + `gorilla.direction` und den WeakMap-Zustand.
 */
export function updateDrumming(gorilla: Enemy, dt: number): void {
  let s = states.get(gorilla);
  if (!s) {
    s = { step: 0, t: 0, frame: 'bereit', hit: false };
    states.set(gorilla, s);
  }

  s.t += dt;
  if (s.t >= BEAT_SECONDS) {
    s.t -= BEAT_SECONDS;
    s.step = (s.step + 1) % PATTERN.length;
  }
  const nextFrame = frameFor(PATTERN[s.step], s.t / BEAT_SECONDS);
  // `hit` nur auf der steigenden Flanke in einen Schlag-Frame hinein.
  s.hit = STRIKE_FRAMES.has(nextFrame) && !STRIKE_FRAMES.has(s.frame);
  s.frame = nextFrame;

  gorilla.position = { x: FIELD_W / 2, y: GORILLA_COLLISION_Y };
  gorilla.direction = { x: 0, y: -1 };
}

/** Zustand für den Renderer, falls schon einer existiert. */
export function peekDrumming(gorilla: Enemy): Readonly<DrumState> | undefined {
  return states.get(gorilla);
}
