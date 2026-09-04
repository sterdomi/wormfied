import { level1 } from './level1';
import { level3 } from './level3';
import { level4 } from './level4';
import type { LevelConfig } from './types';

/**
 * Alle Levels in Spielreihenfolge. Weiteres Level ergänzen: unter
 * `src/levels/levelN/` anlegen, hier importieren und ans Array anhängen.
 *
 * Level 2 fehlt hier absichtlich (Instruktion 22, Nutzer-Wunsch): der
 * Schlangen-Gegner hat sich nicht bewährt und wird neu gemacht. Der
 * bisherige Stand lebt unverändert auf dem Branch `archive/level2-schlange`
 * weiter (nicht auf `main` gemergt). Level 3 rutscht dadurch auf den
 * zweiten Platz, Level 4 auf den dritten – beide sind index-basiert
 * (`levelIndex` in `app/main.ts`), keine Anpassung dort nötig. Der
 * gemeinsame Unterwasser-Look, den Level 3 von Level 2 übernommen hatte,
 * wurde vorher nach `src/levels/underwater/` ausgelagert, damit Level 3
 * unabhängig vom Branch-Wechsel weiter funktioniert.
 */
export const levels: LevelConfig[] = [level1, level3, level4];

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
