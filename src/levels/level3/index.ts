import { SHIELD_DECAY_PER_SECOND } from '../../game/playerState';
import { defaultBonusStones } from '../defaultBonusStones';
import { spawnTorpedoBubbleBurst } from '../level2/bubbles';
import type { LevelConfig } from '../types';
import { updateLevel3Enemies } from './behavior';
import { renderLevel3Decoration } from './decoration';
import { electricForegroundBlackout } from './electric';
import { EEL_BODY_COUNT, ROAMER_COUNT } from './enemySet';
import { renderLevel3Enemies } from './render';

/**
 * Level 3.
 *
 * Wie Level 2 ein Unterwasser-Level – gleicher dekorativer Wasser-Überzug
 * (Tiefen-Grading, Godrays, aufsteigende Luftblasen) und dieselbe Torpedo-
 * Optik. Unterschiede zu Level 2:
 *
 *  - Der Hauptgegner ist ein **Aal**: Kopf = `head.png`, Körper = `body.png`
 *    (`EEL_BODY_COUNT` Segmente), Schwanz = `tail.png` fürs letzte Segment.
 *    Bewegung über `advanceSnakeBody` / `snakeMovement` (level-agnostisch in
 *    `game/`). Der Aal-Kopf hat keine Lauf-/Schuss-Animation, daher tragen die
 *    `mainEnemy`-Slots `walkAssetSrc` = `body.png` und `shootAssetSrc` =
 *    `tail.png` (siehe `render.ts`).
 *  - Zusätzlich `ROAMER_COUNT` frei laufende **Plasma-Minis**
 *    (`gegner_mini.png` ↔ `gegner_mini_walk.png`), erratische Bewegung wie in
 *    Level 1. Aal-Körper + Minis teilen sich die eine `miniEnemies`-Liste;
 *    `enemySet.ts` teilt sie auf (`count` = `EEL_BODY_COUNT + ROAMER_COUNT`).
 *  - **Kein Loch** (`level2/hole.ts`) und **kein Maul-Spuck**
 *    (`level2/mouthSpit.ts`): die Aal-Segmente hängen dauerhaft am Kopf.
 *  - **Strom-Attacke** (`electric.ts` / `decoration.ts`): im Muster 1, 3, 5,
 *    3 s (wiederholend) rollt sich der Aal zum Kreis zusammen (≈ 1 s
 *    Vorwarnung), setzt mit einem Blitz das ganze Spielfeld unter Strom
 *    (`reportFieldZap` → ein Leben, wenn der Spieler nicht am Rand angedockt
 *    ist; `foregroundBlackout` färbt dabei den Foreground schwarz) und rollt
 *    wieder aus. Die Plasma-Minis laufen währenddessen weiter.
 *
 * Schiessen: nur der Aal-Kopf, Torpedo (`torpedo.png` / `torpedo.mp3`) wie in
 * Level 2, inkl. Bläschen-Poof beim Einschlag (`onEnemyProjectileImpact`).
 *
 * Bonussteine: alle vier Typen wie Level 1 (`defaultBonusStones`). Eigenes
 * Background-/Foreground-Artwork und eigene Musik (`level3.mp3`); der
 * Blitz-Sound (`highvoltage.mp3`) liegt in `SOUND_SOURCES` / `main.ts`.
 */
export const level3: LevelConfig = {
  id: 'level3',
  name: 'Level 3',
  backgroundSrc: '/assets/levels/level3/background.png',
  foregroundSrc: '/assets/levels/level3/foreground.png',
  mainEnemy: {
    assetSrc: '/assets/levels/level3/head.png',
    // Aal-Kopf hat keine eigene Lauf-/Schuss-Animation – die freien Slots
    // tragen die Aal-Körper- bzw. -Schwanz-Grafik (siehe `render.ts`).
    walkAssetSrc: '/assets/levels/level3/body.png',
    shootAssetSrc: '/assets/levels/level3/tail.png',
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
    // Aal-Körpersegmente + frei laufende Plasma-Minis in einer Liste; die
    // Aufteilung macht `enemySet.ts` (erste EEL_BODY_COUNT = Aal, Rest = Minis).
    count: EEL_BODY_COUNT + ROAMER_COUNT,
    config: {
      // Grafik der frei laufenden Plasma-Minis (kreisrund, Zwei-Bild-Animation).
      // Die Aal-Körper-/Schwanz-Grafik reist an den `mainEnemy`-Slots mit.
      assetSrc: '/assets/levels/level3/gegner_mini.png',
      walkAssetSrc: '/assets/levels/level3/gegner_mini_walk.png',
      speed: 250,
      // Für die Rand-Abstandsberechnung der Plasma-Minis (Aal-Segmente setzt
      // `advanceSnakeBody`, deren `size` ist dort unkritisch).
      size: 54,
      // Weder Aal-Segmente noch Plasma-Minis schiessen.
    },
  },
  renderEnemies: renderLevel3Enemies,
  updateEnemies: updateLevel3Enemies,
  // Unterwasser-Look (aus dem Level-2-Paket) + Feld-Blitz der Strom-Attacke.
  renderDecoration: renderLevel3Decoration,
  // Foreground wird schwarz, während der eingerollte Aal das Feld unter Strom
  // setzt (Einrollen → Blitz → Ausrollen).
  foregroundBlackout: electricForegroundBlackout,
  // Torpedo-Einschlag (Linie/Spieler getroffen): Blasen-Poof am Einschlagpunkt.
  onEnemyProjectileImpact: spawnTorpedoBubbleBurst,
  shieldDecayPerSecond: SHIELD_DECAY_PER_SECOND,
  // Alle vier Bonustypen wie Level 1.
  bonusStones: defaultBonusStones,
  musicSrc: '/assets/levels/level3/level3.mp3',
};
