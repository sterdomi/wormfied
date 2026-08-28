import { describe, it, expect } from 'vitest';
import {
  bonusStonePulseIntensity,
  createScreenFlash,
  enemyEyeGlowBlur,
  screenFlashOpacity,
  shieldAuraOpacity,
} from './visualEffects';
import {
  BONUS_PULSE_BASE_FREQUENCY_HZ,
  BONUS_PULSE_FAST_FREQUENCY_HZ,
  BONUS_PULSE_FAST_WINDOW_SECONDS,
  BONUS_PULSE_MIN_INTENSITY,
  ENEMY_EYE_GLOW_BASE_BLUR,
  ENEMY_EYE_GLOW_PULSE_BLUR,
  SCREEN_FLASH_DURATION_MS,
  SHIELD_AURA_MAX_OPACITY,
} from './visualEffectsConfig';

describe('shieldAuraOpacity', () => {
  it('ist bei vollem Schild am stärksten (SHIELD_AURA_MAX_OPACITY)', () => {
    expect(shieldAuraOpacity(100)).toBeCloseTo(SHIELD_AURA_MAX_OPACITY);
  });

  it('skaliert proportional zu shield/100', () => {
    expect(shieldAuraOpacity(50)).toBeCloseTo(SHIELD_AURA_MAX_OPACITY * 0.5);
    expect(shieldAuraOpacity(10)).toBeCloseTo(SHIELD_AURA_MAX_OPACITY * 0.1);
  });

  it('ist bei shield <= 0 exakt 0 (keine Aura, konsistent mit Instruktion 8)', () => {
    expect(shieldAuraOpacity(0)).toBe(0);
    expect(shieldAuraOpacity(-5)).toBe(0);
  });

  it('deckelt bei über 100', () => {
    expect(shieldAuraOpacity(150)).toBeCloseTo(SHIELD_AURA_MAX_OPACITY);
  });
});

describe('bonusStonePulseIntensity', () => {
  const lifetimeSeconds = 10;
  const spawnedAt = 0;

  const expectedIntensity = (elapsedSeconds: number, frequencyHz: number): number => {
    const wave = (Math.sin(elapsedSeconds * frequencyHz * Math.PI * 2) + 1) / 2;
    return BONUS_PULSE_MIN_INTENSITY + wave * (1 - BONUS_PULSE_MIN_INTENSITY);
  };

  it('bleibt immer im Bereich [BONUS_PULSE_MIN_INTENSITY, 1]', () => {
    for (let ms = 0; ms <= 10_000; ms += 137) {
      const v = bonusStonePulseIntensity(spawnedAt, lifetimeSeconds, ms);
      expect(v).toBeGreaterThanOrEqual(BONUS_PULSE_MIN_INTENSITY - 1e-9);
      expect(v).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('nutzt die Basis-Frequenz, solange mehr als BONUS_PULSE_FAST_WINDOW_SECONDS übrig sind', () => {
    // elapsed = 1s → remaining = 9s (> 3s) → Basis-Frequenz.
    const now = 1000;
    expect(bonusStonePulseIntensity(spawnedAt, lifetimeSeconds, now)).toBeCloseTo(
      expectedIntensity(1, BONUS_PULSE_BASE_FREQUENCY_HZ),
    );
  });

  it('wechselt in den letzten BONUS_PULSE_FAST_WINDOW_SECONDS auf die schnellere Frequenz', () => {
    // elapsed = 9s → remaining = 1s (<= 3s) → schnelle Frequenz.
    const now = 9000;
    expect(bonusStonePulseIntensity(spawnedAt, lifetimeSeconds, now)).toBeCloseTo(
      expectedIntensity(9, BONUS_PULSE_FAST_FREQUENCY_HZ),
    );
  });

  it('wechselt exakt an der Fenstergrenze auf die schnellere Frequenz', () => {
    const remaining = BONUS_PULSE_FAST_WINDOW_SECONDS;
    const elapsedSeconds = lifetimeSeconds - remaining;
    const now = elapsedSeconds * 1000;
    expect(bonusStonePulseIntensity(spawnedAt, lifetimeSeconds, now)).toBeCloseTo(
      expectedIntensity(elapsedSeconds, BONUS_PULSE_FAST_FREQUENCY_HZ),
    );
  });
});

describe('enemyEyeGlowBlur', () => {
  it('bleibt im Bereich [ENEMY_EYE_GLOW_BASE_BLUR, ENEMY_EYE_GLOW_BASE_BLUR + ENEMY_EYE_GLOW_PULSE_BLUR]', () => {
    for (let ms = 0; ms <= 5000; ms += 97) {
      const blur = enemyEyeGlowBlur(ms);
      expect(blur).toBeGreaterThanOrEqual(ENEMY_EYE_GLOW_BASE_BLUR - 1e-9);
      expect(blur).toBeLessThanOrEqual(ENEMY_EYE_GLOW_BASE_BLUR + ENEMY_EYE_GLOW_PULSE_BLUR + 1e-9);
    }
  });

  it('ist bei now=0 auf halbem Weg zwischen Basis- und Maximalwert (sin(0)=0)', () => {
    expect(enemyEyeGlowBlur(0)).toBeCloseTo(
      ENEMY_EYE_GLOW_BASE_BLUR + ENEMY_EYE_GLOW_PULSE_BLUR * 0.5,
    );
  });
});

describe('createScreenFlash / screenFlashOpacity', () => {
  it('startet bei voller Deckkraft (1) und blendet linear auf 0 aus', () => {
    const flash = createScreenFlash(1000);
    expect(screenFlashOpacity(flash, 1000)).toBeCloseTo(1);
    expect(screenFlashOpacity(flash, 1000 + SCREEN_FLASH_DURATION_MS / 2)).toBeCloseTo(0.5);
    expect(screenFlashOpacity(flash, 1000 + SCREEN_FLASH_DURATION_MS)).toBe(0);
  });

  it('ist 0 vor dem Start und nach Ablauf von durationMs', () => {
    const flash = createScreenFlash(1000);
    expect(screenFlashOpacity(flash, 999)).toBe(0);
    expect(screenFlashOpacity(flash, 1000 + SCREEN_FLASH_DURATION_MS + 500)).toBe(0);
  });

  it('nutzt SCREEN_FLASH_DURATION_MS als Default-Dauer', () => {
    const flash = createScreenFlash(0);
    expect(flash.durationMs).toBe(SCREEN_FLASH_DURATION_MS);
  });
});
