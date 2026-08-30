import { moveEnemies } from '../../game/enemyMovement';
import { tickEnemyShooting, type Projectile } from '../../game/projectile';
import type { LevelEnemyUpdateContext } from '../types';

/**
 * Gegner-Logik von Level 1:
 *  - Bewegung: erratische Achs-Bewegung ALLER Gegner (`moveEnemies` behandelt
 *    Haupt- und Mini-Gegner gleich), begrenzt aufs aktive Feld-Polygon.
 *  - Schiessen: nur der Hauptgegner – ein gezielter Schuss auf die
 *    Spielerposition im konfigurierten Takt (`mainEnemyShooting`). Die
 *    Mini-Gegner schiessen in Level 1 nicht (`miniEnemyShooting` ist
 *    `undefined`); die Schleife bleibt trotzdem generisch, damit ein späteres
 *    Level sie allein über die Config "scharf schalten" könnte.
 *
 * Reihenfolge (wie zuvor in `main.ts`): erst alle bewegen, dann Hauptgegner-
 * Schuss, dann Mini-Gegner-Schüsse.
 *
 * Erfüllt `LevelEnemyUpdater`; Aufruf pro Frame aus `update()` in `main.ts`
 * (`level.updateEnemies(...)`), solange die Gegner nicht eingefroren sind.
 */
export function updateLevel1Enemies(context: LevelEnemyUpdateContext): Projectile[] {
  const { mainEnemy, miniEnemies, field, playerPosition, dt, mainEnemyShooting, miniEnemyShooting } =
    context;

  moveEnemies([mainEnemy, ...miniEnemies], field, dt);

  const shots: Projectile[] = [];
  const mainShot = tickEnemyShooting(mainEnemy, mainEnemyShooting, playerPosition, dt);
  if (mainShot) shots.push(mainShot);
  for (const mini of miniEnemies) {
    const miniShot = tickEnemyShooting(mini, miniEnemyShooting, playerPosition, dt);
    if (miniShot) shots.push(miniShot);
  }
  return shots;
}
