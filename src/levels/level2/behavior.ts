import { tickEnemyShooting, type Projectile } from '../../game/projectile';
import type { LevelEnemyUpdateContext } from '../types';
import { spawnTorpedoLaunchBubbles } from './bubbles';
import { advanceSpitMinis, chainSegmentsInOrder, spitMiniFromMouth } from './mouthSpit';
import { advanceSnakeBody, snakeBodyFor } from './snakeBody';

/**
 * Gegner-Logik von Level 2: der Hauptgegner ist der Schlangenkopf, die (bis zu)
 * drei Mini-Gegner sind seine Körperglieder. `advanceSnakeBody` bewegt den Kopf
 * schlangenartig (`snakeMovement.ts`) und setzt die noch angedockten Mini-Gegner
 * auf den Kopf-Trail – sie laufen also nicht selbst, sondern folgen als Kette
 * (Reihenfolge: `chainSegmentsInOrder`). Wird ein Mini eingekesselt oder
 * abgeschossen (entfällt aus `miniEnemies`), wird die Kette einfach kürzer.
 *
 * Abdocken (`context.playerJustUndocked`): der Kopf spuckt dann das vorderste
 * noch angedockte Körperglied durch den Mund aus. Es fliegt auf die
 * Spielerposition zu, läuft danach kurz frei umher und kehrt schliesslich zum
 * Ende der Schlange zurück, wo es wieder andockt (siehe `mouthSpit.ts`).
 * Ausgespuckte Glieder werden nicht von `advanceSnakeBody`, sondern von
 * `advanceSpitMinis` bewegt.
 *
 * Schiessen: NUR der Kopf (`mainEnemy.shooting` aus der Level-Config, im
 * konfigurierten Takt ein gezielter Schuss auf die Spielerposition) – die
 * Körperglieder nicht. Reihenfolge wie in Level 1: erst bewegen, dann schiessen,
 * damit der Schuss von der neuen Kopf-Position ausgeht.
 *
 * Erfüllt `LevelEnemyUpdater`; Aufruf pro Frame aus `update()` in `main.ts`,
 * solange die Gegner nicht eingefroren sind.
 */
export function updateLevel2Enemies(context: LevelEnemyUpdateContext): Projectile[] {
  const {
    mainEnemy,
    miniEnemies,
    field,
    playerPosition,
    dt,
    mainEnemyShooting,
    activeLine,
    playerJustUndocked,
  } = context;

  // Abdocken: das vorderste (kopfnächste) noch angedockte Glied durch den Mund
  // ausspucken – ab jetzt ist es kein Ketten-Segment mehr.
  if (playerJustUndocked) {
    const frontSegment = chainSegmentsInOrder(miniEnemies)[0];
    if (frontSegment) spitMiniFromMouth(mainEnemy, frontSegment, playerPosition);
  }

  // Die noch angedockten Glieder folgen dem Kopf als Kette …
  const chain = chainSegmentsInOrder(miniEnemies);
  advanceSnakeBody(mainEnemy, snakeBodyFor(mainEnemy), chain, field, dt, undefined, activeLine);

  // … die ausgespuckten fliegen / laufen / kehren zum Ketten-Ende zurück.
  const dockPoint = chain.length > 0 ? chain[chain.length - 1].position : mainEnemy.position;
  advanceSpitMinis(miniEnemies, dockPoint, field, dt, undefined, activeLine);

  const shot = tickEnemyShooting(mainEnemy, mainEnemyShooting, playerPosition, dt);
  if (shot) {
    // Hinter dem gerade abgefeuerten Torpedo ein aufsteigendes Bläschen-
    // Wölkchen: Abschussort entgegen der Schussrichtung versetzt (weit genug
    // hinter die Kopf-Mitte, dass die Blasen nicht komplett unter dem
    // Kopf-Sprite hängen).
    const len = Math.hypot(shot.velocity.x, shot.velocity.y) || 1;
    spawnTorpedoLaunchBubbles(
      mainEnemy.position.x - (shot.velocity.x / len) * mainEnemy.size * 0.45,
      mainEnemy.position.y - (shot.velocity.y / len) * mainEnemy.size * 0.45,
    );
  }
  return shot ? [shot] : [];
}
