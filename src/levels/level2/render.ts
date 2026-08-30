import type { Vec } from '../../game/enemy';
import type { Point } from '../../game/field';
import type { LevelEnemyAssets, LevelEnemyRenderState } from '../types';
import { BODY_MINI_SCALE } from './snakeBody';

/**
 * Lokale „Vorne"-Richtung von `gegner.svg` / `gegner-walk.svg` als Winkel-Offset
 * auf `atan2(dir.y, dir.x)`. Die Grafik zeigt im Sprite nach LINKS (−x), also
 * `+Math.PI`, damit der Drache in die Laufrichtung schaut (Nutzer-Feedback:
 * „verkehrt herum zusammengesetzt"). Für eine andere Zeichenrichtung: `0`
 * (nach rechts), `-Math.PI / 2` (nach oben) bzw. `Math.PI / 2` (nach unten).
 */
const GEGNER_FORWARD_OFFSET = Math.PI;

function drawGegner(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  position: Point,
  direction: Vec,
  size: number,
): void {
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(Math.atan2(direction.y, direction.x) + GEGNER_FORWARD_OFFSET);
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  ctx.restore();
}

/**
 * Gegner-Ebene von Level 2: die Schlange = Kopf (`gegner.svg`) + bis zu drei
 * Körperglieder (die `miniEnemies`, gerendert mit demselben Sprite bei
 * `BODY_MINI_SCALE` der Kopf-Grösse). Positionen/Richtungen setzt
 * `advanceSnakeBody` im selben Frame vor `render` – hier wird nur gezeichnet.
 *
 * - Von hinten nach vorne (letztes Glied zuerst, Kopf zuletzt) → der Kopf
 *   überdeckt den Hals.
 * - `hideMainEnemy` (Levelabschluss) blendet den Kopf aus; die Körperglieder
 *   sind zu dem Zeitpunkt ohnehin schon aus `miniEnemies` entfernt (mit
 *   Explosionen, siehe `main.ts`).
 * - Maul-/Lauf-Animation über den gemeinsamen `useWalkFrame`-Takt, wie bei den
 *   Level-1-Gegnern.
 *
 * Erfüllt `LevelEnemyRenderer`, Aufruf pro Frame aus `render()` in `main.ts`.
 */
export function renderLevel2Enemies(
  ctx: CanvasRenderingContext2D,
  assets: LevelEnemyAssets,
  state: LevelEnemyRenderState,
): void {
  const { mainEnemy, miniEnemies, mainEnemyScale, hideMainEnemy, useWalkFrame } = state;

  const headSprite = useWalkFrame && assets.mainEnemyWalk ? assets.mainEnemyWalk : assets.mainEnemy;
  const bodySprite = useWalkFrame && assets.miniEnemyWalk ? assets.miniEnemyWalk : assets.miniEnemy;
  const bodySize = mainEnemy.size * BODY_MINI_SCALE;

  for (let i = miniEnemies.length - 1; i >= 0; i--) {
    drawGegner(ctx, bodySprite, miniEnemies[i].position, miniEnemies[i].direction, bodySize);
  }

  if (!hideMainEnemy) {
    drawGegner(
      ctx,
      headSprite,
      mainEnemy.position,
      mainEnemy.direction,
      mainEnemy.size * mainEnemyScale,
    );
  }
}
