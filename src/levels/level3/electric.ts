import type { Enemy } from '../../game/enemy';
import type { Point } from '../../game/field';
import { clamp01, lerp } from '../level2/rng';

/**
 * „Strom-Attacke" von Level 3: In Abständen von **1, 3, 5, 3 Sekunden**
 * (wiederholend) unterbricht der Aal sein Schwimmen, **rollt sich zum Kreis
 * zusammen** (≈ 1 s – zugleich die Vorwarnung), **setzt das ganze Spielfeld
 * unter Strom** (ein Blitz-Frame, `discharged`), **rollt wieder aus** und
 * schwimmt weiter.
 *
 * Phasen (`ElectricPhase`):
 *  - `swimming`   – normaler Betrieb (`behavior.ts` fährt `advanceSnakeBody` +
 *                   Torpedos). `timer` zählt die Pause bis zur nächsten
 *                   Attacke herunter (Muster `GAP_PATTERN`).
 *  - `coiling`    – die Körpersegmente werden aus ihrer Schwimm-Position in
 *                   einen Spiralkranz um den (eingefrorenen) Kopf interpoliert.
 *  - `discharge`  – der Blitz schlägt ein; `updateElectric` liefert in dem
 *                   Frame, in dem diese Phase beginnt, `discharged: true`
 *                   (→ `behavior.ts` ruft `reportFieldZap`).
 *  - `uncoiling`  – die Segmente kollabieren zurück zum Kopf, danach `swimming`;
 *                   `advanceSnakeBody` zieht sie beim Weiterschwimmen wieder
 *                   zu einer Kette aus.
 *
 * Der Zustand hängt – wie `snakeBodyFor` / `holeStateFor` in Level 2 – in einer
 * `WeakMap` mit dem Kopf-`Enemy` als Key (frischer Kopf bei `rebuildField` →
 * frischer, im `swimming` startender Zustand). Für die zustandslose
 * Feld-Deko (`decoration.ts`, kennt den Kopf nicht) spiegelt das Modul den
 * jeweils aktuellen Zustand zusätzlich in `current`.
 */

export type ElectricPhase = 'swimming' | 'coiling' | 'discharge' | 'uncoiling';

/** Pausen (Sekunden Schwimmen) zwischen zwei Attacken – wiederholt sich. */
export const GAP_PATTERN: readonly number[] = [1, 3, 5, 3];
/** Dauer des Einrollens (Sekunden) – zugleich die Vorwarnzeit zum Andocken. */
export const COIL_SECONDS = 1;
/** Dauer des sichtbaren Blitzes (Sekunden). */
export const DISCHARGE_SECONDS = 0.16;
/** Dauer des Ausrollens (Sekunden). */
export const UNCOIL_SECONDS = 0.5;
/** Nachleuchten des Feld-Blitzes (Millisekunden) – für `electricFieldFlash`. */
const FIELD_FLASH_MS = 380;

interface ElectricState {
  phase: ElectricPhase;
  /** Restzeit der aktuellen Phase bzw. der Schwimm-Pause (Sekunden). */
  timer: number;
  /** Index in `GAP_PATTERN` für die nächste Schwimm-Pause. */
  gapIndex: number;
  /** Eingefrorene Kreismitte während coiling/discharge/uncoiling. */
  center: Point;
  /** Segment-Position bei Beginn des Einrollens – Startpunkt der Interpolation. */
  startPos: WeakMap<Enemy, Point>;
  /** `performance.now()` des letzten Blitzes (für das Deko-Nachleuchten). */
  lastDischargeMs: number;
}

const states = new WeakMap<Enemy, ElectricState>();
let current: ElectricState | null = null;

function createState(head: Enemy): ElectricState {
  return {
    phase: 'swimming',
    timer: GAP_PATTERN[0],
    gapIndex: 0,
    center: { ...head.position },
    startPos: new WeakMap(),
    lastDischargeMs: Number.NEGATIVE_INFINITY,
  };
}

function stateFor(head: Enemy): ElectricState {
  let s = states.get(head);
  if (!s) {
    s = createState(head);
    states.set(head, s);
  }
  current = s;
  return s;
}

/** Nur für Tests: den Modul-weiten „aktuellen" Zustand vergessen. */
export function _resetElectric(): void {
  current = null;
}

/** Radius des Spiralkranzes für einen Kopf dieser Grösse. */
function coilRadius(headSize: number): number {
  return headSize * 1.35;
}

/** Hält `center` so weit im Feld-Rechteck, dass der Kranz möglichst ganz drin liegt. */
function clampToField(p: Point, field: Point[], margin: number): Point {
  const xs = field.map((q) => q.x);
  const ys = field.map((q) => q.y);
  const minX = Math.min(...xs) + margin;
  const maxX = Math.max(...xs) - margin;
  const minY = Math.min(...ys) + margin;
  const maxY = Math.max(...ys) - margin;
  return {
    x: maxX > minX ? Math.min(maxX, Math.max(minX, p.x)) : p.x,
    y: maxY > minY ? Math.min(maxY, Math.max(minY, p.y)) : p.y,
  };
}

/** Zielwinkel von Segment `i` im Spiralkranz (leicht > 1 Umdrehung → „Rolle"). */
function ringAngle(i: number, n: number, spin: number): number {
  return spin + (i / Math.max(1, n)) * Math.PI * 2 * 1.15;
}

/**
 * Legt Kopf + Segmente für den Interpolationsfortschritt `t` (0 = Schwimm-
 * Position, 1 = fertiger Kranz) in die Kreisform. Mutiert die `Enemy`-Objekte.
 */
function arrangeCoil(
  head: Enemy,
  segments: readonly Enemy[],
  s: ElectricState,
  t: number,
  nowMs: number,
): void {
  // Der Kranz rotiert langsam („Aufladen"); der Kopf bleibt in der Mitte und
  // behält seine letzte Schwimm-Blickrichtung (kein wackelndes Umkippen im
  // `render.ts`-Spiegel-Handling während der Rotation).
  const spin = nowMs / 700;
  head.position = { ...s.center };

  const n = segments.length;
  const R = coilRadius(head.size);
  segments.forEach((seg, i) => {
    const ang = ringAngle(i, n, spin);
    const r = R * (1 - 0.28 * (i / Math.max(1, n)));
    const target = { x: s.center.x + Math.cos(ang) * r, y: s.center.y + Math.sin(ang) * r };
    const from = s.startPos.get(seg) ?? seg.position;
    seg.position = { x: lerp(from.x, target.x, t), y: lerp(from.y, target.y, t) };
    // Tangential zur Kreisbahn ausrichten.
    seg.direction = { x: Math.cos(ang + Math.PI / 2), y: Math.sin(ang + Math.PI / 2) };
  });
}

/** Kollabiert die Segmente Richtung Kopf (Ausroll-Phase). */
function collapseCoil(head: Enemy, segments: readonly Enemy[], s: ElectricState, t: number): void {
  head.position = { ...s.center };
  const R = coilRadius(head.size);
  const n = segments.length;
  segments.forEach((seg, i) => {
    const ang = ringAngle(i, n, 0);
    const r = R * (1 - 0.28 * (i / Math.max(1, n))) * t; // t: 1 → 0
    seg.position = { x: s.center.x + Math.cos(ang) * r, y: s.center.y + Math.sin(ang) * r };
    seg.direction = { x: Math.cos(ang + Math.PI / 2), y: Math.sin(ang + Math.PI / 2) };
  });
}

export interface ElectricTick {
  /** `true`, solange `behavior.ts` normal schwimmen + Torpedos abfeuern soll. */
  swimming: boolean;
  /** `true` in genau dem Frame, in dem der Blitz einschlägt. */
  discharged: boolean;
}

/**
 * Ein Frame der Strom-Attacke. Mutiert bei eingerolltem Aal die Positionen von
 * `head` + `segments`. `nowMs` = `performance.now()` (im Test explizit gesetzt).
 */
export function updateElectric(
  head: Enemy,
  segments: readonly Enemy[],
  field: Point[],
  dt: number,
  nowMs: number,
): ElectricTick {
  const s = stateFor(head);

  if (s.phase === 'swimming') {
    s.timer -= dt;
    if (s.timer > 0) return { swimming: true, discharged: false };
    // Attacke beginnt: Kreismitte an der aktuellen Kopf-Position einfrieren.
    s.phase = 'coiling';
    s.timer = COIL_SECONDS;
    s.center = clampToField(head.position, field, coilRadius(head.size) + head.size * 0.3);
    s.startPos = new WeakMap();
    for (const seg of segments) s.startPos.set(seg, { ...seg.position });
    arrangeCoil(head, segments, s, 0, nowMs);
    return { swimming: false, discharged: false };
  }

  if (s.phase === 'coiling') {
    s.timer -= dt;
    const t = clamp01(1 - Math.max(0, s.timer) / COIL_SECONDS);
    arrangeCoil(head, segments, s, t, nowMs);
    if (s.timer <= 0) {
      s.phase = 'discharge';
      s.timer = DISCHARGE_SECONDS;
      s.lastDischargeMs = nowMs;
      return { swimming: false, discharged: true };
    }
    return { swimming: false, discharged: false };
  }

  if (s.phase === 'discharge') {
    s.timer -= dt;
    arrangeCoil(head, segments, s, 1, nowMs);
    if (s.timer <= 0) {
      s.phase = 'uncoiling';
      s.timer = UNCOIL_SECONDS;
    }
    return { swimming: false, discharged: false };
  }

  // uncoiling
  s.timer -= dt;
  const t = clamp01(Math.max(0, s.timer) / UNCOIL_SECONDS); // 1 → 0
  collapseCoil(head, segments, s, t);
  if (s.timer <= 0) {
    s.phase = 'swimming';
    s.gapIndex = (s.gapIndex + 1) % GAP_PATTERN.length;
    s.timer = GAP_PATTERN[s.gapIndex];
  }
  return { swimming: false, discharged: false };
}

/**
 * Ladeglühen um den eingerollten Aal, 0..1: steigt beim Einrollen an, ist beim
 * Blitz maximal, klingt beim Ausrollen ab, sonst 0. Von `render.ts` gelesen.
 */
export function electricChargeIntensity(): number {
  const s = current;
  if (!s) return 0;
  if (s.phase === 'coiling') return clamp01(1 - Math.max(0, s.timer) / COIL_SECONDS) * 0.9;
  if (s.phase === 'discharge') return 1;
  if (s.phase === 'uncoiling') return clamp01(Math.max(0, s.timer) / UNCOIL_SECONDS) * 0.7;
  return 0;
}

/**
 * Feld-Blitz-Helligkeit 0..1 für die Deko (`decoration.ts`). Klingt rein über
 * die Wanduhrzeit ab – unabhängig davon, ob `updateElectric` gerade tickt
 * (z.B. während des Pause-Bonussteins).
 */
export function electricFieldFlash(nowMs: number): number {
  const s = current;
  if (!s) return 0;
  const age = nowMs - s.lastDischargeMs;
  if (age < 0 || age >= FIELD_FLASH_MS) return 0;
  return Math.pow(1 - age / FIELD_FLASH_MS, 0.6);
}
