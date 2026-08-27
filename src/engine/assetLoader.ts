import type { Level } from '../game/level';

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
}

/** Lädt Foreground- und Background-Bild eines Levels. */
export async function loadLevelImages(level: Level): Promise<LevelImages> {
  const [foreground, background] = await loadImages([level.foregroundSrc, level.backgroundSrc]);
  return { foreground, background };
}
