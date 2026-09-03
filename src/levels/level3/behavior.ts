import { type Enemy } from '../../game/enemy';
import { createRandomWalkState, moveEnemies, type RandomWalkState } from '../../game/enemyMovement';
import { tickEnemyShooting, type Projectile } from '../../game/projectile';
import { advanceSnakeBody, snakeBodyFor } from '../../game/snakeBody';
import { spawnTorpedoBubbleBurst } from '../level2/bubbles';
import type { LevelEnemyUpdateContext } from '../types';
import { updateElectric } from './electric';
import { classifyLevel3Minis } from './enemySet';

/**
 * Gegner-Logik von Level 3.
 *
 * Zwei Gruppen in der einen `miniEnemies`-Liste (siehe `enemySet.ts`):
 *
 *  - **Aal**: Kopf (`mainEnemy`) + `EEL_BODY_COUNT` Körpersegmente. Normal-
 *    betrieb (`swimming`): `advanceSnakeBody` bewegt den Kopf schlangenartig
 *    und zieht die Segmente als Kette nach; nur der Kopf schiesst (Torpedo wie
 *    Level 2). Strom-Attacke (`electric.ts`): im Muster 1, 3, 5, 3 s rollt sich
 *    der Aal zum Kreis zusammen (~1 s Vorwarnung), setzt mit einem Blitz das
 *    Feld unter Strom (`reportFieldZap` → ein Leben, wenn der Spieler nicht am
 *    Rand angedockt ist; `foregroundBlackout` färbt den Foreground schwarz) und
 *    rollt wieder aus.
 *  - **Plasma-Minis**: `ROAMER_COUNT` frei laufende Gegner mit erratischer
 *    Achs-Bewegung (`moveEnemies`, wie Level 1), begrenzt aufs Feld und die
 *    aktive Zeichenlinie. Sie laufen auch während der Strom-Attacke weiter.
 *
 * Erfüllt `LevelEnemyUpdater`; Aufruf pro Frame aus `update()` in `main.ts`,
 * solange die Gegner nicht eingefroren sind.
 */

const walkStates = new WeakMap<Enemy, RandomWalkState>();
function walkStateFor(enemy: Enemy): RandomWalkState {
  let state = walkStates.get(enemy);
  if (!state) {
    state = createRandomWalkState();
    walkStates.set(enemy, state);
  }
  return state;
}

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

  const { body, roamers } = classifyLevel3Minis(miniEnemies);

  const { swimming, discharged } = updateElectric(
    mainEnemy,
    body,
    field,
    dt,
    performance.now(),
  );
  if (discharged) reportFieldZap?.();

  // Plasma-Minis laufen immer – auch während der Aal eingerollt ist.
  moveEnemies(roamers, walkStateFor, field, dt, undefined, activeLine);

  if (!swimming) {
    // Eingerollt: `updateElectric` hat Kopf + Körpersegmente bereits gesetzt,
    // keine Aal-Bewegung / keine Torpedos hier.
    return [];
  }

  advanceSnakeBody(mainEnemy, snakeBodyFor(mainEnemy), body, field, dt, undefined, activeLine);

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
