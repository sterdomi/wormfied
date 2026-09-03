import { type Enemy } from '../../game/enemy';
import { createRandomWalkState, moveEnemies, type RandomWalkState } from '../../game/enemyMovement';
import { tickEnemyShooting, type Projectile } from '../../game/projectile';
import type { LevelEnemyUpdateContext, ShootingConfig } from '../types';
import { peekDrumming, updateDrumming } from './drumming';
import { advanceShockwave, triggerShockwave } from './shockwave';

/**
 * Gegner-Logik von Level 4 (Dschungel):
 *  - der **trommelnde Gorilla** (`drumming.ts`) – fixer Platz unten mittig.
 *    Bei jedem Einzelschlag (`hit`-Flanke) `bongo_split`. Beim Doppelschlag
 *    (`shockwave`-Flanke, Muster 1/3/5/3 s) `boom` und Start einer
 *    **Schockwelle** (`shockwave.ts`); erreicht ihr Ring den Spieler und der ist
 *    nicht sicher am Rand angedockt, meldet `reportFieldZap` den Lebensverlust.
 *  - **6 Papageien** als Mini-Gegner – erratische Flug-Bewegung (`moveEnemies`,
 *    wie Level 1), begrenzt aufs Feld und die aktive Zeichenlinie. Sie schiessen
 *    kleine Kugeln auf den Spieler, aber **versetzt**: jeder Papagei bekommt
 *    beim ersten Frame eine zufällige Anfangsphase und einen zufälligen
 *    Cooldown-Faktor (`parrotShootSpecFor`), damit nie alle sechs im selben
 *    Frame feuern.
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

/** Je Papagei fixierter Cooldown-Faktor (Grund-Takt × Faktor). */
const shootFactors = new WeakMap<Enemy, number>();
/** Bereits mit zufälliger Anfangsphase versehen? (einmalig je Papagei) */
const shootSeeded = new WeakSet<Enemy>();

/**
 * Schuss-Spec für einen einzelnen Papagei: der Grund-`shooting` aus der Config,
 * aber mit einem je Papagei festen Cooldown-Faktor (0.7–1.5). Beim ersten
 * Aufruf wird ausserdem `timeSinceLastShot` zufällig vorbelegt, sodass die sechs
 * Papageien dauerhaft gegeneinander verschoben feuern.
 */
function parrotShootSpecFor(parrot: Enemy, base: ShootingConfig | undefined): ShootingConfig | undefined {
  if (!base?.enabled) return base;

  let factor = shootFactors.get(parrot);
  if (factor === undefined) {
    factor = 0.7 + Math.random() * 0.8;
    shootFactors.set(parrot, factor);
  }
  if (!shootSeeded.has(parrot)) {
    parrot.timeSinceLastShot = Math.random() * base.cooldownSeconds * factor;
    shootSeeded.add(parrot);
  }
  return { ...base, cooldownSeconds: base.cooldownSeconds * factor };
}

export function updateLevel4Enemies(context: LevelEnemyUpdateContext): Projectile[] {
  const {
    mainEnemy,
    miniEnemies,
    field,
    playerPosition,
    dt,
    activeLine,
    reportFieldZap,
    miniEnemyShooting,
  } = context;

  updateDrumming(mainEnemy, dt);
  const drum = peekDrumming(mainEnemy);
  if (drum?.hit) context.playLevelSound?.('bongo_split');
  if (drum?.shockwave) {
    context.playLevelSound?.('boom');
    triggerShockwave();
  }
  if (advanceShockwave(dt, playerPosition)) reportFieldZap?.();

  moveEnemies(miniEnemies, walkStateFor, field, dt, undefined, activeLine);

  const shots: Projectile[] = [];
  for (const parrot of miniEnemies) {
    const shot = tickEnemyShooting(
      parrot,
      parrotShootSpecFor(parrot, miniEnemyShooting),
      playerPosition,
      dt,
    );
    if (shot) shots.push(shot);
  }
  return shots;
}
