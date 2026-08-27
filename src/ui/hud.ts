import { t } from '../i18n';
import { formatClaimedPercentage } from '../game/scoring';

export interface Hud {
  /** Prozentanzeige der eroberten Fläche (Wert 0–100). */
  setClaimedPercentage: (percent: number) => void;
  /** Verbleibende Leben. */
  setLives: (lives: number) => void;
  /** Schild-Wert 0–100. */
  setShield: (shield: number) => void;
  /** Game-Over-Overlay ein-/ausblenden. */
  setGameOver: (visible: boolean) => void;
  dispose: () => void;
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

/**
 * HUD als DOM-Elemente unter bzw. über dem Canvas (`#hud`, `#gameover` aus
 * `index.html`) – nicht ins Canvas gezeichnet, das lässt sich einfacher stylen.
 * Enthält Erobert-Prozent, Leben und Schild sowie das Game-Over-Overlay.
 */
export function createHud(): Hud {
  const bar = document.getElementById('hud');
  const overlay = document.getElementById('gameover');
  if (!bar || !overlay) {
    throw new Error('HUD-Elemente #hud / #gameover nicht gefunden.');
  }

  const claimedEl = document.createElement('span');
  const livesEl = document.createElement('span');
  const shieldEl = document.createElement('span');
  claimedEl.className = 'hud__item';
  livesEl.className = 'hud__item';
  shieldEl.className = 'hud__item';
  bar.append(claimedEl, livesEl, shieldEl);

  overlay.replaceChildren();
  const title = document.createElement('p');
  title.className = 'gameover__title';
  title.textContent = t('gameOver');
  const hint = document.createElement('p');
  hint.className = 'gameover__hint';
  hint.textContent = t('restartHint');
  overlay.append(title, hint);
  overlay.hidden = true;

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
  const setLives = bind(livesEl, formatLives);
  const setShield = bind(shieldEl, formatShield);

  setClaimedPercentage(0);

  return {
    setClaimedPercentage,
    setLives,
    setShield,
    setGameOver: (visible: boolean): void => {
      overlay.hidden = !visible;
    },
    dispose: (): void => {
      claimedEl.remove();
      livesEl.remove();
      shieldEl.remove();
      overlay.hidden = true;
    },
  };
}
