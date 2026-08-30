import type { Enemy } from '../../game/enemy';
import { createRandomWalkState, moveEnemies, type RandomWalkState } from '../../game/enemyMovement';
import { tickEnemyShooting, type Projectile } from '../../game/projectile';
import type { LevelEnemyUpdateContext } from '../types';

/**
 * Pausen-Zustand der erratischen Lauf-Bewegung, je Gegner – bewusst neben der
 * geteilten `Enemy`-Struktur gehalten (siehe `RandomWalkState`). `WeakMap`
 * spart jede Lebenszyklus-Verdrahtung: ein bei `rebuildField` frisch erzeugter
 * Gegner bekommt beim ersten Frame automatisch einen neuen Zustand, alte
 * Gegner werden mitsamt Eintrag vom GC eingesammelt.
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

/**
 * Gegner-Logik von Level 1:
 *  - Bewegung: erratische Achs-Bewegung ALLER Gegner (`moveEnemies` behandelt
 *    Haupt- und Mini-Gegner gleich), begrenzt aufs aktive Feld-Polygon. Der
 *    Pausen-Timer je Gegner liegt in `walkStates` (nicht auf `Enemy`).
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
  const {
    mainEnemy,
    miniEnemies,
    field,
    playerPosition,
    dt,
    mainEnemyShooting,
    miniEnemyShooting,
    activeLine,
  } = context;

  // `activeLine` (Nutzer-Feedback): die Gegner dürfen die gerade gezeichnete
  // Linie nicht überqueren – sie wirkt für die Bewegung wie eine Wand.
  moveEnemies([mainEnemy, ...miniEnemies], walkStateFor, field, dt, undefined, activeLine);

  const shots: Projectile[] = [];
  const mainShot = tickEnemyShooting(mainEnemy, mainEnemyShooting, playerPosition, dt);
  if (mainShot) shots.push(mainShot);
  for (const mini of miniEnemies) {
    const miniShot = tickEnemyShooting(mini, miniEnemyShooting, playerPosition, dt);
    if (miniShot) shots.push(miniShot);
  }
  return shots;
}
