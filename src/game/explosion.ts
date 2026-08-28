import type { Point } from './field';

/** Standarddauer/-radius, falls `createExplosion` nichts anderes vorgibt. */
const DEFAULT_DURATION_MS = 500;
const DEFAULT_MAX_RADIUS = 34;

/** Anzahl der radial wegfliegenden Partikel-Linien. */
const PARTICLE_COUNT = 8;

/**
 * Warmer Ton, passend zur `kugel.svg`-Farbwelt aus Instruktion 11 – Default
 * für Gegner-Explosionen. Ring, Füllung und Partikel nutzen alle dieselbe
 * `color` (Füllung nur transparenter, siehe `FILL_ALPHA_FACTOR`); Aufrufer
 * können sie überschreiben (Instruktion 14: Bonusstein-Aufnahme-Effekte in
 * typspezifischer Farbe statt eines komplett neuen Effekt-Systems).
 */
const DEFAULT_COLOR = '#f77f00';
/** Füllung deutlich transparenter als Ring/Partikel derselben Farbe. */
const FILL_ALPHA_FACTOR = 0.35;

/**
 * Rein visueller, zeitgesteuerter Effekt: kein Bild/Sprite, nur eine
 * Position + Zeitfenster. Rendering und Ablauf-Prüfung leiten den
 * Animationsfortschritt aus `startTime`/`durationMs` ab (wie `damageFlashUntil`
 * in `main.ts` – Wanduhrzeit über `performance.now()`, nicht `dt`-Akkumulation,
 * da die Animation unabhängig vom (bei Levelabschluss eingefrorenen)
 * Game-Loop-Update weiterlaufen muss – siehe `pruneExplosions`).
 */
export interface Explosion {
  position: Point;
  startTime: number;
  durationMs: number;
  maxRadius: number;
  color: string;
}

export function createExplosion(position: Point, color: string = DEFAULT_COLOR): Explosion {
  return {
    position: { x: position.x, y: position.y },
    startTime: performance.now(),
    durationMs: DEFAULT_DURATION_MS,
    maxRadius: DEFAULT_MAX_RADIUS,
    color,
  };
}

/** Animationsfortschritt (0–1), geklammert. */
function progressOf(explosion: Explosion, now: number): number {
  const raw = (now - explosion.startTime) / explosion.durationMs;
  return Math.min(1, Math.max(0, raw));
}

/** `true`, sobald die Explosion ihre `durationMs` überschritten hat. */
export function isExplosionExpired(explosion: Explosion, now: number): boolean {
  return now - explosion.startTime >= explosion.durationMs;
}

/** Entfernt abgelaufene Explosionen aus der Liste (neue Liste, kein Mutieren). */
export function pruneExplosions(explosions: readonly Explosion[], now: number): Explosion[] {
  return explosions.filter((e) => !isExplosionExpired(e, now));
}

/**
 * Zeichnet eine Explosion für den aktuellen Zeitpunkt `now`: ein wachsender,
 * ausblendender Kreis plus ein paar radial wegfliegende Partikel-Linien.
 * Rein prozedural (Canvas-Formen), kein Bild/Sprite nötig.
 */
export function renderExplosion(
  ctx: CanvasRenderingContext2D,
  explosion: Explosion,
  now: number,
): void {
  const progress = progressOf(explosion, now);
  if (progress >= 1) return;

  const { x, y } = explosion.position;
  const radius = explosion.maxRadius * progress;
  const opacity = 1 - progress;

  ctx.save();

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.globalAlpha = opacity * FILL_ALPHA_FACTOR;
  ctx.fillStyle = explosion.color;
  ctx.fill();
  ctx.globalAlpha = opacity;
  ctx.lineWidth = 3;
  ctx.strokeStyle = explosion.color;
  ctx.stroke();

  const particleLength = explosion.maxRadius * 0.4;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(x + dx * radius, y + dy * radius);
    ctx.lineTo(x + dx * (radius + particleLength), y + dy * (radius + particleLength));
    ctx.lineWidth = 2;
    ctx.strokeStyle = explosion.color;
    ctx.stroke();
  }

  ctx.restore();
}
