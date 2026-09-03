import type { Enemy, Vec } from '../../game/enemy';
import type { Point } from '../../game/field';
import { BODY_MINI_SCALE } from '../../game/snakeBody';
import type { LevelEnemyAssets, LevelEnemyRenderState } from '../types';

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
 * Gegner-Ebene von Level 3: der Aal = Kopf (`head.png`) + N Körpersegmente
 * (`body.png`, = die `miniEnemies`) + Schwanz (`tail.png` fürs letzte Segment).
 * Positionen/Richtungen setzt `advanceSnakeBody` im selben Frame vor `render`
 * (`behavior.ts`) – hier wird nur gezeichnet.
 *
 * Anders als in Level 2 gibt es keine losen/ausgespuckten Glieder und kein
 * Loch: die Segmente hängen immer als eine Kette am Kopf (Array-Reihenfolge).
 * Das Schwanz-Sprite `tail.png` wird über `miniEnemies.config.walkAssetSrc`
 * geladen und kommt hier als `assets.miniEnemyWalk` an – Level 3 hat keine
 * Lauf-Animation, der „walk"-Slot trägt nur den Schwanz.
 *
 * Zeichenreihenfolge: von hinten (Schwanz) nach vorne, Kopf zuletzt → er
 * überdeckt das erste Segment. `hideMainEnemy` (Levelabschluss) blendet den
 * Kopf aus.
 *
 * Erfüllt `LevelEnemyRenderer`, Aufruf pro Frame aus `render()` in `main.ts`.
 */
export function renderLevel3Enemies(
  ctx: CanvasRenderingContext2D,
  assets: LevelEnemyAssets,
  state: LevelEnemyRenderState,
): void {
  const { mainEnemy, miniEnemies, mainEnemyScale, hideMainEnemy } = state;

  const bodySize = mainEnemy.size * BODY_MINI_SCALE;
  const bodySprite = assets.miniEnemy;
  const tailSprite = assets.miniEnemyWalk ?? assets.miniEnemy;

  // Von hinten nach vorne zeichnen; das letzte Segment ist der Schwanz.
  for (let i = miniEnemies.length - 1; i >= 0; i--) {
    const isTail = i === miniEnemies.length - 1;
    drawSegment(
      ctx,
      isTail ? tailSprite : bodySprite,
      miniEnemies[i].position,
      miniEnemies[i].direction,
      bodySize,
    );
  }

  if (!hideMainEnemy) {
    drawHead(ctx, mainEnemy, assets.mainEnemy, mainEnemy.size * mainEnemyScale);
  }
}
