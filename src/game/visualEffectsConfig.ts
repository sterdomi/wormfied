import type { BonusStoneType } from './bonusStone';

/**
 * Zentrale Konstanten für die dekorativen Glow-Effekte aus Instruktion 17.
 * Bewusst an einer Stelle statt in den jeweiligen Rendering-Funktionen
 * verstreut (Punkt 6 der Instruktion).
 */

// 1. Schild-Aura um den Spieler.
/** Hellblau, wie der Stromball (`COLOR_SPARK` in `main.ts`). */
export const SHIELD_AURA_COLOR_RGB = '143, 188, 255';
/** Deckkraft bei vollem Schild (bewusst < 1 – "sanfter" Glow). */
export const SHIELD_AURA_MAX_OPACITY = 0.55;
/** Zusätzlicher Radius über die Spieler-Sprite-Grösse hinaus. */
export const SHIELD_AURA_RADIUS_EXTRA = 14;

// 2. Pulsierende Bonussteine.
export const BONUS_PULSE_BASE_FREQUENCY_HZ = 0.6;
/** Deutlich schnelleres Pulsieren kurz vor dem Verschwinden (Warnsignal). */
export const BONUS_PULSE_FAST_FREQUENCY_HZ = 2.2;
/** "Kurz vor dem Verschwinden" = letzte X Sekunden der Lebensdauer. */
export const BONUS_PULSE_FAST_WINDOW_SECONDS = 3;
/** Puls oszilliert zwischen diesem Wert und 1, fällt nie auf 0. */
export const BONUS_PULSE_MIN_INTENSITY = 0.4;
export const BONUS_PULSE_GLOW_RADIUS_EXTRA = 10;
export const BONUS_PULSE_GLOW_MAX_ALPHA = 0.55;
/** Passend zu `bonus-speed.svg` (#48cae4) / `bonus-cannon.svg` (#ff9e00). */
export const BONUS_PULSE_COLOR_RGB: Record<BonusStoneType, string> = {
  speedBoost: '72, 202, 228',
  cannon: '255, 158, 0',
  freeze: '144, 224, 239', // Helles Eisblau, wie in bonus-freeze.svg
  bomb: '199, 125, 255', // Violett, wie in bonus-bomb.svg
};

// 3. Glühender Zeichen-Pfad.
/** Entspricht `COLOR_DRAWING` (`#a3be8c`) in `main.ts`. */
export const DRAW_PATH_GLOW_COLOR_RGB = '163, 190, 140';
/**
 * Nutzer-Feedback (Vergleich mit dem Volfied-Original-Screenshot): Linien
 * generell feiner statt so breit – zusammen mit der auf 2 reduzierten
 * Kernlinienbreite (siehe `main.ts`) verkleinert, im selben Verhältnis wie
 * zuvor (Glow ≈ 3× die Kernlinie: 6 = 3× 2, wie zuvor 10 ≈ 3× 3).
 */
export const DRAW_PATH_GLOW_WIDTH = 6;
export const DRAW_PATH_GLOW_ALPHA = 0.25;

// 4. Dynamisch pulsierende Gegner-Augen.
export const ENEMY_EYE_GLOW_COLOR = '#e63946';
export const ENEMY_EYE_PULSE_FREQUENCY_HZ = 1.4;
export const ENEMY_EYE_GLOW_BASE_BLUR = 4;
export const ENEMY_EYE_GLOW_PULSE_BLUR = 4;

// 5. Screen-Flash bei Lebensverlust.
export const SCREEN_FLASH_DURATION_MS = 260;
/** Entspricht der bisherigen Schaden-Flash-Farbe in `main.ts`. */
export const SCREEN_FLASH_COLOR_RGB = '191, 97, 106';
export const SCREEN_FLASH_MAX_ALPHA = 0.5;
