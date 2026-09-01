import type { BonusStonesConfig } from './types';

/**
 * Default-Bonusstein-Konfiguration (Instruktion 14). War bis anhin in jedem
 * Level einzeln (identisch) ausformuliert; hier EINMAL zentral, damit ein
 * neues Level (z.B. Level 3) sie nicht ein drittes Mal kopieren muss. Ein
 * Level, das andere Werte braucht, übernimmt sie per Spread und überschreibt
 * einzelne Felder (`{ ...defaultBonusStones, spawning: { ... } }`).
 *
 * Spawn alle 8–12 s (10 s Mittelwert), max. 2 gleichzeitig, 10 s Lebensdauer –
 * oft genug, um beim Spielen regelmässig Gelegenheiten zu haben, aber nicht so
 * oft, dass das Feld überladen wirkt. Radius 16 (Durchmesser 32) liegt
 * zwischen Mini- (22) und Hauptgegner (40) – gut sichtbar, aber nicht
 * dominant.
 *
 * Speed-Boost: 2× für 5 s – spürbar, aber kurz genug, um kein Dauerzustand zu
 * werden.
 *
 * Kanone: bleibt für den Rest des Levels aktiv, sobald einmal eingesammelt
 * (Nutzer-Feedback, siehe `CannonBoostConfig`), alle 0.35 s ein Schuss
 * (~3/s) – reicht, um während des Zeichnens gezielt ein, zwei nahe
 * Mini-Gegner auszuschalten, ohne den Bildschirm mit Projektilen zu fluten.
 * Etwas schneller (650 px/s) und kleiner (14 px) als die Gegner-Kugel
 * (600 px/s, 18 px), damit sich der Spieler-Schuss "flinker" anfühlt – beide
 * klar über der Spieler-Höchstgeschwindigkeit; wiederverwendet `kugel.svg`.
 *
 * Pause (Nutzer-Feedback): friert für 5 s alle Gegner ein (Bewegung +
 * Schiessen) – lang genug, um in Ruhe eine grössere Fläche einzuschliessen,
 * kurz genug, um kein Dauerzustand zu werden.
 *
 * Bombe (Nutzer-Feedback): besiegt sofort beim Einsammeln alle aktuell
 * vorhandenen Mini-Gegner – kein Zeit-Effekt, daher keine
 * `effectDurationSeconds` (siehe `BombBoostConfig`).
 */
export const defaultBonusStones: BonusStonesConfig = {
  spawning: {
    spawnIntervalSeconds: 10,
    maxSimultaneous: 2,
    lifetimeSeconds: 10,
    radius: 16,
  },
  speedBoost: {
    assetSrc: '/assets/bonuses/bonus-speed.svg',
    speedMultiplier: 2,
    effectDurationSeconds: 5,
  },
  cannon: {
    assetSrc: '/assets/bonuses/bonus-cannon.svg',
    fireIntervalSeconds: 0.35,
    projectileSpeed: 650,
    projectileSize: 14,
    projectileAssetSrc: '/assets/projectiles/kugel.svg',
  },
  freeze: {
    assetSrc: '/assets/bonuses/bonus-freeze.svg',
    effectDurationSeconds: 5,
  },
  bomb: {
    assetSrc: '/assets/bonuses/bonus-bomb.svg',
  },
};
