import type { Vec } from '../../game/enemy';
import type { Point } from '../../game/field';
import type { LevelEnemyAssets, LevelEnemyRenderState } from '../types';
import { peekHoleState, type HoleState } from './hole';
import { chainSegmentsInOrder, isSpitPoseActive } from './mouthSpit';
import { BODY_MINI_SCALE } from '../../game/snakeBody';

/**
 * Lokale „Vorne"-Richtung von `gegner.png` / `gegner_walk.png` als Winkel-Offset
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
 * Das Loch (`hole.ts`): flache dunkle Ellipse mit weichem Rand. Offen = tiefes
 * Schwarz + leicht pulsierender Licht-Ring; versiegelt = kleiner, grau, ohne
 * Ring. Gezeichnet vor Schlange/Gliedern (liegt auf dem Meeresgrund).
 */
function drawHole(ctx: CanvasRenderingContext2D, hole: HoleState, now: number): void {
  const rx = hole.sealed ? 24 : 42;
  ctx.save();
  ctx.translate(hole.position.x, hole.position.y);
  ctx.scale(1, 0.55); // perspektivisch flach

  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  if (hole.sealed) {
    g.addColorStop(0, 'rgba(64, 74, 84, 0.6)');
    g.addColorStop(1, 'rgba(64, 74, 84, 0)');
  } else {
    g.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    g.addColorStop(0.6, 'rgba(6, 18, 32, 0.55)');
    g.addColorStop(1, 'rgba(6, 18, 32, 0)');
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();

  if (!hole.sealed) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 600);
    ctx.strokeStyle = `rgba(120, 205, 255, ${0.12 + 0.16 * pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, rx * 0.86, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Gegner-Ebene von Level 2: die Schlange = Kopf (`gegner.png`) + bis zu drei
 * Körperglieder (die angedockten `miniEnemies`, bei `BODY_MINI_SCALE` der
 * Kopf-Grösse). Positionen/Richtungen setzt `advanceSnakeBody` im selben Frame
 * vor `render` – hier wird nur gezeichnet.
 *
 * Zeichenreihenfolge: das Loch (`hole.ts`, liegt auf dem Grund), dann lose
 * Glieder, dann Kette von hinten nach vorne, dann der Kopf zuletzt → er
 * überdeckt den Hals. `hideMainEnemy` (Levelabschluss) blendet den Kopf aus.
 *
 * Animation (Nutzer-Feedback: „verwachsene" Schlange soll nicht wackeln):
 * - **Kopf**: animiert (Lauf-Takt `useWalkFrame`, Wechsel `gegner` ↔
 *   `gegner_walk`) NUR solange keine Körperglieder angedockt sind. Hängt
 *   mindestens ein Glied an ihm, steht er still und zeigt `gegner_walk`
 *   (wie die statischen Körperglieder). Ausnahme: kurz nach einem Maul-Spuck
 *   (`isSpitPoseActive`) die „Schuss"-Pose `assets.mainEnemyShoot`.
 * - **Angedockte Glieder**: alle bis auf das LETZTE statisch mit `gegner_walk`
 *   (nicht animiert). Nur das letzte Glied (Schwanz) animiert weiter.
 * - **Lose Glieder** (ausgespuckt / frei / zurückkehrend, siehe `mouthSpit.ts`):
 *   animieren wie gehabt.
 *
 * Erfüllt `LevelEnemyRenderer`, Aufruf pro Frame aus `render()` in `main.ts`.
 */
export function renderLevel2Enemies(
  ctx: CanvasRenderingContext2D,
  assets: LevelEnemyAssets,
  state: LevelEnemyRenderState,
): void {
  const { mainEnemy, miniEnemies, mainEnemyScale, hideMainEnemy, useWalkFrame, now } = state;

  // Das Loch zuerst – es liegt auf dem Grund, unter Schlange und Gliedern.
  const hole = peekHoleState(mainEnemy);
  if (hole) drawHole(ctx, hole, now);

  const bodySize = mainEnemy.size * BODY_MINI_SCALE;

  // Angedockte Glieder ("verwachsen") in Kettenreihenfolge, Rest = lose Gegner.
  const chain = chainSegmentsInOrder(miniEnemies);
  const chainSet = new Set(chain);
  const loose = miniEnemies.filter((m) => !chainSet.has(m));
  const grownTogether = chain.length > 0;

  const animatedBody =
    useWalkFrame && assets.miniEnemyWalk ? assets.miniEnemyWalk : assets.miniEnemy;
  // „verwende gegner_walk" – statisch, ohne Lauf-Takt (Glieder UND „verwachsener" Kopf).
  const staticBody = assets.miniEnemyWalk ?? assets.miniEnemy;
  const staticHead = assets.mainEnemyWalk ?? assets.mainEnemy;

  // Kopf: Schuss-Pose > (mit Kette) statisch `gegner_walk` > (ohne Kette) Lauf-Animation.
  const headSprite =
    isSpitPoseActive(now) && assets.mainEnemyShoot
      ? assets.mainEnemyShoot
      : grownTogether
        ? staticHead
        : useWalkFrame && assets.mainEnemyWalk
          ? assets.mainEnemyWalk
          : assets.mainEnemy;

  // Lose Gegner zuerst (Reihenfolge unkritisch), animiert.
  for (const m of loose) {
    drawGegner(ctx, animatedBody, m.position, m.direction, bodySize);
  }

  // Kette von hinten (Schwanz) nach vorne: nur der Schwanz animiert, der Rest
  // statisch mit `gegner_walk`.
  for (let i = chain.length - 1; i >= 0; i--) {
    const isTail = i === chain.length - 1;
    drawGegner(ctx, isTail ? animatedBody : staticBody, chain[i].position, chain[i].direction, bodySize);
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
