import { PLAYER_NAME_MAX_LENGTH } from './leaderboard';

const STORAGE_KEY = 'wormfied:playerName';

/** Zufälliger Gastname, falls der Spieler noch nie einen eigenen gesetzt hat. */
function randomGuestName(): string {
  return `Gast${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Liest den gespeicherten Spielernamen aus `localStorage` (persistiert über
 * Partien/Level hinweg, siehe `app/main.ts`). Ist noch keiner gespeichert,
 * wird EINMALIG ein zufälliger Gastname erzeugt und persistiert – ohne Dialog.
 * Den Namen ändert man jederzeit im Score-Screen (Namensfeld mit Speichern)
 * oder über den 👤-Button im HUD, beide in `ui/hud.ts`.
 */
export function getPlayerName(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim()) return stored;
  } catch {
    // localStorage kann in manchen Kontexten (z.B. privates Surfen) fehlschlagen.
  }
  return setPlayerName(randomGuestName());
}

/** Speichert einen vom Spieler gewählten Namen (getrimmt, längenbegrenzt). */
export function setPlayerName(name: string): string {
  const trimmed = name.trim().slice(0, PLAYER_NAME_MAX_LENGTH) || randomGuestName();
  try {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    // s.o. – wenn Speichern fehlschlägt, gilt der Name nur für diese Partie.
  }
  return trimmed;
}
