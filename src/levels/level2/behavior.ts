import type { Projectile } from '../../game/projectile';
import type { LevelEnemyUpdateContext } from '../types';
import { advanceSnakeBody, snakeBodyFor } from './snakeBody';

/**
 * Gegner-Logik von Level 2: der Hauptgegner ist der Schlangenkopf, die (bis zu)
 * drei Mini-Gegner sind seine Körperglieder. `advanceSnakeBody` bewegt den Kopf
 * schlangenartig (`snakeMovement.ts`) und setzt die Mini-Gegner auf den
 * Kopf-Trail – sie laufen also nicht selbst, sondern folgen als Kette. Wird ein
 * Mini eingekesselt oder abgeschossen (entfällt aus `miniEnemies`), wird die
 * Kette einfach kürzer.
 *
 * Schiessen: in Level 2 niemand. Erfüllt `LevelEnemyUpdater`; Aufruf pro Frame
 * aus `update()` in `main.ts`, solange die Gegner nicht eingefroren sind.
 */
export function updateLevel2Enemies(context: LevelEnemyUpdateContext): Projectile[] {
  const { mainEnemy, miniEnemies, field, dt } = context;

  advanceSnakeBody(mainEnemy, snakeBodyFor(mainEnemy), miniEnemies, field, dt);

  return [];
}
