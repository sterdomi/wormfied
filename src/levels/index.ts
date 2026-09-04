import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import type { LevelConfig } from './types';

/**
 * Alle Levels in Spielreihenfolge. Weiteres Level ergänzen: unter
 * `src/levels/levelN/` anlegen, hier importieren und ans Array anhängen.
 *
 * Das archivierte Schlangen-Level lebt seit Instruktion 22 (Nutzer-Wunsch:
 * der Schlangen-Gegner hat sich nicht bewährt und wird neu gemacht)
 * unverändert auf dem Branch `archive/level2-schlange` weiter (nicht auf
 * `main` gemergt). Der gemeinsame Unterwasser-Look, den Level 3 davon
 * übernommen hatte, wurde vorher nach `src/levels/underwater/` ausgelagert,
 * damit Level 3 unabhängig vom Branch-Wechsel weiter funktioniert.
 *
 * Der bisherige Level 1 (Spinne/Film-Noir) heisst seither `level2`
 * (Ordner + `id` + Assets umbenannt, Instruktion 22 Folgeauftrag) – geplant
 * ist ein neues Bleistift-/Skizzenbuch-Level als Level 1 davor (noch nicht
 * gebaut), das dann den ersten Platz im Array übernimmt. Bis dahin spielt
 * `level2` als EINZIGES bestehendes Level absichtlich an erster Stelle;
 * `id: 'level2'` und Array-Position sind bewusst (noch) nicht deckungsgleich.
 */
export const levels: LevelConfig[] = [level2, level3, level4];

export type {
  EnemyConfig,
  LevelConfig,
  LevelEnemyAssets,
  LevelEnemyRenderer,
  LevelEnemyRenderState,
  LevelEnemyUpdateContext,
  LevelEnemyUpdater,
  ShootingConfig,
} from './types';
