import { describe, it, expect } from 'vitest';
import { handleLifeLoss } from './lifecycle';
import { createPlayerState, STARTING_SHIELD } from './playerState';

describe('handleLifeLoss', () => {
  it('zieht ein Leben ab und füllt das Schild wieder auf', () => {
    const state = createPlayerState();
    state.shield = 5;

    handleLifeLoss(state);

    expect(state.lives).toBe(2);
    expect(state.shield).toBe(STARTING_SHIELD);
    expect(state.isGameOver).toBe(false);
  });

  it('setzt isGameOver, wenn das letzte Leben verloren geht', () => {
    const state = createPlayerState();
    state.lives = 1;

    handleLifeLoss(state);

    expect(state.lives).toBe(0);
    expect(state.isGameOver).toBe(true);
  });

  it('lässt lives nicht unter 0 fallen', () => {
    const state = createPlayerState();
    state.lives = 0;

    handleLifeLoss(state);

    expect(state.lives).toBe(0);
    expect(state.isGameOver).toBe(true);
  });

  it('lässt eine aktive Kanone unangetastet (Nutzer-Feedback: einmal erhalten, geht sie im Level nicht wieder verloren)', () => {
    const state = createPlayerState();
    state.cannonRemainingSeconds = Infinity;

    handleLifeLoss(state);

    expect(state.cannonRemainingSeconds).toBe(Infinity);
  });
});
