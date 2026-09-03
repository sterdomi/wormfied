import type { Projectile } from '../../game/projectile';
import type { LevelEnemyUpdateContext } from '../types';
import { updateDrumming } from './drumming';

/**
 * Gegner-Logik von Level 4 (Dschungel), erste Ausbaustufe: **nur der
 * trommelnde Gorilla** (`drumming.ts`) – er sitzt unten in der Feldmitte und
 * spielt ein Rhythmus-Muster. Noch keine Wirkung auf den Spieler, keine
 * Papageien (`miniEnemies.count` = 0), kein Schiessen.
 *
 * Erfüllt `LevelEnemyUpdater`; Aufruf pro Frame aus `update()` in `main.ts`.
 */
export function updateLevel4Enemies(context: LevelEnemyUpdateContext): Projectile[] {
  updateDrumming(context.mainEnemy, context.field, context.dt);
  return [];
}
