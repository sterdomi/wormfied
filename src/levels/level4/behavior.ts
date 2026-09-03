import { type Enemy } from '../../game/enemy';
import { createRandomWalkState, moveEnemies, type RandomWalkState } from '../../game/enemyMovement';
import type { Projectile } from '../../game/projectile';
import type { LevelEnemyUpdateContext } from '../types';
import { peekDrumming, updateDrumming } from './drumming';

/**
 * Gegner-Logik von Level 4 (Dschungel):
 *  - der **trommelnde Gorilla** (`drumming.ts`) – fixer Platz unten mittig,
 *    spielt ein Rhythmus-Muster; bei jedem Schlag (`hit`-Flanke) `bongo_split`.
 *  - **6 Papageien** als Mini-Gegner – erratische Flug-Bewegung (`moveEnemies`,
 *    wie Level 1), begrenzt aufs Feld und die aktive Zeichenlinie. Sie
 *    schiessen nicht.
 *
 * Erfüllt `LevelEnemyUpdater`; Aufruf pro Frame aus `update()` in `main.ts`.
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

export function updateLevel4Enemies(context: LevelEnemyUpdateContext): Projectile[] {
  const { mainEnemy, miniEnemies, field, dt, activeLine } = context;

  updateDrumming(mainEnemy, dt);
  if (peekDrumming(mainEnemy)?.hit) context.playLevelSound?.('bongo_split');

  moveEnemies(miniEnemies, walkStateFor, field, dt, undefined, activeLine);
  return [];
}
