import type { Enemy } from '../../game/enemy';

/**
 * Level 3 hat ZWEI Gegner-Gruppen, die sich beide die eine `miniEnemies`-Liste
 * teilen (die Engine kennt nur Hauptgegner + eine Mini-Liste):
 *
 *  - die **Aal-Körpersegmente** (`EEL_BODY_COUNT`, gezeichnet mit `body.png` /
 *    `tail.png`, bewegt von `advanceSnakeBody` / `updateElectric`);
 *  - die frei laufenden **Plasma-Minis** (`ROAMER_COUNT`, `gegner_mini.png` /
 *    `gegner_mini_walk.png`, erratische Lauf-Bewegung wie in Level 1).
 *
 * `count` der Level-Config = `EEL_BODY_COUNT + ROAMER_COUNT`. Beim ersten Sehen
 * jedes Eintrags wird er anhand seiner Spawn-Position in der Liste einer Gruppe
 * zugeordnet (die ersten `EEL_BODY_COUNT` = Körper, der Rest = Minis) und die
 * Zuordnung in WeakSets festgehalten – ab dann stabil: eingekesselte oder
 * abgeschossene Gegner fallen einfach aus den Filtern, und Level 3 spawnt zur
 * Laufzeit keine neuen. `behavior.ts` und `render.ts` rufen beide
 * `classifyLevel3Minis` (idempotent) und arbeiten dann auf ihrer Teilliste.
 */

/** Aal-Körpersegmente (inkl. Schwanz = letztes Segment). */
export const EEL_BODY_COUNT = 9;
/** Frei laufende Plasma-Minis. */
export const ROAMER_COUNT = 5;

const eelBody = new WeakSet<Enemy>();
const roamer = new WeakSet<Enemy>();

/** Ist `enemy` (bereits zugeordnet als) ein Aal-Körpersegment? */
export function isEelBodySegment(enemy: Enemy): boolean {
  return eelBody.has(enemy);
}

/**
 * Teilt `minis` in `{ body, roamers }` – beim ersten Aufruf ordnet es noch
 * unbekannte Einträge nach ihrer Listenposition zu, danach filtert es nur noch
 * über die WeakSets. Reihenfolge bleibt die der `minis`-Liste (wichtig für die
 * Ketten-/Schwanz-Reihenfolge des Aals).
 */
export function classifyLevel3Minis(minis: readonly Enemy[]): {
  body: Enemy[];
  roamers: Enemy[];
} {
  minis.forEach((m, i) => {
    if (eelBody.has(m) || roamer.has(m)) return;
    (i < EEL_BODY_COUNT ? eelBody : roamer).add(m);
  });
  return {
    body: minis.filter((m) => eelBody.has(m)),
    roamers: minis.filter((m) => roamer.has(m)),
  };
}
