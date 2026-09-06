import { SHIELD_DECAY_PER_SECOND } from '../../game/playerState';
import { defaultBonusStones } from '../defaultBonusStones';
import type { LevelConfig } from '../types';
import { updateLevel4Enemies } from './behavior';
import { renderLevel4Decoration } from './decoration';
import { renderLevel4Enemies } from './render';

/** Toleranz (px), innerhalb der ein Zeichen-Start noch als "von der Feld-
 *  Unterkante" gilt – der Spieler sitzt beim Losfahren exakt auf dem
 *  Perimeter, ein, zwei Pixel Luft gegen Rundungsstaub. */
const BOTTOM_EDGE_TOLERANCE_PX = 2;

/**
 * Level 4 – Dschungel.
 *
 * Erste Ausbaustufe (bewusst minimal): **nur der trommelnde Gorilla**. Ein
 * speziell gestalteter Silberrücken-Kriegstrommler sitzt unten in der
 * Feldmitte und spielt ein festes Rhythmus-Muster (`drumming.ts`); das Bongo
 * ist in jedem der sechs Frames mitgezeichnet (`sprites.ts` lädt sie
 * level-lokal). `render.ts` platziert ihn unten mittig.
 *
 * Der Spieler kann **nur nicht von der Feld-Unterkante ins Feld reinfahren**
 * (`blocksDrawingAt`) – dort, hinter der schwarzen Linie, sitzt der Gorilla.
 * Die früher zusätzlich gesperrten seitlichen unteren 20 % sind wieder frei
 * (Nutzer-Feedback): vom linken/rechten Rand darf auf jeder Höhe reingefahren
 * werden. Es gibt auch KEINE waagerechte Sperre hinter dem Gorilla; die
 * gezeichnete Linie darf durch den unteren Bereich. Eine schwarze Linie ganz
 * unten zeigt die gesperrte Kante (`renderLevel4Decoration`).
 *
 * 6 fliegende **Papageien** als Mini-Gegner (erratische Flug-Bewegung wie in
 * Level 2, `behavior.ts`; Zwei-Frame-Flügelschlag `papagei_up` ↔ `papagei_down`).
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
 * Bonussteine wie Level 2 (alle vier Typen).
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
  // Schwarze Linie an der Feld-Unterkante.
  renderDecoration: renderLevel4Decoration,
  // Nur von der Feld-Unterkante aus gesperrt (hinter dem Gorilla) – die Seiten
  // sind frei, vom linken/rechten Rand darf auf jeder Höhe reingefahren werden.
  blocksDrawingAt: (pos, _width, height) => pos.y >= height - BOTTOM_EDGE_TOLERANCE_PX,
  shieldDecayPerSecond: SHIELD_DECAY_PER_SECOND,
  bonusStones: defaultBonusStones,
  musicSrc: '/assets/levels/level4/jungle.mp3',
};
