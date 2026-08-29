import { describe, it, expect } from 'vitest';
import {
  createPlayerState,
  decayBoostTimers,
  decayShield,
  resetPlayerState,
  SHIELD_DECAY_PER_SECOND,
  STARTING_LIVES,
  STARTING_SHIELD,
} from './playerState';

describe('createPlayerState', () => {
  it('startet mit vollen Leben, vollem Schild, nicht Game Over, keinen aktiven Boosts', () => {
    expect(createPlayerState()).toEqual({
      lives: STARTING_LIVES,
      shield: STARTING_SHIELD,
      isGameOver: false,
      speedBoostRemainingSeconds: 0,
      cannonRemainingSeconds: 0,
      timeSinceLastPlayerShot: 0,
    });
  });
});

describe('decayShield', () => {
  it('nimmt Delta-Time-basiert ab', () => {
    const state = createPlayerState();
    decayShield(state, 1);
    expect(state.shield).toBe(STARTING_SHIELD - SHIELD_DECAY_PER_SECOND);
    decayShield(state, 0.5);
    expect(state.shield).toBeCloseTo(STARTING_SHIELD - SHIELD_DECAY_PER_SECOND * 1.5);
  });

  it('sinkt nicht unter 0', () => {
    const state = createPlayerState();
    state.shield = 3;
    decayShield(state, 10); // würde weit ins Negative gehen
    expect(state.shield).toBe(0);
    decayShield(state, 1);
    expect(state.shield).toBe(0);
  });
});

describe('resetPlayerState', () => {
  it('setzt einen veränderten Zustand (inkl. Boosts) auf die Startwerte zurück', () => {
    const state = createPlayerState();
    state.lives = 0;
    state.shield = 0;
    state.isGameOver = true;
    state.speedBoostRemainingSeconds = 3;
    state.cannonRemainingSeconds = 4;
    state.timeSinceLastPlayerShot = 0.2;

    resetPlayerState(state);

    expect(state).toEqual({
      lives: STARTING_LIVES,
      shield: STARTING_SHIELD,
      isGameOver: false,
      speedBoostRemainingSeconds: 0,
      cannonRemainingSeconds: 0,
      timeSinceLastPlayerShot: 0,
    });
  });
});

describe('decayBoostTimers', () => {
  it('zählt beide Boost-Timer Delta-Time-basiert herunter, minimal 0', () => {
    const state = createPlayerState();
    state.speedBoostRemainingSeconds = 5;
    state.cannonRemainingSeconds = 1;

    decayBoostTimers(state, 0.5);
    expect(state.speedBoostRemainingSeconds).toBeCloseTo(4.5);
    expect(state.cannonRemainingSeconds).toBeCloseTo(0.5);

    decayBoostTimers(state, 10); // würde weit ins Negative gehen
    expect(state.speedBoostRemainingSeconds).toBe(0);
    expect(state.cannonRemainingSeconds).toBe(0);
  });

  it('zählt eine permanente Kanone (Infinity) nie herunter (Nutzer-Feedback: einmal erhalten, geht sie im Level nicht wieder verloren)', () => {
    const state = createPlayerState();
    state.cannonRemainingSeconds = Infinity;

    decayBoostTimers(state, 1_000_000);

    expect(state.cannonRemainingSeconds).toBe(Infinity);
  });
});
