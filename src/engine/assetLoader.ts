import { resolveAssetPath } from './assetPath';
import type { LevelConfig } from '../levels/types';

/** Lädt ein einzelnes Bild und löst auf, sobald es fertig geladen ist. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const resolvedSrc = resolveAssetPath(src);
    const img = new Image();
    // Handler VOR `src` setzen: ein (gecachtes) Bild kann sofort feuern.
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Bild konnte nicht geladen werden: ${resolvedSrc}`));
    img.src = resolvedSrc;
  });
}

/**
 * Lädt mehrere Bilder parallel und löst erst auf, wenn ALLE geladen sind.
 * Die Reihenfolge im Ergebnis entspricht der Reihenfolge von `sources`.
 */
export function loadImages(sources: readonly string[]): Promise<HTMLImageElement[]> {
  return Promise.all(sources.map(loadImage));
}

export interface LevelImages {
  foreground: HTMLImageElement;
  background: HTMLImageElement;
  /** Sprite des Hauptgegners. */
  mainEnemy: HTMLImageElement;
  /**
   * Zweite Bein-Pose des Hauptgegners für die Zwei-Bild-Lauf-Animation –
   * nur vorhanden, wenn das Level `mainEnemy.walkAssetSrc` setzt.
   */
  mainEnemyWalk?: HTMLImageElement;
  /**
   * „Schuss"-Pose des Hauptgegners – nur vorhanden, wenn das Level
   * `mainEnemy.shootAssetSrc` setzt.
   */
  mainEnemyShoot?: HTMLImageElement;
  /** Sprite der Mini-Gegner (ein Bild für alle). */
  miniEnemy: HTMLImageElement;
  /** Zweite Bein-Pose der Mini-Gegner, analog zu `mainEnemyWalk`. */
  miniEnemyWalk?: HTMLImageElement;
  /** Projektil-Sprite – nur vorhanden, wenn im Level ein Gegner schiesst. */
  projectile?: HTMLImageElement;
  /** Bonusstein-Sprites (Instruktion 14). */
  bonusSpeed: HTMLImageElement;
  bonusCannon: HTMLImageElement;
  bonusFreeze: HTMLImageElement;
  bonusBomb: HTMLImageElement;
  /** Sprite für Spieler-Projektile (Kanone-Bonus, Instruktion 14). */
  playerProjectile: HTMLImageElement;
}

/** Lädt `src`, falls vorhanden – sonst `undefined`, ohne einen Ladefehler auszulösen. */
function loadOptionalImage(src: string | undefined): Promise<HTMLImageElement | undefined> {
  return src ? loadImage(src) : Promise.resolve(undefined);
}

/**
 * Lädt alle Bilder eines Levels: Foreground, Background, Gegner-Sprites
 * (+ optionale zweite Bein-Pose für die Lauf-Animation), Bonusstein-Sprites +
 * Spieler-Projektil sowie (falls ein Gegner schiesst) das
 * Gegner-Projektil-Sprite. SVGs laden wie PNGs über `Image()`, keine
 * Sonderbehandlung.
 */
export async function loadLevelImages(level: LevelConfig): Promise<LevelImages> {
  const projectileSrc =
    level.mainEnemy.shooting?.projectileAssetSrc ??
    level.miniEnemies.config.shooting?.projectileAssetSrc;

  const [
    foreground,
    background,
    mainEnemy,
    mainEnemyWalk,
    miniEnemy,
    miniEnemyWalk,
    bonusSpeed,
    bonusCannon,
    bonusFreeze,
    bonusBomb,
    playerProjectile,
    projectile,
    mainEnemyShoot,
  ] = await Promise.all([
    loadImage(level.foregroundSrc),
    loadImage(level.backgroundSrc),
    loadImage(level.mainEnemy.assetSrc),
    loadOptionalImage(level.mainEnemy.walkAssetSrc),
    loadImage(level.miniEnemies.config.assetSrc),
    loadOptionalImage(level.miniEnemies.config.walkAssetSrc),
    loadImage(level.bonusStones.speedBoost.assetSrc),
    loadImage(level.bonusStones.cannon.assetSrc),
    loadImage(level.bonusStones.freeze.assetSrc),
    loadImage(level.bonusStones.bomb.assetSrc),
    loadImage(level.bonusStones.cannon.projectileAssetSrc),
    loadOptionalImage(projectileSrc),
    loadOptionalImage(level.mainEnemy.shootAssetSrc),
  ]);

  return {
    foreground,
    background,
    mainEnemy,
    mainEnemyWalk,
    mainEnemyShoot,
    miniEnemy,
    miniEnemyWalk,
    bonusSpeed,
    bonusCannon,
    bonusFreeze,
    bonusBomb,
    playerProjectile,
    projectile,
  };
}
