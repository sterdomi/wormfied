import { SHIELD_DECAY_PER_SECOND } from '../../game/playerState';
import { defaultBonusStones } from '../defaultBonusStones';
import type { LevelConfig } from '../types';
import { updateLevel4Enemies } from './behavior';
import { renderLevel4Decoration } from './decoration';
import { BLOCKED_BOTTOM_FRACTION } from './drumming';
import { renderLevel4Enemies } from './render';

/**
 * Level 4 – Dschungel.
 *
 * Erste Ausbaustufe (bewusst minimal): **nur der trommelnde Gorilla**. Ein
 * speziell gestalteter Silberrücken-Kriegstrommler sitzt unten in der
 * Feldmitte und spielt ein festes Rhythmus-Muster (`drumming.ts`); das Bongo
 * ist in jedem der sechs Frames mitgezeichnet (`sprites.ts` lädt sie
 * level-lokal). `render.ts` platziert ihn unten mittig.
 *
 * Der Spieler kann **nicht von unten bzw. von den Seiten bis 20 % Höhe ins Feld
 * reinfahren** (`blocksDrawingAt`) – dort sitzt der Gorilla. Es gibt aber
 * KEINE waagerechte Sperre hinter ihm; die gezeichnete Linie darf durch den
 * unteren Bereich. Eine schwarze U-Linie zeigt die Grenze
 * (`renderLevel4Decoration`).
 *
 * Noch NICHT drin: Wirkung des Rhythmus (Spawns / Schockwellen o.ä.),
 * Papageien (`miniEnemies.count` = 0), echtes Dschungel-Background
 * (Platzhalter). Foreground: eigenes Dschungel-Laub (`foreground.png`).
 *
 * Bonussteine wie Level 1 (alle vier Typen).
 */
export const level4: LevelConfig = {
  id: 'level4',
  name: 'Level 4',
  backgroundSrc: '/assets/levels/level4/background.png',
  foregroundSrc: '/assets/levels/level4/foreground.png',
  mainEnemy: {
    // Nur Fallback / Kollisionsgrösse – gezeichnet wird der Gorilla aus `sprites.ts`.
    assetSrc: '/assets/levels/level4/gorilla_bereit.png',
    speed: 0, // steht still
    size: 130,
  },
  miniEnemies: {
    // Noch keine Papageien.
    count: 0,
    config: {
      assetSrc: '/assets/levels/level4/gorilla_bereit.png',
      speed: 200,
      size: 40,
    },
  },
  renderEnemies: renderLevel4Enemies,
  updateEnemies: updateLevel4Enemies,
  // Schwarze U-Linie unten + Seiten bis 20 %.
  renderDecoration: renderLevel4Decoration,
  // Kein Reinfahren aus dem gesperrten unteren Bereich (unten + Seiten bis 20 %).
  blocksDrawingAt: (pos, _width, height) => pos.y >= height * (1 - BLOCKED_BOTTOM_FRACTION),
  shieldDecayPerSecond: SHIELD_DECAY_PER_SECOND,
  bonusStones: defaultBonusStones,
  musicSrc: '/assets/levels/level4/jungle.mp3',
};
