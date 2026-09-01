import { defaultMainEnemyDefeatedPoints, defaultMiniEnemyDefeatedPoints } from '../../game/scoring';
import { SHIELD_DECAY_PER_SECOND } from '../../game/playerState';
import { defaultBonusStones } from '../defaultBonusStones';
import type { LevelConfig } from '../types';
import { updateLevel2Enemies } from './behavior';
import { spawnTorpedoBubbleBurst } from './bubbles';
import { renderLevel2Enemies } from './render';
import { renderLevel2Water } from './water';

/**
 * Level 2.
 *
 * Gegner: eine **Schlange** aus dem Level-2-Drachen (`gegner.png`) als Kopf und
 * den **drei Mini-Gegnern als Körperglieder** (`gegner.png` bei 75 % der
 * Kopf-Grösse, siehe `BODY_MINI_SCALE`). Der Kopf bewegt sich schlangenartig
 * (`snakeMovement.ts`), die drei Minis folgen ihm auf dem Trail als Kette
 * (`snakeBody.ts`) – Kopf + Minis erscheinen als EINE Schlange.
 *
 * Die Minis bleiben normale `miniEnemies`: Einkesselung / Kanonentreffer
 * entfernt ein Glied wie gewohnt, die Kette wird dann kürzer. Level-Abschluss
 * läuft wie in Level 1 über die eroberte Fläche, nicht über besiegte Minis.
 *
 * Loch (`hole.ts`): aus einem festen Loch kriecht alle paar Sekunden ein neues
 * Körperglied und schliesst ans Ketten-Ende auf – die Schlange wächst (bis zu
 * einem Deckel). Erobert der Spieler die Loch-Region (trennt sie mit einer
 * Linie ab), ist das Loch versiegelt und der Nachschub gestoppt.
 *
 * Abdocken: bei jedem Abdocken des Spielers spuckt der Kopf das vorderste noch
 * angedockte Körperglied durch den Mund aus (kurz mit `gegner_schuss.png` als
 * Schuss-Pose) – es fliegt auf die Spielerposition zu, läuft kurz frei umher
 * und kehrt dann zum Ende der Schlange zurück, wo es wieder andockt (siehe
 * `mouthSpit.ts`).
 *
 * Schiessen: nur der Kopf (`mainEnemy.shooting`, siehe `behavior.ts`), Sound
 * `torpedo.mp3`. Schlägt der Torpedo ein (Linie/Spieler getroffen), steigt am
 * Einschlagpunkt ein Blasen-Poof auf (`onEnemyProjectileImpact`).
 *
 * Eigenes Background-/Foreground-Artwork + Musik; Bonusstein-Werte von Level 1.
 * Der Foreground ist Wasser – `renderDecoration` legt den Unterwasser-Look
 * darüber: Tiefen-Grading, Godrays und aufsteigende Luftblasen (`water.ts` /
 * `bubbles.ts`).
 */
export const level2: LevelConfig = {
  id: 'level2',
  name: 'Level 2',
  backgroundSrc: '/assets/levels/level2/background.png',
  foregroundSrc: '/assets/levels/level2/foreground.png',
  mainEnemy: {
    assetSrc: '/assets/levels/level2/gegner.png',
    walkAssetSrc: '/assets/levels/level2/gegner_walk.png',
    // Kurz eingeblendet, während der Kopf ein Körperglied ausspuckt.
    shootAssetSrc: '/assets/levels/level2/gegner_schuss.png',
    // Etwas flotter als der Level-1-Hauptgegner (240); der weiche Kurvenlauf
    // hält die Schlange trotzdem gut lesbar.
    speed: 250,
    size: 130,
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
    count: 3,
    config: {
      // Dieselbe Grafik wie der Kopf – die Render-Grösse (0.75 × Kopf, siehe
      // `BODY_MINI_SCALE` in `snakeBody.ts`) macht daraus die Körperglieder.
      // `size` hier ist nur der logische Wert; die Kollisionslogik nutzt feste
      // Radien, und die Positionen setzt `advanceSnakeBody`.
      assetSrc: '/assets/levels/level2/gegner.png',
      walkAssetSrc: '/assets/levels/level2/gegner_walk.png',
      speed: 500,
      size: 98,
      // Körperglieder schiessen nicht.
    },
  },
  renderEnemies: renderLevel2Enemies,
  updateEnemies: updateLevel2Enemies,
  // Unterwasser-Look über dem Foreground: Tiefen-Grading, Godrays, Luftblasen.
  renderDecoration: renderLevel2Water,
  // Torpedo-Einschlag (Linie/Spieler getroffen): Blasen-Poof am Einschlagpunkt.
  onEnemyProjectileImpact: spawnTorpedoBubbleBurst,
  scoring: {
    miniEnemyPoints: defaultMiniEnemyDefeatedPoints,
    mainEnemyPoints: defaultMainEnemyDefeatedPoints,
  },
  shieldDecayPerSecond: SHIELD_DECAY_PER_SECOND,
  // Nutzer-Feedback: der Spieler startet Level 2 mit Cyborg + Kanone
  // ausgerüstet (Kanone dauerhaft aktiv → automatisch der Cyborg-Look).
  startsWithCannon: true,
  // Bonussteine (Instruktion 14) – 1:1 von Level 1 (`defaultBonusStones.ts`).
  bonusStones: defaultBonusStones,
  musicSrc: '/assets/levels/level2/level2.mp3',
};
