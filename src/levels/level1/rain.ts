import type { LevelDecorationRenderer } from '../types';
import { lerp, mulberry32 } from '../rng';

/**
 * Regen + gelegentlicher Blitz für den Film-Noir-Look von Level 1
 * (Instruktion 22) – der komplette dekorative Überzug
 * (`LevelConfig.renderDecoration`), zwischen Foreground und Spiel-Ebene.
 * Analog zu Level 2s Wasser-Look (`level2/water.ts`): fest gesäte Parameter
 * einmalig beim Modul-Load, Position/Intensität pro Frame zustandslos aus
 * `now` berechnet – kein `update()`-Takt, kein Teardown.
 *
 *  1. **Regen**: viele kurze, leicht geneigte, halbtransparente Striche, die
 *     von oben nach unten fallen und nahtlos per Modulo umlaufen.
 *  2. **Blitz**: ein kurzer weisser Flash übers ganze Feld (additiv), an
 *     deterministischen, vorab berechneten Zeitpunkten statt echtem
 *     `Math.random()` pro Frame – reproduzierbar bei jedem Levelstart,
 *     testbar über die ausgelagerte `lightningIntensity(now)`.
 */

interface Raindrop {
  /** Horizontale Grundposition als Bruchteil der Feldbreite (0..1). */
  xFraction: number;
  /** Fallgeschwindigkeit (Pixel/Sekunde). */
  speed: number;
  /** Strichlänge in Pixel. */
  length: number;
  /** Deckkraft (0..1). */
  alpha: number;
  /** Phasenversatz (0..1) entlang der Fallstrecke – verteilt die Start-Höhen. */
  phase: number;
  /** Horizontaler Versatz pro vertikalem Pixel (Windschräge), leicht pro Tropfen variiert. */
  dxPerDy: number;
}

/** Anzahl gleichzeitig sichtbarer Tropfen – spürbarer Regen, Spielfeld bleibt lesbar. */
const RAINDROP_COUNT = 130;
/** Kleine Überlänge oben/unten, damit kein Tropfen hart am Rand abreisst. */
const EDGE_OVERFLOW_PX = 24;

const RAINDROPS: readonly Raindrop[] = (() => {
  const rand = mulberry32(0x9e3b7a1);
  return Array.from({ length: RAINDROP_COUNT }, () => ({
    xFraction: rand(),
    speed: lerp(650, 1150, rand()),
    length: lerp(14, 30, rand()),
    alpha: lerp(0.12, 0.4, rand()),
    phase: rand(),
    dxPerDy: lerp(0.05, 0.11, rand()),
  }));
})();

/** Fallende Regenstriche, oben/unten nahtlos umlaufend (Modulo wie Level 2s Blasen). */
function renderRain(ctx: CanvasRenderingContext2D, width: number, height: number, now: number): void {
  const t = now / 1000;
  const travel = height + 2 * EDGE_OVERFLOW_PX;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.4;

  for (const drop of RAINDROPS) {
    const y = ((t * drop.speed + drop.phase * travel) % travel) - EDGE_OVERFLOW_PX;
    const x = drop.xFraction * width + y * drop.dxPerDy;
    const tailY = y - drop.length;
    const tailX = x - drop.length * drop.dxPerDy;

    ctx.globalAlpha = drop.alpha;
    ctx.strokeStyle = 'rgba(205, 215, 232, 1)';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  ctx.restore();
}

interface LightningStrike {
  /** Zeitpunkt innerhalb von `LIGHTNING_CYCLE_MS`, an dem das erste Zucken beginnt. */
  atMs: number;
  durationMs: number;
  /** Abstand zwischen Ende des ersten und Beginn des zweiten (schwächeren) Zuckens. */
  doubleGapMs: number;
}

/**
 * Das Blitz-Muster wiederholt sich nach dieser Zeit (statt unendlich fortzusetzen)
 * – ausreichend lang, dass eine Wiederholung im Spiel praktisch nicht auffällt.
 */
export const LIGHTNING_CYCLE_MS = 42_000;

/** Alle ~6–14 s ein Blitz-Ereignis, erstes frühestens nach ein paar Sekunden
 *  (kein Blitz direkt beim Levelstart), letztes mit Sicherheitsabstand zum
 *  Zyklusende (kein Überlappen mit dem Wiederholungs-Sprung). */
const LIGHTNING_STRIKES: readonly LightningStrike[] = (() => {
  const rand = mulberry32(0x1c5a11a);
  const strikes: LightningStrike[] = [];
  let t = lerp(3000, 9000, rand());
  const safetyMarginMs = 2000;
  while (t < LIGHTNING_CYCLE_MS - safetyMarginMs) {
    strikes.push({
      atMs: t,
      durationMs: lerp(150, 250, rand()),
      doubleGapMs: lerp(70, 140, rand()),
    });
    t += lerp(6000, 14000, rand());
  }
  return strikes;
})();

/** Schneller Anstieg, etwas langsameres Abklingen – wirkt eher wie ein Blitz als ein symmetrisches Dreieck. */
function flashFade(elapsedMs: number, durationMs: number): number {
  if (elapsedMs < 0 || elapsedMs > durationMs) return 0;
  const p = elapsedMs / durationMs;
  return p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75;
}

/** Intensität (0..1) eines einzelnen Blitz-Ereignisses zur Zeit `elapsedMs` seit `strike.atMs`. */
function strikeIntensity(strike: LightningStrike, elapsedMs: number): number {
  const first = flashFade(elapsedMs, strike.durationMs);
  const second = flashFade(
    elapsedMs - strike.durationMs - strike.doubleGapMs,
    strike.durationMs * 0.7,
  );
  return Math.max(first, 0.7 * second);
}

/**
 * Blitz-Intensität (0..1) zur Wanduhrzeit `nowMs` – reine, deterministische
 * Funktion (ausgelagert für gezielte Tests), unabhängig vom Rest der Deko.
 */
export function lightningIntensity(nowMs: number): number {
  const cyclePos = nowMs % LIGHTNING_CYCLE_MS;
  let intensity = 0;
  for (const strike of LIGHTNING_STRIKES) {
    const local = strikeIntensity(strike, cyclePos - strike.atMs);
    if (local > intensity) intensity = local;
  }
  return intensity;
}

/** Kurzer weisser Flash übers ganze Feld (additiv), wenn `lightningIntensity` > 0. */
function renderLightningFlash(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
): void {
  const intensity = lightningIntensity(now);
  if (intensity <= 0.002) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(225, 235, 255, ${0.55 * intensity})`;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Kompletter Regen-Überzug: Regen → Blitz (additiv über den bereits gezeichneten Tropfen). */
export const renderLevel1Rain: LevelDecorationRenderer = (ctx, { width, height, now }) => {
  renderRain(ctx, width, height, now);
  renderLightningFlash(ctx, width, height, now);
};
