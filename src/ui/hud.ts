import { t, type TranslationKey } from '../i18n';
import {
  formatClaimedPercentage,
  LEVEL_CLEAR_EXTRA_LIFE_PERCENT,
  LEVEL_CLEAR_PERCENT_BONUS_TIERS,
} from '../game/scoring';
import { isIOS } from '../engine/platform';
import { setupIosInstallHint } from './iosInstallHint';
import { type LeaderboardEntry } from '../services/leaderboard';
import { getPlayerName, setPlayerName } from '../services/playerName';

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
  /** Game-Over-Overlay ein-/ausblenden (optional mit Endstand für die Statuszeile). */
  setGameOver: (visible: boolean, score?: number) => void;
  /** Level-Complete-Overlay ein-/ausblenden (mit erreichtem Prozent + Score). */
  setLevelComplete: (visible: boolean, percent?: number, score?: number) => void;
  /**
   * Befüllt die globale Top-10-Liste im Game-Over-Overlay. `'loading'`
   * während der Firestore-Abfrage läuft (`app/main.ts`), danach die
   * geladenen Einträge (leeres Array = "noch keine Einträge"). `ownEntry`
   * hebt die soeben übermittelte eigene Platzierung hervor, falls sie unter
   * den Top 10 gelandet ist.
   */
  setLeaderboard: (state: 'loading' | LeaderboardEntry[], ownEntry?: LeaderboardEntry) => void;
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

function formatBonusPoints(points: number): string {
  return `${points.toLocaleString('de-CH')} PTS`;
}

/**
 * Füllt den Prozent-Bonus-Block des Level-Complete-Overlays: die volle
 * Stufen-Tabelle (`LEVEL_CLEAR_PERCENT_BONUS_TIERS`, "% → PTS", wie im
 * Volfied-Original „zeige auch die anderen möglichen Scores"), die vom Spieler
 * tatsächlich erreichte Stufe hervorgehoben, plus eine Extra-Leben-Zeile ab
 * `LEVEL_CLEAR_EXTRA_LIFE_PERCENT`.
 */
function renderLevelCompleteBonus(container: HTMLElement, percent: number): void {
  container.replaceChildren();

  const heading = document.createElement('p');
  heading.className = 'overlay__bonus-heading';
  heading.textContent = t('bonusHeading');
  container.append(heading);

  // Erreichte Stufe = die erste (Tabelle ist absteigend), deren Schwelle
  // `percent` erreicht – dieselbe Wahl wie `levelClearPercentBonus`.
  const hitTier = LEVEL_CLEAR_PERCENT_BONUS_TIERS.find((tier) => percent >= tier.minPercent);

  for (const tier of LEVEL_CLEAR_PERCENT_BONUS_TIERS) {
    const row = document.createElement('div');
    row.className = 'overlay__bonus-row';
    if (tier === hitTier) row.classList.add('overlay__bonus-row--hit');

    const pct = document.createElement('span');
    pct.textContent = formatClaimedPercentage(tier.minPercent);
    const pts = document.createElement('span');
    pts.textContent = formatBonusPoints(tier.bonus);
    row.append(pct, pts);
    container.append(row);
  }

  if (percent >= LEVEL_CLEAR_EXTRA_LIFE_PERCENT) {
    const extra = document.createElement('p');
    extra.className = 'overlay__bonus-extra';
    extra.textContent = t('extraLifeAward');
    container.append(extra);
  }
}

/**
 * Füllt die Top-10-Liste im Game-Over-Overlay: Ladehinweis, "keine
 * Einträge" oder die Rangliste (Rang, Name, Score) mit der eigenen soeben
 * übermittelten Platzierung hervorgehoben (analog zur hervorgehobenen Stufe
 * in `renderLevelCompleteBonus`).
 */
function renderLeaderboard(
  container: HTMLElement,
  state: 'loading' | LeaderboardEntry[],
  ownEntry?: LeaderboardEntry,
): void {
  container.replaceChildren();

  const heading = document.createElement('p');
  heading.className = 'overlay__bonus-heading';
  heading.textContent = t('globalTop10');
  container.append(heading);

  if (state === 'loading') {
    const loading = document.createElement('p');
    loading.className = 'overlay__leaderboard-status';
    loading.textContent = t('leaderboardLoading');
    container.append(loading);
    return;
  }

  if (state.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'overlay__leaderboard-status';
    empty.textContent = t('leaderboardEmpty');
    container.append(empty);
    return;
  }

  state.forEach((entry, index) => {
    const row = document.createElement('div');
    row.className = 'overlay__bonus-row';
    if (ownEntry && entry.name === ownEntry.name && entry.score === ownEntry.score) {
      row.classList.add('overlay__bonus-row--hit');
    }

    const rank = document.createElement('span');
    rank.textContent = `${index + 1}. ${entry.name}`;
    const score = document.createElement('span');
    score.textContent = Math.round(entry.score).toLocaleString('de-CH');
    row.append(rank, score);
    container.append(row);
  });
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

  /**
   * Namens-Button für die globale Bestenliste (`services/leaderboard.ts`):
   * `window.prompt()` statt eines eigenen Eingabefelds – einfachste Lösung,
   * die nicht mit der globalen Enter-Taste (Neustart-Trigger, `input.ts`)
   * kollidiert, da sie den Game-Loop während der Eingabe synchron anhält.
   */
  const nameButton = document.createElement('button');
  nameButton.type = 'button';
  nameButton.className = 'hud__name';
  nameButton.textContent = '👤';
  nameButton.setAttribute('aria-label', t('changeNameLabel'));
  nameButton.title = t('changeNameLabel');
  nameButton.addEventListener('click', () => {
    const next = window.prompt(t('namePromptMessage'), getPlayerName());
    if (next !== null) setPlayerName(next);
  });

  // Drei Grid-Spalten (siehe main.css `#hud`): links Score/Leben/Schild,
  // Mitte die (grosse, garantiert nicht überlappende) Prozentanzeige,
  // rechts Mute/Fullscreen/Name.
  const leftGroup = document.createElement('div');
  leftGroup.className = 'hud__left';
  leftGroup.append(scoreEl, livesEl, shieldEl);

  const rightGroup = document.createElement('div');
  rightGroup.className = 'hud__right';
  rightGroup.append(muteButton, ...(fullscreenButton ? [fullscreenButton] : []), nameButton);

  bar.append(leftGroup, claimedEl, rightGroup);

  // Game Over führt (per Enter, main.ts) zurück zum Startbildschirm statt
  // direkt zu einer neuen Partie wie beim Level-Complete-Overlay.
  const gameOverStats = buildOverlay(gameOverEl, 'gameOver', 'backToStartHint');
  // Globale Top-10-Liste zwischen Statuszeile und Hinweis, analog zur
  // Prozent-Bonus-Tabelle im Level-Complete-Overlay unten – befüllt von
  // `setLeaderboard` (main.ts stösst dort Submit + Abfrage bei echtem Game
  // Over an, siehe `services/leaderboard.ts`).
  const leaderboardContainer = document.createElement('div');
  leaderboardContainer.className = 'overlay__bonus overlay__leaderboard';
  gameOverStats.after(leaderboardContainer);

  const levelCompleteStats = buildOverlay(levelCompleteEl, 'levelComplete', 'restartHint');
  // Prozent-Bonus-Tabelle zwischen Statuszeile und Hinweis – nur im
  // Level-Complete-Overlay, befüllt von `setLevelComplete` (braucht `percent`).
  const levelCompleteBonus = document.createElement('div');
  levelCompleteBonus.className = 'overlay__bonus';
  levelCompleteStats.after(levelCompleteBonus);
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
    setGameOver: (visible: boolean, score?: number): void => {
      if (visible) {
        gameOverStats.textContent = score !== undefined ? formatScore(score) : '';
        renderLeaderboard(leaderboardContainer, 'loading');
      }
      gameOverEl.hidden = !visible;
    },
    setLevelComplete: (visible: boolean, percent?: number, score?: number): void => {
      if (visible && percent !== undefined && score !== undefined) {
        levelCompleteStats.textContent = `${formatClaimedPercentage(percent)}  ·  SCORE ${Math.round(score)}`;
        renderLevelCompleteBonus(levelCompleteBonus, percent);
      }
      levelCompleteEl.hidden = !visible;
    },
    setLeaderboard: (state: 'loading' | LeaderboardEntry[], ownEntry?: LeaderboardEntry): void => {
      renderLeaderboard(leaderboardContainer, state, ownEntry);
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
