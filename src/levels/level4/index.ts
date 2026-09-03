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
 * 6 fliegende **Papageien** als Mini-Gegner (erratische Flug-Bewegung wie in
 * Level 1, `behavior.ts`; Zwei-Frame-Flügelschlag `papagei_up` ↔ `papagei_down`).
 * Sie **schiessen kleine Kugeln** auf den Spieler – im Grund-Takt der
 * `shooting`-Config, aber je Papagei zufällig verschoben (Anfangsphase +
 * Cooldown-Faktor in `behavior.ts`), damit nie alle sechs gleichzeitig feuern.
 *
 * Beim Doppelschlag des Gorillas (Muster 1/3/5/3 s) löst eine feldweite
 * **Schockwelle** aus (`shockwave.ts`), die im inneren Bereich ein Leben kostet.
 *
 * Noch NICHT drin: echtes Dschungel-Background (Platzhalter). Foreground:
 * eigenes Dschungel-Laub (`foreground.png`).
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
    // 6 fliegende Papageien – erratische Flug-Bewegung, Zwei-Frame-Flügelschlag
    // (`papagei_up` = Flügel oben, `papagei_down` = Flügel unten). Sie schiessen
    // kleine Kugeln; `behavior.ts` versetzt den Takt je Papagei zufällig, damit
    // nicht alle gleichzeitig feuern.
    count: 6,
    config: {
      assetSrc: '/assets/levels/level4/papagei_up.png',
      walkAssetSrc: '/assets/levels/level4/papagei_down.png',
      speed: 185,
      size: 46,
      shooting: {
        enabled: true,
        cooldownSeconds: 3.2,
        projectileSpeed: 300,
        projectileSize: 12,
        projectileAssetSrc: '/assets/projectiles/kugel.svg',
      },
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
