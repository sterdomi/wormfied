import type { Enemy } from '../../game/enemy';
import type { Point } from '../../game/field';
import { fitsInPolygon } from '../../game/enemyMovement';
import { BODY_MINI_SCALE } from '../../game/snakeBody';
import { clamp01, lerp } from '../rng';

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
 * Der Zustand hängt – wie `snakeBodyFor` (`game/snakeBody.ts`, auch von
 * diesem Level genutzt) und wie einst `holeStateFor` im archivierten
 * Schlangen-Level – in einer `WeakMap` mit dem Kopf-`Enemy` als Key (frischer
 * Kopf bei `rebuildField` → frischer, im `swimming` startender Zustand). Für
 * die zustandslose Feld-Deko (`decoration.ts`, kennt den Kopf nicht) spiegelt
 * das Modul den jeweils aktuellen Zustand zusätzlich in `current`.
 */

export type ElectricPhase = 'swimming' | 'coiling' | 'discharge' | 'uncoiling';

/** Pausen (Sekunden Schwimmen) zwischen zwei Attacken – wiederholt sich. */
export const GAP_PATTERN: readonly number[] = [1, 3, 5, 3];
/** Dauer des Einrollens (Sekunden) – zugleich die Vorwarnzeit zum Andocken. */
export const COIL_SECONDS = 1;
/** Dauer des sichtbaren Blitzes (Sekunden) – etwa doppelt so lang (Nutzer-Feedback). */
export const DISCHARGE_SECONDS = 0.32;
/** Dauer des Ausrollens (Sekunden). */
export const UNCOIL_SECONDS = 0.5;
/** Nachleuchten des Feld-Blitzes (Millisekunden) – für `electricFieldFlash`. */
const FIELD_FLASH_MS = 760;

interface ElectricState {
  phase: ElectricPhase;
  /** Restzeit der aktuellen Phase bzw. der Schwimm-Pause (Sekunden). */
  timer: number;
  /** Index in `GAP_PATTERN` für die nächste Schwimm-Pause. */
  gapIndex: number;
  /** Eingefrorene Kreismitte während coiling/discharge/uncoiling. */
  center: Point;
  /**
   * Eingefrorener Kranzradius (px) für diese Attacke. Bei freiem Aal
   * `= freeR`; kreist der Spieler ihn ein, schrumpft er so weit, dass kein
   * Körperglied durch eine (Zeichen-)Linie ragt (`fittingCoilRadius`).
   */
  coilR: number;
  /** Kranzradius bei freiem Aal – Referenz für `electricCoilScale`. */
  freeR: number;
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
    coilR: 0,
    freeR: 0,
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

/** Radius des Kranzes für einen Kopf dieser Grösse (freier Aal). */
function coilRadius(headSize: number): number {
  return headSize * 1.35;
}

/**
 * Körperteil-Radius als Vielfaches von `head.size`. Im eingerollten Zustand
 * zeichnet `render.ts` ALLE Glieder – Schwanz eingeschlossen – gleich gross
 * (`bodySize` = `head.size × BODY_MINI_SCALE`, kein `TAIL_RENDER_SCALE` mehr,
 * Nutzer-Feedback „ordne alle Teile gleich an"); dieser Faktor muss dazu
 * passen, damit kein Glied durch eine Linie ragt.
 */
const MAX_SEGMENT_OVERHANG_FACTOR = BODY_MINI_SCALE / 2;

/** Acht Strahlrichtungen (Achsen + Diagonalen) zum Abtasten des freien Raums
 *  um die Kreismitte. */
const COIL_PROBE_DIRS: readonly { x: number; y: number }[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: Math.SQRT1_2, y: Math.SQRT1_2 },
  { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
];
const COIL_PROBE_STEP = 4;

/**
 * Grösster Kranzradius ≤ `desired`, bei dem rund um `center` in allen acht
 * Richtungen (`COIL_PROBE_DIRS`) noch `margin` Abstand zum Feldrand bleibt.
 * `field` ist das aktive – bei einer Einkreisung bereits verkleinerte –
 * Feld-Polygon, die vom Spieler gezogenen Linien sind darin also schon
 * enthalten. Freier Aal → `desired`; eingekreist → so weit geschrumpft, dass
 * kein Körperglied durch eine Linie ragt.
 */
function fittingCoilRadius(
  center: Point,
  field: Point[],
  desired: number,
  margin: number,
): number {
  if (field.length < 3) return desired;
  let limit = desired;
  for (const dir of COIL_PROBE_DIRS) {
    let reach = 0;
    while (reach + COIL_PROBE_STEP <= limit) {
      const next = reach + COIL_PROBE_STEP;
      if (!fitsInPolygon({ x: center.x + dir.x * next, y: center.y + dir.y * next }, field, margin)) {
        break;
      }
      reach = next;
    }
    if (reach < limit) limit = reach;
    if (limit <= 0) break;
  }
  return Math.max(0, limit);
}

/**
 * Zieht `p` auf der Strecke zu `toward` so weit ein, bis er mit `margin` ins
 * Feld passt. `toward` MUSS im Feld liegen (Aufrufer übergibt die
 * Aal-Schwimm-Position, die dort per `advanceSnakeBody` garantiert passte) –
 * sonst wird `p` unverändert zurückgegeben, statt evtl. einen Punkt ausserhalb
 * des (nach mehreren Eroberungen nicht-konvexen) Feldes zu liefern.
 *
 * Fängt ab, was `fittingCoilRadius` mit nur acht Strahlen nicht abdeckt
 * (nicht-rechteckige oder extrem enge Einkreisung) – danach ragt garantiert
 * kein Körperglied durch eine Linie.
 */
function pullInside(p: Point, toward: Point, field: Point[], margin: number): Point {
  if (field.length < 3 || fitsInPolygon(p, field, margin)) return p;
  if (!fitsInPolygon(toward, field, 0)) return p;
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 14; k++) {
    const mid = (lo + hi) / 2;
    if (fitsInPolygon({ x: lerp(p.x, toward.x, mid), y: lerp(p.y, toward.y, mid) }, field, margin)) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return { x: lerp(p.x, toward.x, hi), y: lerp(p.y, toward.y, hi) };
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

/**
 * Zielwinkel von Segment `i` im Kranz: `n` Glieder GLEICHMÄSSIG (je `2π/n`) auf
 * genau einer Umdrehung verteilt – kein Spiral-Überlappen mehr und der Schwanz
 * (letzter Index) sitzt wie jedes andere Glied auf dem Kreis (Nutzer-Feedback
 * „ordne alle Teile gleich an, auch den Schwanz").
 */
function ringAngle(i: number, n: number, spin: number): number {
  return spin + (i / Math.max(1, n)) * Math.PI * 2;
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
  field: Point[],
): void {
  // Der Kranz rotiert langsam („Aufladen"); der Kopf bleibt in der Mitte und
  // behält seine letzte Schwimm-Blickrichtung (kein wackelndes Umkippen im
  // `render.ts`-Spiegel-Handling während der Rotation).
  const spin = nowMs / 700;
  head.position = { ...s.center };

  const n = segments.length;
  const R = s.coilR;
  const segMargin = head.size * MAX_SEGMENT_OVERHANG_FACTOR;
  segments.forEach((seg, i) => {
    const ang = ringAngle(i, n, spin);
    // Alle Glieder auf demselben Radius (kein i-abhängiges Einrücken) – der
    // Schwanz sitzt dadurch bündig im Kranz statt weiter aussen/unten.
    const target = { x: s.center.x + Math.cos(ang) * R, y: s.center.y + Math.sin(ang) * R };
    const from = s.startPos.get(seg) ?? seg.position;
    const pos = { x: lerp(from.x, target.x, t), y: lerp(from.y, target.y, t) };
    // Sicherheitsnetz: nie durch eine Linie (Nutzer-Feedback) – zur Kreismitte
    // hin einziehen, falls die interpolierte Position aus dem (verkleinerten)
    // Feld ragt.
    seg.position = pullInside(pos, s.center, field, segMargin);
    // Tangential zur Kreisbahn ausrichten.
    seg.direction = { x: Math.cos(ang + Math.PI / 2), y: Math.sin(ang + Math.PI / 2) };
  });
}

/** Kollabiert die Segmente Richtung Kopf (Ausroll-Phase). */
function collapseCoil(
  head: Enemy,
  segments: readonly Enemy[],
  s: ElectricState,
  t: number,
  field: Point[],
): void {
  head.position = { ...s.center };
  const R = s.coilR;
  const n = segments.length;
  const segMargin = head.size * MAX_SEGMENT_OVERHANG_FACTOR;
  segments.forEach((seg, i) => {
    const ang = ringAngle(i, n, 0);
    const r = R * t; // t: 1 → 0, alle Glieder auf demselben Radius
    const pos = { x: s.center.x + Math.cos(ang) * r, y: s.center.y + Math.sin(ang) * r };
    seg.position = pullInside(pos, s.center, field, segMargin);
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
    // Attacke beginnt: Kreismitte + Kranzradius einfrieren. Kreist der Spieler
    // den Aal ein, ist `field` bereits das kleine Pocket-Polygon – der Kranz
    // schrumpft dann so weit, dass kein Körperglied durch eine Linie ragt
    // (Nutzer-Feedback), statt weiter in voller Grösse zu kreisen.
    s.phase = 'coiling';
    s.timer = COIL_SECONDS;
    s.freeR = coilRadius(head.size);
    const segMargin = head.size * MAX_SEGMENT_OVERHANG_FACTOR;
    // Anker für `pullInside` ist die Schwimm-Position des Kopfes – die lag per
    // `advanceSnakeBody` garantiert im (evtl. nicht-konvexen) Feld; der
    // Ecken-Schwerpunkt könnte dagegen ausserhalb liegen.
    const center = pullInside(
      clampToField(head.position, field, s.freeR + head.size * 0.3),
      head.position,
      field,
      segMargin,
    );
    s.center = center;
    s.coilR = fittingCoilRadius(center, field, s.freeR, segMargin);
    s.startPos = new WeakMap();
    for (const seg of segments) s.startPos.set(seg, { ...seg.position });
    arrangeCoil(head, segments, s, 0, nowMs, field);
    return { swimming: false, discharged: false };
  }

  if (s.phase === 'coiling') {
    s.timer -= dt;
    const t = clamp01(1 - Math.max(0, s.timer) / COIL_SECONDS);
    arrangeCoil(head, segments, s, t, nowMs, field);
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
    arrangeCoil(head, segments, s, 1, nowMs, field);
    if (s.timer <= 0) {
      s.phase = 'uncoiling';
      s.timer = UNCOIL_SECONDS;
    }
    return { swimming: false, discharged: false };
  }

  // uncoiling
  s.timer -= dt;
  const t = clamp01(Math.max(0, s.timer) / UNCOIL_SECONDS); // 1 → 0
  collapseCoil(head, segments, s, t, field);
  if (s.timer <= 0) {
    s.phase = 'swimming';
    s.gapIndex = (s.gapIndex + 1) % GAP_PATTERN.length;
    s.timer = GAP_PATTERN[s.gapIndex];
  }
  return { swimming: false, discharged: false };
}

/**
 * Verhältnis des (bei einer Einkreisung geschrumpften) Kranzradius zum freien
 * Radius, 0..1. `render.ts` skaliert damit das Ladeglühen mit, sodass auch der
 * Lichtschein kleiner wird, wenn der eingekreiste Aal wenig Platz hat. `1` =
 * freier Aal bzw. keine laufende Attacke.
 */
export function electricCoilScale(): number {
  const s = current;
  if (!s || s.phase === 'swimming' || s.freeR <= 0) return 1;
  return clamp01(s.coilR / s.freeR);
}

/**
 * `true`, solange der Aal eingerollt ist (Einrollen/Blitz/Ausrollen). `render.ts`
 * zeichnet dann alle Körperglieder gleich gross – auch den Schwanz, der sonst
 * (1.6×) aus dem Kranz ragen würde (Nutzer-Feedback „ordne alle Teile gleich an").
 */
export function electricIsCoiling(): boolean {
  return current !== null && current.phase !== 'swimming';
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
 * Deckkraft 0..1 der schwarzen Fläche über dem Foreground (`LevelConfig.
 * foregroundBlackout`): steigt beim Einrollen an (Vorwarnung „das Feld wird
 * dunkel"), ist beim Blitz komplett schwarz, klingt beim Ausrollen ab, sonst 0.
 */
export function electricForegroundBlackout(): number {
  const s = current;
  if (!s) return 0;
  if (s.phase === 'coiling') return clamp01(1 - Math.max(0, s.timer) / COIL_SECONDS);
  if (s.phase === 'discharge') return 1;
  if (s.phase === 'uncoiling') return clamp01(Math.max(0, s.timer) / UNCOIL_SECONDS);
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
