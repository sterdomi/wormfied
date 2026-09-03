import type { LevelEnemyAssets, LevelEnemyRenderState } from '../types';
import { FIELD_W, GORILLA_BASE_Y, peekDrumming } from './drumming';
import { gorillaSprite } from './sprites';

/** Render-Höhe des Gorillas in Pixeln (Breite folgt dem Frame-Seitenverhältnis). */
const GORILLA_RENDER_HEIGHT = 300;
/** Feinjustierung nach unten (transparenter Rand unter der Figur im Sprite). */
const BASE_NUDGE = 0.03;

/**
 * Gegner-Ebene von Level 4: der trommelnde Gorilla, **fix unten in der
 * Bildschirmmitte** – seine Grundlinie liegt an der Feld-Unterkante
 * (`GORILLA_BASE_Y`), der Grossteil des Körpers sitzt im gesperrten unteren
 * 20 %, Kopf/Schultern ragen über die schwarze Linie ins Feld. Unabhängig von
 * `mainEnemy.position` (das ist nur der Logik-/Kollisionspunkt). `hideMainEnemy`
 * (Levelabschluss) lässt ihn weg.
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
  const x = FIELD_W / 2 - w / 2;
  const y = GORILLA_BASE_Y - h + h * BASE_NUDGE;
  ctx.drawImage(img, x, y, w, h);
}
