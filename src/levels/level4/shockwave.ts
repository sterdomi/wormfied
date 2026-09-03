import type { Point } from '../../game/field';
import { FIELD_H, FIELD_W } from './drumming';

/**
 * Schockwelle von Level 4: Beim Doppelschlag des Gorillas (`drumming.ts`,
 * `shockwave`-Flanke) breitet sich ein Ring vom Bongo aus. Erreicht der Ring den
 * Spieler und der ist **nicht sicher am Rand angedockt**, kostet das ein Leben –
 * `behavior.ts` meldet das über `reportFieldZap`, `main.ts` entscheidet (wie bei
 * der Level-3-Strom-Attacke).
 *
 * Die Welle überstreicht das **ganze Spielfeld** – jeder Punkt (auch die oberen
 * Ecken) wird vom Ring erreicht, bevor er verpufft.
 *
 * Modul-lokaler Zustand (ein Gorilla pro Partie); `_resetShockwave` für Tests.
 */

/** Ursprung der Welle: am Bongo, unten mittig. */
export const SHOCKWAVE_ORIGIN: Point = { x: FIELD_W / 2, y: FIELD_H - 80 };
/** Ausbreitungsgeschwindigkeit des Rings (Pixel/Sekunde). */
const SPEED = 720;
/**
 * Reichweite der Welle – darüber hinaus verpufft sie. Deckt den entferntesten
 * Feldpunkt (obere Ecke) vom Ursprung ab, plus etwas Reserve.
 */
export const MAX_RADIUS =
  Math.hypot(
    Math.max(SHOCKWAVE_ORIGIN.x, FIELD_W - SHOCKWAVE_ORIGIN.x),
    Math.max(SHOCKWAVE_ORIGIN.y, FIELD_H - SHOCKWAVE_ORIGIN.y),
  ) + 24;

interface ShockwaveState {
  active: boolean;
  age: number;
  radius: number;
  hitPlayer: boolean;
}

let state: ShockwaveState = { active: false, age: 0, radius: 0, hitPlayer: false };

/** Startet eine neue Schockwelle (verwirft eine noch laufende). */
export function triggerShockwave(): void {
  state = { active: true, age: 0, radius: 0, hitPlayer: false };
}

/**
 * Ein Frame Schockwellen-Logik. Rückgabe `true` in genau dem Frame, in dem der
 * Ring den Spieler erreicht (der Aufrufer verursacht dann den Schaden). Der
 * Spieler wird pro Welle höchstens einmal getroffen.
 */
export function advanceShockwave(dt: number, playerPos: Point): boolean {
  if (!state.active) return false;
  state.age += dt;
  state.radius = SPEED * state.age;
  if (state.radius > MAX_RADIUS) {
    state.active = false;
    return false;
  }
  if (state.hitPlayer) return false;
  const d = Math.hypot(playerPos.x - SHOCKWAVE_ORIGIN.x, playerPos.y - SHOCKWAVE_ORIGIN.y);
  if (d <= state.radius) {
    state.hitPlayer = true;
    return true;
  }
  return false;
}

/** Zustand für den Renderer. */
export function peekShockwave(): Readonly<ShockwaveState> {
  return state;
}

/** Nur für Tests. */
export function _resetShockwave(): void {
  state = { active: false, age: 0, radius: 0, hitPlayer: false };
}
