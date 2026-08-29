/** Leben zu Spielbeginn. */
export const STARTING_LIVES = 3;
/** Schild zu Spielbeginn (Skala 0–100). */
export const STARTING_SHIELD = 100;
/**
 * Default-Schild-Abnahme pro Sekunde, solange der Spieler auf dem Rand
 * steht, falls ein Level `shieldDecayPerSecond` nicht selbst festlegt (siehe
 * `LevelConfig`). Nutzer-Feedback: von 8 auf 5 gesenkt (100 / 5 = 20s statt
 * 12.5s bis das Schild komplett aufgebraucht ist), damit es spürbar länger
 * hält.
 */
export const SHIELD_DECAY_PER_SECOND = 5;

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
  /** Sekunden verbleibend, in denen ALLE Gegner eingefroren sind (Pause-
   *  Bonusstein, Nutzer-Feedback). 0 = inaktiv, Gegner bewegen/schiessen
   *  normal. Wirkt auf die Gegner, nicht den Spieler – liegt trotzdem hier,
   *  da es (wie Speed-Boost/Kanone) ein per Bonusstein ausgelöster,
   *  zeitgesteuerter Effekt der aktuellen Partie ist. */
  enemyFreezeRemainingSeconds: number;
}

export function createPlayerState(): PlayerState {
  return {
    lives: STARTING_LIVES,
    shield: STARTING_SHIELD,
    isGameOver: false,
    speedBoostRemainingSeconds: 0,
    cannonRemainingSeconds: 0,
    timeSinceLastPlayerShot: 0,
    enemyFreezeRemainingSeconds: 0,
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
  state.enemyFreezeRemainingSeconds = 0;
}

/**
 * Zählt die Bonus-Timer für einen Frame herunter (minimal 0) – unabhängig vom
 * Rand-/Zeichen-Modus, im Gegensatz zu `decayShield`.
 */
export function decayBoostTimers(state: PlayerState, dt: number): void {
  state.speedBoostRemainingSeconds = Math.max(0, state.speedBoostRemainingSeconds - dt);
  state.cannonRemainingSeconds = Math.max(0, state.cannonRemainingSeconds - dt);
  state.enemyFreezeRemainingSeconds = Math.max(0, state.enemyFreezeRemainingSeconds - dt);
}

/**
 * Schild-Abnahme für einen Frame (Delta-Time-basiert), minimal 0. Aufrufen,
 * solange `mode === 'onEdge'`; beim Zeichnen bleibt das Schild unverändert.
 *
 * `decayPerSecond` (Default `SHIELD_DECAY_PER_SECOND`) erlaubt es dem
 * Aufrufer, die Abnahme pro Level zu konfigurieren (Nutzer-Feedback, siehe
 * `LevelConfig.shieldDecayPerSecond`), statt sie fest an die globale
 * Standardrate zu koppeln.
 */
export function decayShield(
  state: PlayerState,
  dt: number,
  decayPerSecond: number = SHIELD_DECAY_PER_SECOND,
): void {
  state.shield = Math.max(0, state.shield - decayPerSecond * dt);
}
