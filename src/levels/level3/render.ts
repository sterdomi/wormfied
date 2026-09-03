import type { Enemy, Vec } from '../../game/enemy';
import type { Point } from '../../game/field';
import { BODY_MINI_SCALE } from '../../game/snakeBody';
import type { LevelEnemyAssets, LevelEnemyRenderState } from '../types';
import { electricChargeIntensity } from './electric';
import { classifyLevel3Minis } from './enemySet';

/** Rendergrösse einer frei laufenden Plasma-Mini (kreisrund, keine Rotation). */
const PLASMA_RENDER_SIZE = 30;

/**
 * Lokale „Vorne"-Richtung der Körper-/Schwanz-Sprites (`body.png`, `tail.png`)
 * als Winkel-Offset auf `atan2(dir.y, dir.x)`. Beide zeigen im Bild nach LINKS
 * (−x) – die offene „Anschluss"-Seite, die zum Kopf hin liegt – und sind
 * oben/unten symmetrisch, drehen also sauber in jede Richtung.
 */
const SEGMENT_FORWARD_OFFSET = Math.PI;

/**
 * `head.png` ist eine SEITENANSICHT mit klarem Oben (Schädel) und Unten
 * (Kiefer) und zeigt nach LINKS. Reine Rotation (wie bei den symmetrischen
 * Segmenten) würde den Kopf beim Schwimmen nach rechts „auf den Rücken"
 * legen (Nutzer-Feedback: „manchmal ist der Kopf verkehrt"). Stattdessen:
 * horizontal spiegeln, wenn der Aal nach rechts schwimmt, und nur die Neigung
 * (Pitch, ±90°) drehen – so bleibt der Kiefer immer unten.
 *
 * Damit der Kopf bei fast SENKRECHTER Fahrt (dir.x ≈ 0) nicht zwischen
 * Links- und Rechts-Blick hin- und herflippt, wird die Blickrichtung nur
 * übernommen, wenn die Bewegung deutlich horizontal ist – sonst bleibt die
 * zuletzt gemerkte (`headFacingRight`, je Kopf-`Enemy`).
 */
const headFacingRight = new WeakMap<Enemy, boolean>();
const HORIZONTAL_FLIP_THRESHOLD = 0.35;

function eelHeadFacingRight(head: Enemy, dir: Vec): boolean {
  const prev = headFacingRight.get(head);
  if (prev === undefined || Math.abs(dir.x) >= HORIZONTAL_FLIP_THRESHOLD) {
    const next = dir.x >= 0;
    headFacingRight.set(head, next);
    return next;
  }
  return prev;
}

/** Symmetrisches Segment (`body.png` / `tail.png`): einfach in `direction` drehen. */
function drawSegment(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  position: Point,
  direction: Vec,
  size: number,
): void {
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(Math.atan2(direction.y, direction.x) + SEGMENT_FORWARD_OFFSET);
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  ctx.restore();
}

/** Kopf (`head.png`, Seitenansicht): spiegeln statt überkopf drehen (s.o.). */
function drawHead(
  ctx: CanvasRenderingContext2D,
  head: Enemy,
  sprite: HTMLImageElement,
  size: number,
): void {
  const dir = head.direction;
  const facingRight = eelHeadFacingRight(head, dir);
  // Neigung nach oben/unten, auf ±90° begrenzt (waagerechte Komponente als Basis).
  const pitch = Math.atan2(dir.y, Math.abs(dir.x));

  ctx.save();
  ctx.translate(head.position.x, head.position.y);
  if (facingRight) {
    ctx.rotate(pitch);
    ctx.scale(-1, 1); // links-blickendes Sprite nach rechts spiegeln
  } else {
    ctx.rotate(-pitch);
  }
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  ctx.restore();
}

/**
 * Gegner-Ebene von Level 3. Die geteilte `miniEnemies`-Liste wird in
 * `enemySet.ts` in zwei Gruppen geteilt:
 *
 *  - **Aal**: Kopf (`head.png`) + Körpersegmente (`body.png`) + Schwanz
 *    (`tail.png`, letztes Segment). Positionen/Richtungen setzt
 *    `advanceSnakeBody` / `updateElectric` im selben Frame vor `render`.
 *    Zeichenreihenfolge: von hinten (Schwanz) nach vorne, Kopf zuletzt.
 *  - **Plasma-Minis**: frei laufende Gegner, `gegner_mini.png` ↔
 *    `gegner_mini_walk.png` im gemeinsamen Lauf-Takt (`useWalkFrame`).
 *    Kreisrund – keine Rotation.
 *
 * Sprite-Slots (Level 3 nutzt eigene, bespoke Zuordnung): der Aal-Kopf hat
 * keine Lauf-/Schuss-Animation, daher tragen `mainEnemyWalk` = `body.png` und
 * `mainEnemyShoot` = `tail.png`; `miniEnemy` / `miniEnemyWalk` = die
 * Plasma-Mini-Grafiken.
 *
 * `hideMainEnemy` (Levelabschluss) blendet den Kopf aus.
 * Erfüllt `LevelEnemyRenderer`, Aufruf pro Frame aus `render()` in `main.ts`.
 */
export function renderLevel3Enemies(
  ctx: CanvasRenderingContext2D,
  assets: LevelEnemyAssets,
  state: LevelEnemyRenderState,
): void {
  const { mainEnemy, miniEnemies, mainEnemyScale, hideMainEnemy, useWalkFrame } = state;
  const { body, roamers } = classifyLevel3Minis(miniEnemies);

  const bodySize = mainEnemy.size * BODY_MINI_SCALE;
  const bodySprite = assets.mainEnemyWalk ?? assets.mainEnemy;
  const tailSprite = assets.mainEnemyShoot ?? bodySprite;
  const plasmaSprite =
    useWalkFrame && assets.miniEnemyWalk ? assets.miniEnemyWalk : assets.miniEnemy;

  // Frei laufende Plasma-Minis zuerst (liegen hinter dem Aal), kreisrund.
  for (const m of roamers) {
    ctx.drawImage(
      plasmaSprite,
      m.position.x - PLASMA_RENDER_SIZE / 2,
      m.position.y - PLASMA_RENDER_SIZE / 2,
      PLASMA_RENDER_SIZE,
      PLASMA_RENDER_SIZE,
    );
  }

  // Aal-Körper von hinten nach vorne; das letzte Segment ist der Schwanz.
  for (let i = body.length - 1; i >= 0; i--) {
    const isTail = i === body.length - 1;
    drawSegment(
      ctx,
      isTail ? tailSprite : bodySprite,
      body[i].position,
      body[i].direction,
      bodySize,
    );
  }

  if (!hideMainEnemy) {
    drawHead(ctx, mainEnemy, assets.mainEnemy, mainEnemy.size * mainEnemyScale);
  }

  // Ladeglühen um den eingerollten Aal (Strom-Attacke, `electric.ts`) – vom
  // Einrollen bis kurz nach dem Blitz.
  const charge = electricChargeIntensity();
  if (charge > 0.001) {
    const { x, y } = mainEnemy.position;
    const radius = mainEnemy.size * (1.7 + 0.7 * charge);
    const glow = ctx.createRadialGradient(x, y, mainEnemy.size * 0.25, x, y, radius);
    glow.addColorStop(0, `rgba(205, 242, 255, ${0.4 * charge})`);
    glow.addColorStop(0.55, `rgba(130, 205, 255, ${0.22 * charge})`);
    glow.addColorStop(1, 'rgba(130, 205, 255, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
