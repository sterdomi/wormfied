import type { LevelConfig } from '../types';

/**
 * Level 1.
 *
 * Hauptgegner: Werte aus Instruktion 7 (`speed` = altes `ENEMY_SPEED` 90),
 * gerendert etwas grösser, da das SVG mehr Detail trägt.
 *
 * Mini-Gegner: **kleiner** (gut halb so gross) und **etwas schneller** als der
 * Hauptgegner – so wirken sie wie flinke, kleine Störer, während der
 * Hauptgegner behäbiger und "gewichtiger" bleibt. 3 Stück fühlen sich beim
 * Testen als spürbare, aber nicht überfordernde Zusatzgefahr an.
 *
 * Schiessen: nur der Hauptgegner (Level 1 bewusst überschaubar). Alle ~2,6 s
 * eine mässig schnelle Kugel (200 px/s) auf die Spielerposition – gut sichtbar
 * und dodgebar, kein Dauerbeschuss.
 */
export const level1: LevelConfig = {
  id: 'level1',
  name: 'Level 1',
  backgroundSrc: '/assets/levels/level1/background.png',
  foregroundSrc: '/assets/levels/level1/foreground.png',
  mainEnemy: {
    assetSrc: '/assets/levels/level1/gegner.svg',
    speed: 90,
    size: 40,
    shooting: {
      enabled: true,
      cooldownSeconds: 2.6,
      projectileSpeed: 200,
      projectileSize: 18,
      projectileAssetSrc: '/assets/projectiles/kugel.svg',
    },
  },
  miniEnemies: {
    count: 3,
    config: {
      assetSrc: '/assets/levels/level1/gegner-mini.svg',
      speed: 120,
      size: 22,
      // Mini-Gegner schiessen in Level 1 bewusst nicht.
    },
  },
};
