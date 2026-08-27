import type { LevelConfig } from '../levels/types';

/** Lädt ein einzelnes Bild und löst auf, sobald es fertig geladen ist. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Handler VOR `src` setzen: ein (gecachtes) Bild kann sofort feuern.
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Bild konnte nicht geladen werden: ${src}`));
    img.src = src;
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
  /** Sprite der Mini-Gegner (ein Bild für alle). */
  miniEnemy: HTMLImageElement;
  /** Projektil-Sprite – nur vorhanden, wenn im Level ein Gegner schiesst. */
  projectile?: HTMLImageElement;
}

/**
 * Lädt alle Bilder eines Levels: Foreground, Background, Gegner-Sprites sowie
 * (falls ein Gegner schiesst) das Projektil-Sprite. SVGs laden wie PNGs über
 * `Image()`, keine Sonderbehandlung.
 */
export async function loadLevelImages(level: LevelConfig): Promise<LevelImages> {
  const projectileSrc =
    level.mainEnemy.shooting?.projectileAssetSrc ??
    level.miniEnemies.config.shooting?.projectileAssetSrc;

  const [foreground, background, mainEnemy, miniEnemy, projectile] = await loadImages([
    level.foregroundSrc,
    level.backgroundSrc,
    level.mainEnemy.assetSrc,
    level.miniEnemies.config.assetSrc,
    ...(projectileSrc ? [projectileSrc] : []),
  ]);

  return { foreground, background, mainEnemy, miniEnemy, projectile };
}
