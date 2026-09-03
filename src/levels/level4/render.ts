import type { LevelEnemyAssets, LevelEnemyRenderState } from '../types';
import { COLLISION_ABOVE_BOTTOM, peekDrumming } from './drumming';
import { gorillaSprite } from './sprites';

/** Render-Höhe des Gorillas in Pixeln (Breite folgt dem Frame-Seitenverhältnis). */
const GORILLA_RENDER_HEIGHT = 300;
/** Feinjustierung nach unten (transparenter Rand unter der Figur im Sprite). */
const BASE_NUDGE = 0.03;

/**
 * Gegner-Ebene von Level 4: der trommelnde Gorilla, unten mittig platziert.
 * `drumming.ts` setzt Frame + Position im selben Frame vor `render`. Der
 * Sprite wird so gezeichnet, dass seine Unterkante an der Feld-Unterkante sitzt
 * und er waagerecht auf `mainEnemy.position.x` zentriert ist. `hideMainEnemy`
 * (Levelabschluss) lässt ihn weg. Papageien / Rhythmus-Wirkung: später.
 */
export function renderLevel4Enemies(
  ctx: CanvasRenderingContext2D,
  _assets: LevelEnemyAssets,
  state: LevelEnemyRenderState,
): void {
  const { mainEnemy, mainEnemyScale, hideMainEnemy } = state;
  if (hideMainEnemy) return;

  const frame = peekDrumming(mainEnemy)?.frame ?? 'bereit';
  const img = gorillaSprite(frame);
  if (!img.complete || img.naturalWidth === 0) return;

  const h = GORILLA_RENDER_HEIGHT * mainEnemyScale;
  const w = h * (img.naturalWidth / img.naturalHeight);
  const fieldBottom = mainEnemy.position.y + COLLISION_ABOVE_BOTTOM;
  const x = mainEnemy.position.x - w / 2;
  const y = fieldBottom - h + h * BASE_NUDGE;
  ctx.drawImage(img, x, y, w, h);
}
