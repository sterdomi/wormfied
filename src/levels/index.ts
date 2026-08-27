import { level1 } from './level1';
import type { LevelConfig } from './types';

/**
 * Alle Levels in Spielreihenfolge. Weiteres Level ergänzen: unter
 * `src/levels/levelN/` anlegen, hier importieren und ans Array anhängen.
 */
export const levels: LevelConfig[] = [level1];

export type { EnemyConfig, LevelConfig, ShootingConfig } from './types';
