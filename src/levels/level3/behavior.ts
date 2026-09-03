import { tickEnemyShooting, type Projectile } from '../../game/projectile';
import { advanceSnakeBody, snakeBodyFor } from '../../game/snakeBody';
import { spawnTorpedoBubbleBurst } from '../level2/bubbles';
import type { LevelEnemyUpdateContext } from '../types';
import { updateElectric } from './electric';

/**
 * Gegner-Logik von Level 3: ein **Aal** aus Kopf (`mainEnemy`) + N
 * Körpersegmenten (`miniEnemies`).
 *
 * Normalbetrieb (`swimming`): `advanceSnakeBody` bewegt den Kopf schlangenartig
 * (`snakeMovement.ts`) und zieht die Segmente als Kette auf dem Kopf-Trail nach
 * – wie die Level-2-Schlange, aber ohne Loch-Nachschub und ohne Maul-Spuck.
 * Nur der Kopf schiesst (Torpedo wie Level 2, mit Bläschen-Wölkchen beim
 * Abfeuern).
 *
 * Strom-Attacke (`electric.ts`): im Muster **1, 3, 5, 3 s** (wiederholend)
 * rollt sich der Aal zum Kreis zusammen (≈ 1 s Vorwarnung), setzt mit einem
 * Blitz das ganze Spielfeld unter Strom (`reportFieldZap` → der Game-Loop
 * kostet ein Leben, wenn der Spieler nicht sicher am Rand angedockt ist) und
 * rollt wieder aus. Während der Attacke bewegt `updateElectric` die Segmente
 * (Kreisform) und der Kopf schiesst nicht.
 *
 * Erfüllt `LevelEnemyUpdater`; Aufruf pro Frame aus `update()` in `main.ts`,
 * solange die Gegner nicht eingefroren sind.
 */
export function updateLevel3Enemies(context: LevelEnemyUpdateContext): Projectile[] {
  const {
    mainEnemy,
    miniEnemies,
    field,
    playerPosition,
    dt,
    mainEnemyShooting,
    activeLine,
    reportFieldZap,
  } = context;

  const { swimming, discharged } = updateElectric(
    mainEnemy,
    miniEnemies,
    field,
    dt,
    performance.now(),
  );

  if (discharged) reportFieldZap?.();

  if (!swimming) {
    // Eingerollt: `updateElectric` hat Kopf + Segmente bereits gesetzt,
    // keine Bewegung/Torpedos hier.
    return [];
  }

  advanceSnakeBody(mainEnemy, snakeBodyFor(mainEnemy), miniEnemies, field, dt, undefined, activeLine);

  const shot = tickEnemyShooting(mainEnemy, mainEnemyShooting, playerPosition, dt);
  if (shot) {
    const len = Math.hypot(shot.velocity.x, shot.velocity.y) || 1;
    spawnTorpedoBubbleBurst(
      mainEnemy.position.x - (shot.velocity.x / len) * mainEnemy.size * 0.45,
      mainEnemy.position.y - (shot.velocity.y / len) * mainEnemy.size * 0.45,
    );
  }
  return shot ? [shot] : [];
}
