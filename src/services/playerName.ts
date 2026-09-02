import { t } from '../i18n';
import { PLAYER_NAME_MAX_LENGTH } from './leaderboard';

const STORAGE_KEY = 'wormfied:playerName';

/** Zufälliger Gastname, falls der Spieler noch nie einen eigenen gesetzt hat. */
function randomGuestName(): string {
  return `Gast${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Liest den gespeicherten Spielernamen aus `localStorage` (persistiert über
 * Partien/Level hinweg, siehe `app/main.ts`). Ist noch keiner gespeichert
 * (allererster Aufruf, Nutzer-Wunsch), fragt EINMALIG per `window.prompt()`
 * nach – vorausgefüllt mit einem zufälligen Gastnamen, den man überschreiben
 * kann. Egal ob überschrieben, unverändert übernommen oder der Dialog
 * abgebrochen wird: das Ergebnis landet in `localStorage`, daher erscheint
 * der Dialog danach nie wieder automatisch (nur noch manuell über den
 * 👤-Button, siehe `ui/hud.ts`).
 */
export function getPlayerName(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim()) return stored;
  } catch {
    // localStorage kann in manchen Kontexten (z.B. privates Surfen) fehlschlagen.
  }
  const generated = randomGuestName();
  const chosen = window.prompt(t('namePromptMessage'), generated);
  return setPlayerName(chosen ?? generated);
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
