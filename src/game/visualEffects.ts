import {
  BONUS_PULSE_BASE_FREQUENCY_HZ,
  BONUS_PULSE_FAST_FREQUENCY_HZ,
  BONUS_PULSE_FAST_WINDOW_SECONDS,
  BONUS_PULSE_MIN_INTENSITY,
  ENEMY_EYE_GLOW_BASE_BLUR,
  ENEMY_EYE_GLOW_PULSE_BLUR,
  ENEMY_EYE_PULSE_FREQUENCY_HZ,
  SCREEN_FLASH_DURATION_MS,
  SHIELD_AURA_MAX_OPACITY,
} from './visualEffectsConfig';

/**
 * Aura-Deckkraft um den Spieler, proportional zu `shield` (Instruktion 17,
 * Punkt 1). 0 bei `shield <= 0` (keine Aura mehr – konsistent mit der
 * Ungeschützt-Regel aus Instruktion 8), linear bis `SHIELD_AURA_MAX_OPACITY`
 * bei vollem Schild (100).
 */
export function shieldAuraOpacity(shield: number): number {
  const t = Math.max(0, Math.min(100, shield)) / 100;
  return t * SHIELD_AURA_MAX_OPACITY;
}

/** 0..1-Sinuswelle für einen gegebenen Takt – gemeinsame Basis für die
 *  Puls-Effekte unten. */
function pulseWave(elapsedSeconds: number, frequencyHz: number): number {
  return (Math.sin(elapsedSeconds * frequencyHz * Math.PI * 2) + 1) / 2;
}

/**
 * Puls-Intensität (`BONUS_PULSE_MIN_INTENSITY`..1) eines Bonussteins zum
 * Zeitpunkt `now` (Instruktion 17, Punkt 2). Pulsiert kontinuierlich über die
 * gesamte Lebensdauer; die Frequenz springt in den letzten
 * `BONUS_PULSE_FAST_WINDOW_SECONDS` Sekunden vor Ablauf auf
 * `BONUS_PULSE_FAST_FREQUENCY_HZ` (nonverbales Warnsignal), davor gilt die
 * ruhigere `BONUS_PULSE_BASE_FREQUENCY_HZ`.
 */
export function bonusStonePulseIntensity(
  spawnedAt: number,
  lifetimeSeconds: number,
  now: number,
): number {
  const elapsedSeconds = (now - spawnedAt) / 1000;
  const remainingSeconds = lifetimeSeconds - elapsedSeconds;
  const frequencyHz =
    remainingSeconds <= BONUS_PULSE_FAST_WINDOW_SECONDS
      ? BONUS_PULSE_FAST_FREQUENCY_HZ
      : BONUS_PULSE_BASE_FREQUENCY_HZ;
  const wave = pulseWave(elapsedSeconds, frequencyHz);
  return BONUS_PULSE_MIN_INTENSITY + wave * (1 - BONUS_PULSE_MIN_INTENSITY);
}

/**
 * Glow-Blur-Radius (Pixel) für die pulsierenden Gegner-Augen (Instruktion
 * 17, Punkt 4) zum Zeitpunkt `now` – rein dekorativ, ein gleichmässiger Puls
 * unabhängig vom Spielzustand reicht.
 */
export function enemyEyeGlowBlur(now: number): number {
  const wave = pulseWave(now / 1000, ENEMY_EYE_PULSE_FREQUENCY_HZ);
  return ENEMY_EYE_GLOW_BASE_BLUR + wave * ENEMY_EYE_GLOW_PULSE_BLUR;
}

/**
 * Zeitgesteuerter Screen-Flash bei Lebensverlust (Instruktion 17, Punkt 5) –
 * strukturell wie `Explosion` (Instruktion 12): `startTime` + `durationMs`,
 * linear ausblendend, statt ein neues Timing-Muster einzuführen.
 */
export interface ScreenFlash {
  startTime: number;
  durationMs: number;
}

export function createScreenFlash(now: number = performance.now()): ScreenFlash {
  return { startTime: now, durationMs: SCREEN_FLASH_DURATION_MS };
}

/**
 * Deckkraft (0..1) des Flashs zum Zeitpunkt `now`, linear von 1 auf 0
 * ausblendend. 0 vor Beginn oder nach Ablauf von `durationMs`.
 */
export function screenFlashOpacity(flash: ScreenFlash, now: number): number {
  const elapsed = now - flash.startTime;
  if (elapsed < 0 || elapsed >= flash.durationMs) return 0;
  return 1 - elapsed / flash.durationMs;
}
