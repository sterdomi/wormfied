import type { LevelDecorationState } from '../types';
import { clamp01, lerp, mulberry32 } from '../rng';

/**
 * Aufsteigende Luftblasen für den gemeinsamen Unterwasser-Look (ursprünglich
 * Level 2, jetzt auch von Level 3 genutzt – siehe `water.ts`) – rein
 * dekorativ, zwischen Foreground und Spiel-Ebene gezeichnet
 * (`LevelConfig.renderDecoration`).
 *
 * Drei Quellen:
 *  - der **Grundschleier**: 34 kleine + 6 grosse Blasen, die dauerhaft
 *    aufsteigen. Sie tragen KEINEN fortgeschriebenen Zustand – ihre Position
 *    ist eine reine Funktion der Frame-Wanduhrzeit `now` (wie der
 *    Bonusstein-Puls / die Bein-Animation in `render()`), also kein
 *    `update()`-Takt, kein Teardown. Feste Parameter einmalig per gesätem PRNG
 *    (deterministisch, u.a. für Tests).
 *  - **Bläschen-Wölkchen** (`spawnTorpedoBubbleBurst(x, y)`): ein kurzlebiges,
 *    aufsteigendes Wölkchen an einem Punkt. Ausgelöst von `behavior.ts` beim
 *    Abfeuern (hinter dem Torpedo) und von `main.ts` über
 *    `LevelConfig.onEnemyProjectileImpact` beim Einschlag (Linie/Spieler
 *    getroffen). Das ist der einzige Zustand hier: eine kleine, gedeckelte
 *    Liste von (Ort, Geburtszeit).
 *  - die **Torpedo-Spur**: hinter jedem fliegenden Projektil
 *    (`LevelDecorationState.enemyProjectiles`) eine kurze Bläschen-Fahne, die
 *    aufsteigt. Ebenfalls zustandslos – berechnet aus Projektil-Position/
 *    -Geschwindigkeit und `now` (geradliniger Flug: die Position vor `a`
 *    Sekunden ist `position - velocity·a`).
 */

/** Kleine, zahlreiche Blasen – der Grundschleier. */
const BUBBLE_COUNT = 34;
/** Wenige, deutlich grössere und langsamere „Brocken" dazwischen. */
const BIG_BUBBLE_COUNT = 6;
/** Randnahe Ein-/Ausblendung (Pixel), damit Blasen nicht hart erscheinen. */
const EDGE_FADE_PX = 70;

/** Lebensdauer eines Abschuss-Wölkchens (Millisekunden). */
const BURST_LIFETIME_MS = 2200;
/** Blasen pro Abschuss-Wölkchen – bewusst kräftig, damit der Schuss auffällt. */
const BURST_BUBBLE_COUNT = 18;
/** So viele Wölkchen werden höchstens gleichzeitig behalten. */
const BURST_MAX = 12;

/** Bläschen entlang der Spur hinter einem fliegenden Torpedo. */
const TRAIL_SAMPLE_COUNT = 16;
/** „Alter" (Sekunden) des ältesten Spur-Bläschens – bestimmt mit der
 *  Projektil-Geschwindigkeit die Spurlänge (v·t). */
const TRAIL_LIFETIME_S = 0.38;
/** Aufstiegstempo eines Spur-Bläschens (Pixel/Sekunde). */
const TRAIL_RISE_SPEED = 95;
/** Grund-Deckkraft am Spuranfang (Heck des Torpedos). */
const TRAIL_BASE_ALPHA = 0.6;

interface Bubble {
  /** Horizontale Grundposition als Bruchteil der Feldbreite (0..1). */
  baseXFraction: number;
  /** Radius in Pixel. */
  radius: number;
  /** Aufstiegsgeschwindigkeit in Pixel/Sekunde. */
  riseSpeed: number;
  /** Seitliche Schlängel-Amplitude in Pixel. */
  wobbleAmplitude: number;
  /** Schlängel-Frequenz in Radiant/Sekunde. */
  wobbleFrequency: number;
  /** Phasenversatz (0..1) – verteilt Start-Höhe und Schlängel über die Blasen. */
  phase: number;
  /** Grund-Deckkraft (0..1) in der Feldmitte. */
  baseAlpha: number;
}

/** Ein Bläschen der Torpedo-Spur, als feste Form (Anteil entlang der Spur +
 *  Schlängel-/Grössen-Parameter). Position pro Frame aus dem Projektilzustand. */
interface TrailSample {
  /** 0..1 – Position entlang der Spur (0 = frisch am Heck, 1 = ältestes Ende). */
  ageFraction: number;
  /** Seitliche Schlängel-Amplitude (quer zur Flugrichtung) in Pixel. */
  perpAmplitude: number;
  wobbleFrequency: number;
  phase: number;
  radius: number;
  /** Individueller Aufstiegs-Faktor auf `TRAIL_RISE_SPEED`. */
  riseBias: number;
}

/** Ein einzelnes Bläschen eines Abschuss-Wölkchens, relativ zum Abschussort. */
interface BurstParticle {
  /** Seitlicher Versatz in Pixel (Streuung um den Abschussort). */
  offsetX: number;
  /** Gesamter Steigweg über die Lebensdauer, in Pixel. */
  riseDistance: number;
  /** Radius in Pixel. */
  radius: number;
  /** Start-Verzögerung als Bruchteil der Lebensdauer (0..~0.35), staffelt die Blasen. */
  delay: number;
  wobbleAmplitude: number;
  wobbleFrequency: number;
}

interface LaunchBurst {
  x: number;
  y: number;
  bornMs: number;
}

const BUBBLES: readonly Bubble[] = (() => {
  const rand = mulberry32(0xb0bb1e5);
  const small: Bubble[] = Array.from({ length: BUBBLE_COUNT }, () => ({
    baseXFraction: rand(),
    // Hoch 1.7 → mehr kleine als grosse Blasen.
    radius: lerp(1.6, 6.5, rand() ** 1.7),
    riseSpeed: lerp(14, 46, rand()),
    wobbleAmplitude: lerp(3, 13, rand()),
    wobbleFrequency: lerp(0.6, 1.8, rand()),
    phase: rand(),
    baseAlpha: lerp(0.12, 0.4, rand()),
  }));
  // Vereinzelte grosse Blasen: grösserer Radius, langsamerer Aufstieg, weiterer
  // und trägerer Schlängel, dafür geringere Deckkraft (dünnwandig-durchsichtig).
  const big: Bubble[] = Array.from({ length: BIG_BUBBLE_COUNT }, () => ({
    baseXFraction: rand(),
    radius: lerp(9, 17, rand()),
    riseSpeed: lerp(10, 24, rand()),
    wobbleAmplitude: lerp(8, 20, rand()),
    wobbleFrequency: lerp(0.35, 0.9, rand()),
    phase: rand(),
    baseAlpha: lerp(0.08, 0.22, rand()),
  }));
  return [...small, ...big];
})();

/** Feste Form eines Abschuss-Wölkchens – gleiche Streuung bei jedem Schuss. */
const BURST_PARTICLES: readonly BurstParticle[] = (() => {
  const rand = mulberry32(0x70a90d0);
  return Array.from({ length: BURST_BUBBLE_COUNT }, () => ({
    offsetX: lerp(-24, 24, rand()),
    // Weit genug hoch, dass die Blasen deutlich über den Kopf-Sprite steigen.
    riseDistance: lerp(80, 190, rand()),
    radius: lerp(2.6, 9, rand()),
    delay: rand() * 0.4,
    wobbleAmplitude: lerp(3, 11, rand()),
    wobbleFrequency: lerp(1.4, 3.4, rand()),
  }));
})();

/** Feste Form der Torpedo-Spur – gleiche „Streuung" bei jedem Projektil. */
const TRAIL_SAMPLES: readonly TrailSample[] = (() => {
  const rand = mulberry32(0x7401a11);
  return Array.from({ length: TRAIL_SAMPLE_COUNT }, (_, i) => ({
    // Gleichmässig verteilt + etwas Jitter, damit die Spur nicht „gestrichelt" wirkt.
    ageFraction: clamp01((i + rand() * 0.7) / TRAIL_SAMPLE_COUNT),
    perpAmplitude: lerp(1.4, 5.5, rand()),
    wobbleFrequency: lerp(2, 5, rand()),
    phase: rand() * Math.PI * 2,
    radius: lerp(1.3, 3.8, rand()),
    riseBias: lerp(0.7, 1.35, rand()),
  }));
})();

/** Aktive Abschuss-Wölkchen (jüngstes zuletzt). Einziger Zustand des Moduls. */
let bursts: LaunchBurst[] = [];

/**
 * Löst an `(x, y)` ein kurzlebiges, aufsteigendes Bläschen-Wölkchen aus –
 * beim Abfeuern (hinter dem Torpedo, aus `behavior.ts`) und beim Einschlag
 * (Linie/Spieler getroffen, aus `main.ts` via `onEnemyProjectileImpact`).
 * Aeltere, abgelaufene Wölkchen werden dabei gleich mit aufgeräumt.
 */
export function spawnTorpedoBubbleBurst(x: number, y: number): void {
  const nowMs = performance.now();
  bursts = bursts.filter((b) => nowMs - b.bornMs < BURST_LIFETIME_MS);
  bursts.push({ x, y, bornMs: nowMs });
  if (bursts.length > BURST_MAX) bursts.splice(0, bursts.length - BURST_MAX);
}

/** Nur für Tests: alle aktiven Abschuss-Wölkchen verwerfen. */
export function _resetTorpedoBubbleBursts(): void {
  bursts = [];
}

/** Zeichnet einen Blasen-Umriss + Glanzpunkt an `(x, y)` mit Deckkraft `alpha`. */
function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
  ctx.fill();

  ctx.lineWidth = Math.max(0.6, radius * 0.22);
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x - radius * 0.32, y - radius * 0.32, Math.max(0.5, radius * 0.28), 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha * 1.6)})`;
  ctx.fill();
}

/**
 * Zeichnet Grundschleier + Abschuss-Wölkchen + Torpedo-Spuren für diesen Frame.
 * Erfüllt `LevelDecorationRenderer`. Jede Grundschleier-Blase steigt geradlinig,
 * schlängelt per Sinus und blendet an Ober-/Unterkante weich ein/aus; oben
 * angekommen setzt sie unten nahtlos wieder ein (Modulo über den Gesamtweg).
 */
export function renderUnderwaterBubbles(
  ctx: CanvasRenderingContext2D,
  { width, height, now, enemyProjectiles }: LevelDecorationState,
): void {
  const t = now / 1000;
  const travel = height + 2 * EDGE_FADE_PX;

  ctx.save();

  for (const b of BUBBLES) {
    const progress = (t * b.riseSpeed + b.phase * travel) % travel;
    const y = height + EDGE_FADE_PX - progress;
    const x =
      b.baseXFraction * width +
      Math.sin(t * b.wobbleFrequency + b.phase * Math.PI * 2) * b.wobbleAmplitude;

    const edgeFade = clamp01(Math.min(progress, travel - progress) / EDGE_FADE_PX);
    const alpha = b.baseAlpha * edgeFade;
    if (alpha > 0.003) drawBubble(ctx, x, y, b.radius, alpha);
  }

  // Abschuss-Wölkchen: pro Wölkchen die feste `BURST_PARTICLES`-Form, nach
  // Alter (0..1) hochsteigend und ausblendend. Abgelaufene werden hier nicht
  // entfernt (das macht `spawnTorpedoBubbleBurst`), nur übersprungen.
  for (const burst of bursts) {
    const age = clamp01((now - burst.bornMs) / BURST_LIFETIME_MS);
    if (age >= 1) continue;
    for (const p of BURST_PARTICLES) {
      const local = clamp01((age - p.delay) / (1 - p.delay));
      if (local <= 0) continue;
      const x =
        burst.x + p.offsetX + Math.sin(local * p.wobbleFrequency * Math.PI * 2) * p.wobbleAmplitude;
      const y = burst.y - local * p.riseDistance;
      // Fast sofort da (markant), dann über die Restzeit weich ausblenden.
      const alpha = 0.95 * Math.min(1, local * 12) * (1 - local) ** 0.7;
      if (alpha > 0.003) drawBubble(ctx, x, y, p.radius * (1 - 0.25 * local), alpha);
    }
  }

  // Torpedo-Spur: Ein Spur-Bläschen mit „Alter" a sitzt dort, wo das Projektil
  // vor a Sekunden war (`position - velocity·a`, geradliniger Flug), plus dem
  // seither zurückgelegten Aufstieg – rein aus Projektilzustand + `now`, ohne
  // jede Emissions-Buchhaltung.
  for (const proj of enemyProjectiles ?? []) {
    const speed = Math.hypot(proj.velocity.x, proj.velocity.y);
    if (speed < 1) continue;
    const dirX = proj.velocity.x / speed;
    const dirY = proj.velocity.y / speed;
    // Startpunkt am Heck des Torpedos, quer dazu die Schlängel-Achse.
    const tailX = proj.position.x - dirX * proj.size * 0.5;
    const tailY = proj.position.y - dirY * proj.size * 0.5;

    for (const s of TRAIL_SAMPLES) {
      const a = s.ageFraction * TRAIL_LIFETIME_S;
      const wob = Math.sin(t * s.wobbleFrequency + s.phase) * s.perpAmplitude;
      // Schlängel quer zur Flugrichtung: perp = (-dirY, dirX).
      const x = tailX - proj.velocity.x * a - dirY * wob;
      const y = tailY - proj.velocity.y * a - TRAIL_RISE_SPEED * a * s.riseBias + dirX * wob;
      // Jung: schnell einblenden. Alt: zum Spurende hin ausklingen.
      const alpha = TRAIL_BASE_ALPHA * Math.min(1, s.ageFraction * 10) * (1 - s.ageFraction) ** 0.7;
      if (alpha > 0.003) drawBubble(ctx, x, y, s.radius, alpha);
    }
  }

  ctx.restore();
}
