import { SHIELD_DECAY_PER_SECOND } from '../../game/playerState';
import { defaultBonusStones } from '../defaultBonusStones';
import type { LevelConfig } from '../types';
import { updateLevel2Enemies } from './behavior';
import { renderLevel2Rain } from './rain';
import { renderLevel2Enemies } from './render';

/**
 * Level 2.
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
 * Schiessen: nur der Hauptgegner (Level 2 bewusst überschaubar). Alle ~2,6 s
 * eine Kugel (600 px/s) auf die Spielerposition – gut sichtbar und dodgebar,
 * kein Dauerbeschuss. Nutzer-Feedback: Schüsse müssen schneller sein als der
 * Spieler selbst (max. `EDGE_SPEED` 500 px/s aus `playerMovement.ts`), sonst
 * könnte man ihnen einfach davonfahren statt ausweichen zu müssen.
 */
export const level2: LevelConfig = {
  id: 'level2',
  name: 'Level 2',
  backgroundSrc: '/assets/levels/level2/background.png',
  foregroundSrc: '/assets/levels/level2/foreground.png',
  mainEnemy: {
    assetSrc: '/assets/levels/level2/gegner.svg',
    walkAssetSrc: '/assets/levels/level2/gegner-walk.svg',
    speed: 240,
    size: 120,
    shooting: {
      enabled: true,
      cooldownSeconds: 2.6,
      projectileSpeed: 600,
      projectileSize: 18,
      // Eigene weisse Variante (gleiche Form wie `kugel.svg`, siehe dort) –
      // Level 4 und der Kanonen-Bonusstein (`defaultBonusStones.ts`) nutzen
      // weiter die geteilte `kugel.svg`.
      projectileAssetSrc: '/assets/projectiles/kugel-weiss.svg',
    },
  },
  miniEnemies: {
    count: 3,
    config: {
      assetSrc: '/assets/levels/level2/gegner-mini.svg',
      walkAssetSrc: '/assets/levels/level2/gegner-mini-walk.svg',
      speed: 240,
      size: 22,
      // Mini-Gegner schiessen in Level 2 bewusst nicht.
    },
  },
  // Gegner-Darstellung (Sprite-Wahl, Augen-Glow, schrumpfender Hauptgegner)
  // liegt im Level-Package, siehe `render.ts` – der Game-Loop ruft sie pro
  // Frame über `level.renderEnemies(...)` auf.
  renderEnemies: renderLevel2Enemies,
  // Gegner-Logik (erratische Bewegung aller Gegner + Hauptgegner-Schuss)
  // ebenfalls im Level-Package, siehe `behavior.ts` – Gegenstück zu
  // `renderEnemies`, pro Frame über `level.updateEnemies(...)` aufgerufen.
  updateEnemies: updateLevel2Enemies,
  // Regen + gelegentlicher Blitz für den Film-Noir-Look (Instruktion 22),
  // rein dekorativ zwischen Foreground und Spiel-Ebene – siehe `rain.ts`.
  renderDecoration: renderLevel2Rain,
  // Kein eigenes `scoring` – Level 2 nutzt die Default-Werte aus scoring.ts
  // (siehe Fallback in `awardMiniEnemyDefeated`/`awardMainEnemyDefeated`).
  // Entspricht dem Default aus playerState.ts – Level 2 macht die
  // Konfigurierbarkeit (Nutzer-Feedback) explizit, statt sich stillschweigend
  // auf den globalen Fallback zu verlassen.
  shieldDecayPerSecond: SHIELD_DECAY_PER_SECOND,
  // Bonussteine (Instruktion 14) – Werte siehe `defaultBonusStones.ts`.
  bonusStones: defaultBonusStones,
  // Film-Noir-Redesign (Instruktion 22): löst den alten Arcade-Loop ab.
  musicSrc: '/assets/levels/level2/film_noire.mp3',
};
