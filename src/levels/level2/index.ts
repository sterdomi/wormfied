import { defaultMainEnemyDefeatedPoints, defaultMiniEnemyDefeatedPoints } from '../../game/scoring';
import { SHIELD_DECAY_PER_SECOND } from '../../game/playerState';
import type { LevelConfig } from '../types';
import { updateLevel2Enemies } from './behavior';
import { renderLevel2Enemies } from './render';

/**
 * Level 2.
 *
 * Gegner: eine **Schlange** aus dem Level-2-Drachen (`gegner.svg`) als Kopf und
 * den **drei Mini-Gegnern als Körperglieder** (`gegner.svg` bei 75 % der
 * Kopf-Grösse, siehe `BODY_MINI_SCALE`). Der Kopf bewegt sich schlangenartig
 * (`snakeMovement.ts`), die drei Minis folgen ihm auf dem Trail als Kette
 * (`snakeBody.ts`) – Kopf + Minis erscheinen als EINE Schlange.
 *
 * Die Minis bleiben normale `miniEnemies`: Einkesselung / Kanonentreffer
 * entfernt ein Glied wie gewohnt, die Kette wird dann kürzer. Level-Abschluss
 * läuft wie in Level 1 über die eroberte Fläche, nicht über besiegte Minis.
 *
 * Schiessen: nur der Kopf (`mainEnemy.shooting`, siehe `behavior.ts`). Eigenes
 * Background-/Foreground-Artwork + Musik; Bonusstein-Werte von Level 1.
 */
export const level2: LevelConfig = {
  id: 'level2',
  name: 'Level 2',
  backgroundSrc: '/assets/levels/level2/background.png',
  foregroundSrc: '/assets/levels/level2/foreground.png',
  mainEnemy: {
    assetSrc: '/assets/levels/level2/gegner.svg',
    walkAssetSrc: '/assets/levels/level2/gegner-walk.svg',
    // Etwas flotter als der Level-1-Hauptgegner (240); der weiche Kurvenlauf
    // hält die Schlange trotzdem gut lesbar.
    speed: 250,
    size: 130,
    shooting: {
      enabled: true,
      cooldownSeconds: 2.6,
      projectileSpeed: 600,
      projectileSize: 18,
      projectileAssetSrc: '/assets/projectiles/kugel.svg',
    },
  },
  miniEnemies: {
    count: 3,
    config: {
      // Dieselbe Grafik wie der Kopf – die Render-Grösse (0.75 × Kopf, siehe
      // `BODY_MINI_SCALE` in `snakeBody.ts`) macht daraus die Körperglieder.
      // `size` hier ist nur der logische Wert; die Kollisionslogik nutzt feste
      // Radien, und die Positionen setzt `advanceSnakeBody`.
      assetSrc: '/assets/levels/level2/gegner.svg',
      walkAssetSrc: '/assets/levels/level2/gegner-walk.svg',
      speed: 250,
      size: 98,
      // Körperglieder schiessen nicht.
    },
  },
  renderEnemies: renderLevel2Enemies,
  updateEnemies: updateLevel2Enemies,
  scoring: {
    miniEnemyPoints: defaultMiniEnemyDefeatedPoints,
    mainEnemyPoints: defaultMainEnemyDefeatedPoints,
  },
  shieldDecayPerSecond: SHIELD_DECAY_PER_SECOND,
  // Nutzer-Feedback: der Spieler startet Level 2 mit Cyborg + Kanone
  // ausgerüstet (Kanone dauerhaft aktiv → automatisch der Cyborg-Look).
  startsWithCannon: true,
  // TODO(später): eigenes Level-2-Balancing – vorerst 1:1 von Level 1.
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
      fireIntervalSeconds: 0.35,
      projectileSpeed: 650,
      projectileSize: 14,
      projectileAssetSrc: '/assets/projectiles/kugel.svg',
    },
    freeze: {
      assetSrc: '/assets/bonuses/bonus-freeze.svg',
      effectDurationSeconds: 5,
    },
    bomb: {
      assetSrc: '/assets/bonuses/bonus-bomb.svg',
    },
  },
  musicSrc: '/assets/levels/level2/level2.mp3',
};
