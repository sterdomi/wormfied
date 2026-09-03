import { t, type TranslationKey } from '../i18n';
import {
  formatClaimedPercentage,
  LEVEL_CLEAR_EXTRA_LIFE_PERCENT,
  LEVEL_CLEAR_PERCENT_BONUS_TIERS,
} from '../game/scoring';
import { isIOS } from '../engine/platform';
import { setupIosInstallHint } from './iosInstallHint';
import {
  isNameTaken,
  PLAYER_NAME_MAX_LENGTH,
  type LeaderboardEntry,
} from '../services/leaderboard';
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
   * Eigener Score-Screen (Nutzer-Wunsch), der NACH dem Game-Over- bzw. (beim
   * letzten Level) dem Level-Complete-Overlay erscheint: Endstand, prominent
   * änderbarer Spielername und globale Top 10 – siehe `app/main.ts` für den
   * Ablauf. Zeigt beim Öffnen den aktuell gespeicherten Namen im Eingabefeld.
   */
  setScoreScreen: (visible: boolean, score?: number) => void;
  /**
   * Befüllt die globale Top-10-Liste im Score-Screen. `'loading'` während
   * der Firestore-Abfrage läuft (`app/main.ts`), danach die geladenen
   * Einträge (leeres Array = "noch keine Einträge"). `ownEntry` hebt die
   * soeben übermittelte eigene Platzierung hervor, falls sie unter den
   * Top 10 gelandet ist.
   */
  setScoreScreenLeaderboard: (
    state: 'loading' | LeaderboardEntry[],
    ownEntry?: LeaderboardEntry,
  ) => void;
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
 * Füllt die Top-10-Liste im Score-Screen: Ladehinweis, "keine Einträge"
 * oder die Rangliste (Rang, Name, Score) mit der eigenen soeben
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

interface ScoreScreenParts {
  stats: HTMLParagraphElement;
  leaderboard: HTMLElement;
  /** Vor jedem Anzeigen aufrufen: Eingabefeld mit dem aktuellen Namen befüllen, Status löschen. */
  reset: () => void;
}

/**
 * Eigener Score-Screen (Nutzer-Wunsch), der `app/main.ts` nach Game Over
 * bzw. (beim letzten Level) nach Level Complete zeigt: Endstand, ein
 * prominentes (nicht nur der kleine 👤-Button im HUD) Namens-Eingabefeld mit
 * Speichern-Button, und die globale Top 10. Namens-Speichern prüft vorher
 * per `isNameTaken` auf Dopplungen (Nutzer-Wunsch) – best effort, siehe dort.
 */
function buildScoreScreen(el: HTMLElement): ScoreScreenParts {
  el.replaceChildren();

  const title = document.createElement('p');
  title.className = 'overlay__title';
  title.textContent = t('scoreScreenTitle');

  const stats = document.createElement('p');
  stats.className = 'overlay__stats';

  const nameBlock = document.createElement('div');
  nameBlock.className = 'scorescreen__name';

  const nameLabel = document.createElement('label');
  nameLabel.className = 'scorescreen__name-label';
  nameLabel.textContent = t('yourNameLabel');
  nameLabel.htmlFor = 'scorescreen-name-input';

  const nameRow = document.createElement('div');
  nameRow.className = 'scorescreen__name-row';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'scorescreen-name-input';
  nameInput.className = 'scorescreen__name-input';
  nameInput.maxLength = PLAYER_NAME_MAX_LENGTH;
  nameInput.autocomplete = 'off';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'scorescreen__name-save';
  saveButton.textContent = t('saveNameLabel');

  nameRow.append(nameInput, saveButton);

  const nameStatus = document.createElement('p');
  nameStatus.className = 'scorescreen__name-status';

  nameBlock.append(nameLabel, nameRow, nameStatus);

  const leaderboard = document.createElement('div');
  leaderboard.className = 'overlay__bonus overlay__leaderboard';

  const hint = document.createElement('p');
  hint.className = 'overlay__hint';
  hint.textContent = t('backToStartHint');

  el.append(title, stats, nameBlock, leaderboard, hint);
  el.hidden = true;

  const setNameStatus = (text: string, kind: 'ok' | 'error' | null): void => {
    nameStatus.textContent = text;
    nameStatus.className =
      'scorescreen__name-status' + (kind ? ` scorescreen__name-status--${kind}` : '');
  };

  let saving = false;
  const save = async (): Promise<void> => {
    if (saving) return;
    const candidate = nameInput.value.trim().slice(0, PLAYER_NAME_MAX_LENGTH);
    if (!candidate) {
      setNameStatus(t('nameEmptyError'), 'error');
      return;
    }
    if (candidate === getPlayerName()) {
      setNameStatus(t('nameSavedStatus'), 'ok');
      return;
    }
    saving = true;
    saveButton.disabled = true;
    setNameStatus(t('nameCheckingStatus'), null);
    const taken = await isNameTaken(candidate);
    saving = false;
    saveButton.disabled = false;
    if (taken) {
      setNameStatus(t('nameTakenError'), 'error');
      return;
    }
    setPlayerName(candidate);
    nameInput.value = candidate;
    setNameStatus(t('nameSavedStatus'), 'ok');
  };

  saveButton.addEventListener('click', () => void save());
  // `input.ts` ignoriert Tastatur-Events komplett, solange dieses Feld den
  // Fokus hält (siehe `isTypingIntoField`) – Enter muss deshalb hier lokal
  // behandelt werden, sonst liesse sich der Name nie per Enter bestätigen.
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void save();
    }
  });

  return {
    stats,
    leaderboard,
    reset: (): void => {
      nameInput.value = getPlayerName();
      setNameStatus('', null);
    },
  };
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
  const scoreScreenEl = document.getElementById('scorescreen');
  if (!bar || !gameOverEl || !levelCompleteEl || !scoreScreenEl) {
    throw new Error(
      'HUD-Elemente #hud / #gameover / #levelcomplete / #scorescreen nicht gefunden.',
    );
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

  // Game Over führt (per Enter, main.ts) zu einem eigenen Score-Screen statt
  // direkt zum Startbildschirm (Nutzer-Wunsch) bzw. zur nächsten Partie wie
  // beim Level-Complete-Overlay.
  const gameOverStats = buildOverlay(gameOverEl, 'gameOver', 'toScoreScreenHint');
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

  const {
    stats: scoreScreenStats,
    leaderboard: scoreScreenLeaderboard,
    reset: resetScoreScreenNameEditor,
  } = buildScoreScreen(scoreScreenEl);

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
    setScoreScreen: (visible: boolean, score?: number): void => {
      if (visible) {
        scoreScreenStats.textContent = score !== undefined ? formatScore(score) : '';
        resetScoreScreenNameEditor();
        renderLeaderboard(scoreScreenLeaderboard, 'loading');
      }
      scoreScreenEl.hidden = !visible;
    },
    setScoreScreenLeaderboard: (
      state: 'loading' | LeaderboardEntry[],
      ownEntry?: LeaderboardEntry,
    ): void => {
      renderLeaderboard(scoreScreenLeaderboard, state, ownEntry);
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
      scoreScreenEl.hidden = true;
    },
  };
}
