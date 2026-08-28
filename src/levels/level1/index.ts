import { defaultMainEnemyDefeatedPoints, defaultMiniEnemyDefeatedPoints } from '../../game/scoring';
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
    walkAssetSrc: '/assets/levels/level1/gegner-walk.svg',
    speed: 120,
    size: 80,
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
      walkAssetSrc: '/assets/levels/level1/gegner-mini-walk.svg',
      speed: 120,
      size: 22,
      // Mini-Gegner schiessen in Level 1 bewusst nicht.
    },
  },
  // Entspricht den Default-Werten aus scoring.ts – Level 1 braucht (noch)
  // keine eigene Abstufung, macht die Konfiguration aber explizit.
  scoring: {
    miniEnemyPoints: defaultMiniEnemyDefeatedPoints,
    mainEnemyPoints: defaultMainEnemyDefeatedPoints,
  },
  /**
   * Bonussteine (Instruktion 14). Spawn alle 8–12 s (10 s Mittelwert), max. 2
   * gleichzeitig, 10 s Lebensdauer – oft genug, um beim Spielen regelmässig
   * Gelegenheiten zu haben, aber nicht so oft, dass das Feld überladen wirkt.
   * Radius 16 (Durchmesser 32) liegt zwischen Mini- (22) und Hauptgegner (40)
   * – gut sichtbar, aber nicht dominant.
   *
   * Speed-Boost: 2× für 5 s – spürbar, aber kurz genug, um kein Dauerzustand
   * zu werden.
   *
   * Kanone: 6 s aktiv, alle 0.35 s ein Schuss (~3/s) – reicht, um während des
   * Zeichnens gezielt ein, zwei nahe Mini-Gegner auszuschalten, ohne den
   * Bildschirm mit Projektilen zu fluten. Etwas schneller (260 px/s) und
   * kleiner (14 px) als die Gegner-Kugel (200 px/s, 18 px), damit sich der
   * Spieler-Schuss "flinker" anfühlt; wiederverwendet `kugel.svg`.
   */
  bonusStones: {
    spawning: {
      spawnIntervalSeconds: 10,
      maxSimultaneous: 2,
      lifetimeSeconds: 10,
      radius: 16,
    },
    speedBoost: {
      assetSrc: '/assets/bonuses/bonus-speed.svg',
      speedMultiplier: 2,
      effectDurationSeconds: 5,
    },
    cannon: {
      assetSrc: '/assets/bonuses/bonus-cannon.svg',
      effectDurationSeconds: 6,
      fireIntervalSeconds: 0.35,
      projectileSpeed: 260,
      projectileSize: 14,
      projectileAssetSrc: '/assets/projectiles/kugel.svg',
    },
  },
};
