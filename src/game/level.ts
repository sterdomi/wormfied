/**
 * Ein Level bringt die beiden Bild-Ebenen des Spielfelds mit:
 *  - `backgroundSrc`: liegt unter allem, wird sichtbar, sobald der Foreground
 *    an einer Stelle entfernt wurde
 *  - `foregroundSrc`: deckt das Spielfeld initial komplett ab
 *
 * Bewusst als offenes Objekt angelegt: spätere Level-Eigenschaften (Gegnertyp,
 * Zeitlimit, Startposition …) kommen hier einfach als weitere Felder dazu.
 */
export interface Level {
  foregroundSrc: string;
  backgroundSrc: string;
}

/** Platzhalter-Level. Assets liegen unter `public/assets/levels/level1/`. */
export const LEVEL_1: Level = {
  foregroundSrc: '/assets/levels/level1/foreground.png',
  backgroundSrc: '/assets/levels/level1/background.png',
};
