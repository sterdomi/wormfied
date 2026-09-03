import { SHIELD_DECAY_PER_SECOND } from '../../game/playerState';
import { defaultBonusStones } from '../defaultBonusStones';
import { spawnTorpedoBubbleBurst } from '../level2/bubbles';
import { renderLevel2Water } from '../level2/water';
import type { LevelConfig } from '../types';
import { updateLevel3Enemies } from './behavior';
import { renderLevel3Enemies } from './render';

/**
 * Level 3.
 *
 * Wie Level 2 ein Unterwasser-Level – gleicher dekorativer Wasser-Überzug
 * (Tiefen-Grading, Godrays, aufsteigende Luftblasen, `renderLevel2Water`) und
 * dieselbe Torpedo-Optik. Unterschiede zu Level 2:
 *
 *  - Der Gegner ist ein **Aal** statt der Drachen-Schlange: Kopf = `head.png`,
 *    Körper = `body.png` (N-mal als `miniEnemies` – je mehr Segmente, desto
 *    länger der Aal), Schwanz = `tail.png` fürs letzte Segment. Bewegung über
 *    `advanceSnakeBody` / `snakeMovement` (level-agnostisch in `game/`, wie für
 *    Level 2 gebaut). Das Schwanz-Sprite reist im `walkAssetSrc`-Slot der
 *    Mini-Gegner mit (Level 3 hat keine Lauf-Animation – siehe `render.ts`).
 *  - **Kein Loch** (`level2/hole.ts`) und **kein Maul-Spuck**
 *    (`level2/mouthSpit.ts`): keine losen Mini-Gegner, die Segmente hängen
 *    dauerhaft als Kette am Kopf.
 *
 * Schiessen: nur der Kopf, Torpedo (`torpedo.png` / `torpedo.mp3`) wie in
 * Level 2, inkl. Bläschen-Poof beim Einschlag (`onEnemyProjectileImpact`).
 *
 * Wie Level 2 startet der Spieler mit Kanone (→ Cyborg-Look); Bonusstein-Werte
 * von Level 1. Eigenes Background-/Foreground-Artwork; noch keine eigene Musik.
 */
export const level3: LevelConfig = {
  id: 'level3',
  name: 'Level 3',
  backgroundSrc: '/assets/levels/level3/background.png',
  foregroundSrc: '/assets/levels/level3/foreground.png',
  mainEnemy: {
    assetSrc: '/assets/levels/level3/head.png',
    speed: 250,
    // Deutlich kleiner als der Level-2-Kopf (130) – Nutzer-Feedback „der Aal
    // ist zu gross"; der Segment-Abstand (`snakeBody.ts`) skaliert mit, der
    // Aal wird dadurch auch kürzer/schlanker.
    size: 80,
    shooting: {
      enabled: true,
      cooldownSeconds: 2.6,
      projectileSpeed: 600,
      projectileSize: 90,
      projectileAssetSrc: '/assets/projectiles/torpedo.png',
      soundSrc: '/assets/sound/torpedo.mp3',
    },
  },
  miniEnemies: {
    // Körpersegmente des Aals – das letzte wird als Schwanz (`tail.png`)
    // gezeichnet. Mehr Segmente = längerer Aal.
    count: 9,
    config: {
      assetSrc: '/assets/levels/level3/body.png',
      // Kein Lauf-Sprite – der „walk"-Slot trägt das Schwanz-Sprite fürs
      // letzte Segment (siehe `render.ts`).
      walkAssetSrc: '/assets/levels/level3/tail.png',
      speed: 500,
      // Nur für die Rand-Abstandsberechnung relevant (Rendergrösse = Kopf ×
      // `BODY_MINI_SCALE`); proportional zum kleineren Kopf mitgezogen.
      size: 60,
      // Körpersegmente schiessen nicht.
    },
  },
  renderEnemies: renderLevel3Enemies,
  updateEnemies: updateLevel3Enemies,
  // Unterwasser-Look wie Level 2 (aus dem Level-2-Paket wiederverwendet).
  renderDecoration: renderLevel2Water,
  // Torpedo-Einschlag (Linie/Spieler getroffen): Blasen-Poof am Einschlagpunkt.
  onEnemyProjectileImpact: spawnTorpedoBubbleBurst,
  shieldDecayPerSecond: SHIELD_DECAY_PER_SECOND,
  // Wie Level 2: Spieler startet mit Kanone (→ Cyborg-Look).
  startsWithCannon: true,
  bonusStones: defaultBonusStones,
};
