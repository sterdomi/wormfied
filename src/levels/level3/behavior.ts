import { tickEnemyShooting, type Projectile } from '../../game/projectile';
import { advanceSnakeBody, snakeBodyFor } from '../../game/snakeBody';
import { spawnTorpedoBubbleBurst } from '../level2/bubbles';
import type { LevelEnemyUpdateContext } from '../types';

/**
 * Gegner-Logik von Level 3: ein **Aal** aus Kopf (`mainEnemy`) + N
 * Körpersegmenten (`miniEnemies`). `advanceSnakeBody` bewegt den Kopf
 * schlangenartig (`snakeMovement.ts`) und zieht die Segmente als Kette auf dem
 * Kopf-Trail nach – dieselbe Mechanik wie die Level-2-Schlange, aber OHNE
 * Loch-Nachschub und OHNE Maul-Spuck: die Segmente hängen dauerhaft am Kopf,
 * ihre Reihenfolge ist einfach die `miniEnemies`-Array-Reihenfolge. Wird ein
 * Segment eingekesselt oder abgeschossen, wird der Aal kürzer.
 *
 * Schiessen: NUR der Kopf (`mainEnemy.shooting` aus der Level-Config, Torpedo
 * wie in Level 2). Reihenfolge wie in Level 1/2: erst bewegen, dann schiessen,
 * damit der Schuss von der neuen Kopf-Position ausgeht. Beim Abfeuern steigt
 * hinter dem Torpedo ein Bläschen-Wölkchen auf (`spawnTorpedoBubbleBurst`, aus
 * dem Level-2-Wasser-Paket wiederverwendet).
 *
 * Erfüllt `LevelEnemyUpdater`; Aufruf pro Frame aus `update()` in `main.ts`,
 * solange die Gegner nicht eingefroren sind.
 */
export function updateLevel3Enemies(context: LevelEnemyUpdateContext): Projectile[] {
  const { mainEnemy, miniEnemies, field, playerPosition, dt, mainEnemyShooting, activeLine } =
    context;

  advanceSnakeBody(mainEnemy, snakeBodyFor(mainEnemy), miniEnemies, field, dt, undefined, activeLine);

  const shot = tickEnemyShooting(mainEnemy, mainEnemyShooting, playerPosition, dt);
  if (shot) {
    // Hinter dem gerade abgefeuerten Torpedo ein aufsteigendes Bläschen-
    // Wölkchen: Abschussort entgegen der Schussrichtung hinter die Kopf-Mitte
    // versetzt (wie in Level 2).
    const len = Math.hypot(shot.velocity.x, shot.velocity.y) || 1;
    spawnTorpedoBubbleBurst(
      mainEnemy.position.x - (shot.velocity.x / len) * mainEnemy.size * 0.45,
      mainEnemy.position.y - (shot.velocity.y / len) * mainEnemy.size * 0.45,
    );
  }
  return shot ? [shot] : [];
}
