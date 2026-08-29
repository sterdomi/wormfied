import { t, type TranslationKey } from '../i18n';
import { formatClaimedPercentage } from '../game/scoring';
import { isIOS } from '../engine/platform';
import { setupIosInstallHint } from './iosInstallHint';

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
  // Nutzer-Feedback (Vergleich mit dem Volfied-Original): die Prozentanzeige
  // ist dort mittig und deutlich grösser als die übrigen Werte – eigene
  // Klasse zusätzlich zu `hud__item` (siehe main.css). War zunächst
  // `position: absolute` + `left: 50%` (bildschirmmittig, unabhängig von der
  // Breite der Nachbar-Elemente) – auf schmalen Geräten (iPhone) konnte der
  // lange Schild-Text dadurch aber genau dort liegen und sich mit der
  // Prozentanzeige überlappen. Jetzt eine echte mittlere Grid-Spalte
  // (`#hud` ist `display: grid`, siehe main.css) – Score/Leben/Schild in
  // `hud__left`, Mute/Fullscreen in `hud__right`, dazwischen garantiert kein
  // Overlap mehr möglich, unabhängig von der Textlänge.
  claimedEl.classList.add('hud__percentage');

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

  /**
   * Fullscreen-Button (Instruktion 20, Punkt 4) – Progressive Enhancement:
   * nur gerendert, wenn `document.fullscreenEnabled` UND explizit NICHT iOS
   * (dort funktioniert die Fullscreen API lautlos nicht, siehe
   * `platform.ts`/Instruktion-Kontext; manche iOS-Versionen melden über
   * `fullscreenEnabled` trotzdem widersprüchlich Unterstützung, daher der
   * zusätzliche harte Ausschluss statt sich allein auf das Feature-Flag zu
   * verlassen). Ist eine der Bedingungen nicht erfüllt, wird gar kein Button
   * erzeugt (kein deaktivierter/nutzloser Button).
   */
  const fullscreenSupported = document.fullscreenEnabled && !isIOS();
  let fullscreenButton: HTMLButtonElement | null = null;
  let onFullscreenChange: (() => void) | null = null;
  if (fullscreenSupported) {
    fullscreenButton = document.createElement('button');
    fullscreenButton.type = 'button';
    fullscreenButton.className = 'hud__fullscreen';
    const updateFullscreenButton = (): void => {
      const active = document.fullscreenElement !== null;
      fullscreenButton!.textContent = active ? '⤡' : '⛶';
      const labelKey = active ? 'fullscreenExitLabel' : 'fullscreenEnterLabel';
      fullscreenButton!.setAttribute('aria-label', t(labelKey));
      fullscreenButton!.title = t(labelKey);
    };
    updateFullscreenButton();
    fullscreenButton.addEventListener('click', () => {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void document.documentElement.requestFullscreen();
      }
    });
    onFullscreenChange = updateFullscreenButton;
    document.addEventListener('fullscreenchange', onFullscreenChange);
  }

  // Drei Grid-Spalten (siehe main.css `#hud`): links Score/Leben/Schild,
  // Mitte die (grosse, garantiert nicht überlappende) Prozentanzeige,
  // rechts Mute/Fullscreen.
  const leftGroup = document.createElement('div');
  leftGroup.className = 'hud__left';
  leftGroup.append(scoreEl, livesEl, shieldEl);

  const rightGroup = document.createElement('div');
  rightGroup.className = 'hud__right';
  rightGroup.append(muteButton, ...(fullscreenButton ? [fullscreenButton] : []));

  bar.append(leftGroup, claimedEl, rightGroup);

  // Game Over führt (per Enter oder automatisch nach GAME_OVER_DISPLAY_MS,
  // main.ts) zurück zum Startbildschirm statt direkt zu einer neuen Partie
  // wie beim Level-Complete-Overlay.
  buildOverlay(gameOverEl, 'gameOver', 'backToStartHint');
  const levelCompleteStats = buildOverlay(levelCompleteEl, 'levelComplete', 'restartHint');
  // iPhone-"Zum Home-Bildschirm"-Hinweis (Instruktion 20, Punkt 3) sitzt im
  // Game-Over-Screen statt als permanentes Banner (Nutzer-Feedback: dort ist
  // noch Platz, und die Anleitung ist ohnehin iPhone-spezifisch formuliert,
  // siehe `iosInstallHint.ts`). NACH `buildOverlay`, da dessen
  // `replaceChildren()` sonst den Hinweis wieder entfernen würde.
  setupIosInstallHint(gameOverEl);

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
      leftGroup.remove();
      claimedEl.remove();
      rightGroup.remove();
      if (fullscreenButton && onFullscreenChange) {
        document.removeEventListener('fullscreenchange', onFullscreenChange);
      }
      gameOverEl.hidden = true;
      levelCompleteEl.hidden = true;
    },
  };
}
