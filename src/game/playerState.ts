/** Leben zu Spielbeginn. */
export const STARTING_LIVES = 3;
/** Schild zu Spielbeginn (Skala 0–100). */
export const STARTING_SHIELD = 100;
/** Schild-Abnahme pro Sekunde, solange der Spieler auf dem Rand steht. */
export const SHIELD_DECAY_PER_SECOND = 8;

/**
 * Leben-/Schild-/Game-Over-Zustand des Spielers. Getrennt von der Spielfigur
 * (`Player`), weil das hier reiner Zahlen-Zustand ist und beim Neustart komplett
 * zurückgesetzt wird.
 */
export interface PlayerState {
  lives: number;
  /** 0–100. Bei 0 ist der Spieler auch auf dem Rand verwundbar. */
  shield: number;
  isGameOver: boolean;
  /** Sekunden verbleibend für aktiven Geschwindigkeits-Boost (Instruktion 14). 0 = inaktiv. */
  speedBoostRemainingSeconds: number;
  /** Sekunden verbleibend für aktive Kanone (Instruktion 14). 0 = inaktiv. */
  cannonRemainingSeconds: number;
  /** Cooldown-Timer für automatische Spieler-Schüsse, solange die Kanone aktiv
   *  ist – analog zu `Enemy.timeSinceLastShot`. */
  timeSinceLastPlayerShot: number;
}

export function createPlayerState(): PlayerState {
  return {
    lives: STARTING_LIVES,
    shield: STARTING_SHIELD,
    isGameOver: false,
    speedBoostRemainingSeconds: 0,
    cannonRemainingSeconds: 0,
    timeSinceLastPlayerShot: 0,
  };
}

/** Setzt einen bestehenden Zustand auf die Startwerte zurück (in-place). */
export function resetPlayerState(state: PlayerState): void {
  state.lives = STARTING_LIVES;
  state.shield = STARTING_SHIELD;
  state.isGameOver = false;
  state.speedBoostRemainingSeconds = 0;
  state.cannonRemainingSeconds = 0;
  state.timeSinceLastPlayerShot = 0;
}

/**
 * Zählt die Bonus-Timer für einen Frame herunter (minimal 0) – unabhängig vom
 * Rand-/Zeichen-Modus, im Gegensatz zu `decayShield`.
 */
export function decayBoostTimers(state: PlayerState, dt: number): void {
  state.speedBoostRemainingSeconds = Math.max(0, state.speedBoostRemainingSeconds - dt);
  state.cannonRemainingSeconds = Math.max(0, state.cannonRemainingSeconds - dt);
}

/**
 * Schild-Abnahme für einen Frame (Delta-Time-basiert), minimal 0. Aufrufen,
 * solange `mode === 'onEdge'`; beim Zeichnen bleibt das Schild unverändert.
 */
export function decayShield(state: PlayerState, dt: number): void {
  state.shield = Math.max(0, state.shield - SHIELD_DECAY_PER_SECOND * dt);
}
