import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import type { LevelConfig } from './types';

/**
 * Alle Levels in Spielreihenfolge. Weiteres Level ergänzen: unter
 * `src/levels/levelN/` anlegen, hier importieren und ans Array anhängen.
 */
export const levels: LevelConfig[] = [level1, level2, level3, level4];

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
