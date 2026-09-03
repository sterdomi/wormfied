import type { Enemy } from '../../game/enemy';
import type { LevelEnemyAssets, LevelEnemyRenderState } from '../types';
import { FIELD_W, GORILLA_BASE_Y, peekDrumming } from './drumming';
import { gorillaSprite } from './sprites';

/** Render-Höhe des Gorillas in Pixeln (Breite folgt dem Frame-Seitenverhältnis). */
const GORILLA_RENDER_HEIGHT = 300;
/** Feinjustierung nach unten (transparenter Rand unter der Figur im Sprite). */
const BASE_NUDGE = 0.03;

/**
 * Papagei-Flügelschlag: zwei Frames mit unterschiedlichem Bildausschnitt (KI-
 * generiert) – die opaken Bounding-Boxes sind hier abgemessen, damit beide auf
 * denselben Körper-Anker ausgerichtet gezeichnet werden können (sonst springt
 * der Vogel beim Frame-Wechsel).
 *  - `up`   = `assets.miniEnemy`      (`papagei_up.png`,   Flügel oben)
 *  - `down` = `assets.miniEnemyWalk`  (`papagei_down.png`, Flügel unten)
 */
const PARROT_CROP = {
  up: { sx: 256, sy: 212, sw: 1531, sh: 1628 },
  down: { sx: 128, sy: 397, sw: 765, sh: 523 },
} as const;
/** Zielbreite des Papageis (Höhe folgt dem jeweiligen Ausschnitt). */
const PARROT_WIDTH = 60;
/** Anteil der Ausschnitts-Höhe (von oben), auf dem der Körper-Anker sitzt –
 *  in beiden Frames ~gleich, damit der Rumpf beim Schlagen ruhig bleibt. */
const PARROT_BODY_ANCHOR = 0.56;
/** Ab dieser |direction.x| übernimmt der Papagei eine neue Blickrichtung (Hysterese). */
const PARROT_FLIP_THRESHOLD = 0.2;

/** Blickrichtung je Papagei – nur bei deutlich waagerechter Bewegung umgeschaltet. */
const parrotFacesRight = new WeakMap<Enemy, boolean>();

function drawParrot(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  crop: (typeof PARROT_CROP)[keyof typeof PARROT_CROP],
  p: Enemy,
): void {
  let right = parrotFacesRight.get(p) ?? p.direction.x >= 0;
  if (Math.abs(p.direction.x) >= PARROT_FLIP_THRESHOLD) {
    right = p.direction.x > 0;
    parrotFacesRight.set(p, right);
  }
  const w = PARROT_WIDTH;
  const h = w * (crop.sh / crop.sw);
  ctx.save();
  ctx.translate(p.position.x, p.position.y);
  if (right) ctx.scale(-1, 1); // Sprite zeigt nativ nach LINKS
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, -w / 2, -h * PARROT_BODY_ANCHOR, w, h);
  ctx.restore();
}

/**
 * Gegner-Ebene von Level 4:
 *  - **Papageien** (Mini-Gegner) an ihren Positionen, Flügelschlag im
 *    gemeinsamen Takt (`useWalkFrame`), in Flugrichtung ausgerichtet (nativ
 *    nach links, gespiegelt bei Flug nach rechts);
 *  - der **trommelnde Gorilla**, fix unten in der Bildschirmmitte – Grundlinie
 *    an der Feld-Unterkante (`GORILLA_BASE_Y`), Körper grösstenteils im
 *    gesperrten unteren 20 %, Kopf/Schultern über der schwarzen Linie.
 *    Unabhängig von `mainEnemy.position` (nur der Logik-/Kollisionspunkt).
 *
 * `hideMainEnemy` (Levelabschluss) lässt den Gorilla weg.
 */
export function renderLevel4Enemies(
  ctx: CanvasRenderingContext2D,
  assets: LevelEnemyAssets,
  state: LevelEnemyRenderState,
): void {
  const { mainEnemy, miniEnemies, mainEnemyScale, hideMainEnemy, useWalkFrame } = state;

  const wingsUp = !useWalkFrame;
  const parrotImg = wingsUp ? assets.miniEnemy : (assets.miniEnemyWalk ?? assets.miniEnemy);
  const crop = wingsUp || !assets.miniEnemyWalk ? PARROT_CROP.up : PARROT_CROP.down;
  if (parrotImg.complete && parrotImg.naturalWidth > 0) {
    for (const p of miniEnemies) drawParrot(ctx, parrotImg, crop, p);
  }

  if (hideMainEnemy) return;
  const frame = peekDrumming(mainEnemy)?.frame ?? 'bereit';
  const img = gorillaSprite(frame);
  if (!img.complete || img.naturalWidth === 0) return;

  const h = GORILLA_RENDER_HEIGHT * mainEnemyScale;
  const w = h * (img.naturalWidth / img.naturalHeight);
  const x = FIELD_W / 2 - w / 2;
  const y = GORILLA_BASE_Y - h + h * BASE_NUDGE;
  ctx.drawImage(img, x, y, w, h);
}
