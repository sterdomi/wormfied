import { t, type TranslationKey } from '../i18n';
import { formatClaimedPercentage } from '../game/scoring';

export interface Hud {
  /** Prozentanzeige der eroberten Fläche (Wert 0–100). */
  setClaimedPercentage: (percent: number) => void;
  /** Aktueller Score (einfache Zahl, keine führenden Nullen). */
  setScore: (score: number) => void;
  /** Verbleibende Leben. */
  setLives: (lives: number) => void;
  /** Schild-Wert 0–100. */
  setShield: (shield: number) => void;
  /** Kurzes Aufblitzen der Leben-Anzeige (Feedback bei Extra-Leben). */
  flashLives: () => void;
  /** Game-Over-Overlay ein-/ausblenden. */
  setGameOver: (visible: boolean) => void;
  /** Level-Complete-Overlay ein-/ausblenden (mit erreichtem Prozent + Score). */
  setLevelComplete: (visible: boolean, percent?: number, score?: number) => void;
  dispose: () => void;
}

function formatScore(score: number): string {
  return `SCORE ${Math.round(score)}`;
}

function formatLives(lives: number): string {
  const n = Math.max(0, Math.round(lives));
  return `LEBEN ${n > 0 ? '♦'.repeat(n) : '–'}`;
}

function formatShield(shield: number): string {
  const value = Math.max(0, Math.min(100, shield));
  const filled = Math.round(value / 10);
  return `SCHILD ${'▓'.repeat(filled)}${'░'.repeat(10 - filled)} ${Math.round(value)
    .toString()
    .padStart(3, ' ')}`;
}

/** Befüllt ein Overlay-Element (`#gameover` / `#levelcomplete`) mit Titel,
 *  optionaler Statuszeile und Hinweis (Text je nach Overlay unterschiedlich –
 *  Game Over kehrt automatisch zurück, Level Complete wartet auf Enter). */
function buildOverlay(
  el: HTMLElement,
  titleKey: 'gameOver' | 'levelComplete',
  hintKey: TranslationKey,
): HTMLParagraphElement {
  el.replaceChildren();
  const title = document.createElement('p');
  title.className = 'overlay__title';
  title.textContent = t(titleKey);
  const stats = document.createElement('p');
  stats.className = 'overlay__stats';
  const hint = document.createElement('p');
  hint.className = 'overlay__hint';
  hint.textContent = t(hintKey);
  el.append(title, stats, hint);
  el.hidden = true;
  return stats;
}

/**
 * HUD als DOM-Elemente unter bzw. über dem Canvas (`#hud`, `#gameover`,
 * `#levelcomplete` aus `index.html`) – nicht ins Canvas gezeichnet, das lässt
 * sich einfacher stylen. Enthält Score, Erobert-Prozent, Leben, Schild, den
 * Mute-Toggle sowie die Game-Over- / Level-Complete-Overlays.
 *
 * `onMuteChange` (Instruktion 18, Punkt 6): der Mute-Button hält seinen
 * eigenen Sichtbarkeits-Zustand selbst; `main.ts` bekommt nur den neuen Wert
 * gemeldet, um `audioManager.setMuted()` aufzurufen – reicht als einfacher
 * Toggle, keine aufwändige Einstellungs-UI, kein Persistieren.
 */
export function createHud(onMuteChange: (muted: boolean) => void): Hud {
  const bar = document.getElementById('hud');
  const gameOverEl = document.getElementById('gameover');
  const levelCompleteEl = document.getElementById('levelcomplete');
  if (!bar || !gameOverEl || !levelCompleteEl) {
    throw new Error('HUD-Elemente #hud / #gameover / #levelcomplete nicht gefunden.');
  }

  const scoreEl = document.createElement('span');
  const claimedEl = document.createElement('span');
  const livesEl = document.createElement('span');
  const shieldEl = document.createElement('span');
  for (const el of [scoreEl, claimedEl, livesEl, shieldEl]) el.className = 'hud__item';

  let muted = false;
  const muteButton = document.createElement('button');
  muteButton.type = 'button';
  muteButton.className = 'hud__mute';
  const updateMuteButton = (): void => {
    muteButton.textContent = muted ? '🔇' : '🔊';
    muteButton.setAttribute('aria-label', t(muted ? 'unmuteLabel' : 'muteLabel'));
    muteButton.title = t(muted ? 'unmuteLabel' : 'muteLabel');
  };
  updateMuteButton();
  muteButton.addEventListener('click', () => {
    muted = !muted;
    updateMuteButton();
    onMuteChange(muted);
  });

  bar.append(scoreEl, claimedEl, livesEl, shieldEl, muteButton);

  // Game Over führt (per Enter oder automatisch nach GAME_OVER_DISPLAY_MS,
  // main.ts) zurück zum Startbildschirm statt direkt zu einer neuen Partie
  // wie beim Level-Complete-Overlay.
  buildOverlay(gameOverEl, 'gameOver', 'backToStartHint');
  const levelCompleteStats = buildOverlay(levelCompleteEl, 'levelComplete', 'restartHint');

  const bind = (el: HTMLElement, format: (v: number) => string) => {
    let last = '';
    return (value: number): void => {
      const text = format(value);
      if (text === last) return; // unnötiges DOM-Update vermeiden
      last = text;
      el.textContent = text;
    };
  };

  const setClaimedPercentage = bind(claimedEl, formatClaimedPercentage);
  const setScore = bind(scoreEl, formatScore);
  const setLives = bind(livesEl, formatLives);
  const setShield = bind(shieldEl, formatShield);

  let flashTimer: number | undefined;
  const flashLives = (): void => {
    livesEl.classList.remove('hud__flash');
    void livesEl.offsetWidth; // Reflow erzwingen, damit die Animation neu startet
    livesEl.classList.add('hud__flash');
    clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => livesEl.classList.remove('hud__flash'), 500);
  };

  setScore(0);
  setClaimedPercentage(0);

  return {
    setClaimedPercentage,
    setScore,
    setLives,
    setShield,
    flashLives,
    setGameOver: (visible: boolean): void => {
      gameOverEl.hidden = !visible;
    },
    setLevelComplete: (visible: boolean, percent?: number, score?: number): void => {
      if (visible && percent !== undefined && score !== undefined) {
        levelCompleteStats.textContent = `${formatClaimedPercentage(percent)}  ·  SCORE ${Math.round(score)}`;
      }
      levelCompleteEl.hidden = !visible;
    },
    dispose: (): void => {
      clearTimeout(flashTimer);
      scoreEl.remove();
      claimedEl.remove();
      livesEl.remove();
      shieldEl.remove();
      muteButton.remove();
      gameOverEl.hidden = true;
      levelCompleteEl.hidden = true;
    },
  };
}
