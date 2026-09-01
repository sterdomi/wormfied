import { SHIELD_DECAY_PER_SECOND } from '../../game/playerState';
import { defaultBonusStones } from '../defaultBonusStones';
import type { LevelConfig } from '../types';
import { updateLevel1Enemies } from './behavior';
import { renderLevel1Enemies } from './render';

/**
 * Level 1.
 *
 * Hauptgegner: Werte aus Instruktion 7 (`speed`, seither zweimal verdoppelt,
 * zuletzt auf Nutzer-Feedback "Gegner und Spieler doppelt so schnell"),
 * gerendert etwas grösser, da das SVG mehr Detail trägt.
 *
 * Mini-Gegner: **kleiner** (gut halb so gross) und **etwas schneller** als der
 * Hauptgegner – so wirken sie wie flinke, kleine Störer, während der
 * Hauptgegner behäbiger und "gewichtiger" bleibt. 3 Stück fühlen sich beim
 * Testen als spürbare, aber nicht überfordernde Zusatzgefahr an.
 *
 * Schiessen: nur der Hauptgegner (Level 1 bewusst überschaubar). Alle ~2,6 s
 * eine Kugel (600 px/s) auf die Spielerposition – gut sichtbar und dodgebar,
 * kein Dauerbeschuss. Nutzer-Feedback: Schüsse müssen schneller sein als der
 * Spieler selbst (max. `EDGE_SPEED` 500 px/s aus `playerMovement.ts`), sonst
 * könnte man ihnen einfach davonfahren statt ausweichen zu müssen.
 */
export const level1: LevelConfig = {
  id: 'level1',
  name: 'Level 1',
  backgroundSrc: '/assets/levels/level1/background.png',
  foregroundSrc: '/assets/levels/level1/foreground.png',
  mainEnemy: {
    assetSrc: '/assets/levels/level1/gegner.svg',
    walkAssetSrc: '/assets/levels/level1/gegner-walk.svg',
    speed: 240,
    size: 120,
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
      assetSrc: '/assets/levels/level1/gegner-mini.svg',
      walkAssetSrc: '/assets/levels/level1/gegner-mini-walk.svg',
      speed: 240,
      size: 22,
      // Mini-Gegner schiessen in Level 1 bewusst nicht.
    },
  },
  // Gegner-Darstellung (Sprite-Wahl, Augen-Glow, schrumpfender Hauptgegner)
  // liegt im Level-Package, siehe `render.ts` – der Game-Loop ruft sie pro
  // Frame über `level.renderEnemies(...)` auf.
  renderEnemies: renderLevel1Enemies,
  // Gegner-Logik (erratische Bewegung aller Gegner + Hauptgegner-Schuss)
  // ebenfalls im Level-Package, siehe `behavior.ts` – Gegenstück zu
  // `renderEnemies`, pro Frame über `level.updateEnemies(...)` aufgerufen.
  updateEnemies: updateLevel1Enemies,
  // Kein eigenes `scoring` – Level 1 nutzt die Default-Werte aus scoring.ts
  // (siehe Fallback in `awardMiniEnemyDefeated`/`awardMainEnemyDefeated`).
  // Entspricht dem Default aus playerState.ts – Level 1 macht die
  // Konfigurierbarkeit (Nutzer-Feedback) explizit, statt sich stillschweigend
  // auf den globalen Fallback zu verlassen.
  shieldDecayPerSecond: SHIELD_DECAY_PER_SECOND,
  // Bonussteine (Instruktion 14) – Werte siehe `defaultBonusStones.ts`.
  bonusStones: defaultBonusStones,
  musicSrc: '/assets/levels/level1/arcade-music-loop.wav',
};
