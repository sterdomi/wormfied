import { formatClaimedPercentage } from '../game/scoring';

export interface Hud {
  /** Setzt die Prozentanzeige der eroberten Fläche (Wert 0–100). */
  setClaimedPercentage: (percent: number) => void;
  dispose: () => void;
}

/**
 * HUD-Leiste als DOM-Element unter dem Canvas (`#hud` aus `index.html`) – nicht
 * ins Canvas gezeichnet, das lässt sich einfacher stylen. Aktuell nur die gelbe
 * Prozentanzeige unten links; Score / Leben / Runde folgen später.
 */
export function createHud(): Hud {
  const bar = document.getElementById('hud');
  if (!bar) {
    throw new Error('HUD-Element #hud nicht gefunden.');
  }

  const claimedEl = document.createElement('span');
  claimedEl.className = 'hud__claimed';
  bar.appendChild(claimedEl);

  let lastText = '';
  const setClaimedPercentage = (percent: number): void => {
    const text = formatClaimedPercentage(percent);
    if (text === lastText) return; // unnötiges DOM-Update vermeiden
    lastText = text;
    claimedEl.textContent = text;
  };

  setClaimedPercentage(0);

  return {
    setClaimedPercentage,
    dispose: () => claimedEl.remove(),
  };
}
