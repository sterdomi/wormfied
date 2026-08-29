/** Feuert ein Gegner Projektile ab? */
export interface ShootingConfig {
  enabled: boolean;
  /** Zeit zwischen zwei Schüssen (Sekunden). */
  cooldownSeconds: number;
  /** Projektil-Geschwindigkeit in Pixel/Sekunde. */
  projectileSpeed: number;
  /** Projektil-Rendergrösse (Durchmesser) in Pixel. */
  projectileSize: number;
  projectileAssetSrc: string;
}

/** Konfiguration eines Gegnertyps (Hauptgegner oder Mini-Gegner). */
export interface EnemyConfig {
  /** Pfad zum SVG-Sprite (wie PNGs über `Image()` ladbar). */
  assetSrc: string;
  /**
   * Optionale zweite Bein-Pose für eine simple Zwei-Bild-Lauf-Animation
   * (Sprite-Swap statt prozeduraler Animation) – fehlt sie, wird nur
   * `assetSrc` gezeichnet (kein Bein-"Wackeln").
   */
  walkAssetSrc?: string;
  /** Bewegungsgeschwindigkeit in Pixel/Sekunde. */
  speed: number;
  /** Rendergrösse (Durchmesser) in Pixel. */
  size: number;
  /** Optional. Fehlt es oder `enabled: false` → der Gegner schiesst nicht. */
  shooting?: ShootingConfig;
}

/** Punkte für besiegte Gegner (Instruktion 12). Fehlt sie, gelten die
 *  Fallback-Werte aus `src/game/scoring.ts`. */
export interface DefeatScoring {
  miniEnemyPoints: number;
  mainEnemyPoints: number;
}

/** Spawning-Parameter für Bonussteine (Instruktion 14). */
export interface BonusStoneSpawning {
  spawnIntervalSeconds: number;
  maxSimultaneous: number;
  /** Wie lange ein Stein sichtbar bleibt, bevor er ungefangen wieder verschwindet. */
  lifetimeSeconds: number;
  /** Für Rendering + Kollision/Hindernis-Verhalten. */
  radius: number;
}

/** Geschwindigkeits-Boost: Rand- UND Zeichen-Bewegung werden vorübergehend schneller. */
export interface SpeedBoostConfig {
  assetSrc: string;
  speedMultiplier: number;
  effectDurationSeconds: number;
}

/**
 * Kanone: Spieler kann Mini-Gegner aus der Distanz treffen. Kein Zeit-Bonus
 * (mehr) – einmal eingesammelt bleibt sie für den Rest des Levels aktiv
 * (Nutzer-Feedback), daher KEINE `effectDurationSeconds` (anders als
 * `SpeedBoostConfig`), siehe `applyBonusStoneEffect` in `bonusStone.ts`.
 */
export interface CannonBoostConfig {
  assetSrc: string;
  /** Zeit zwischen zwei automatischen Schüssen, solange die Kanone aktiv ist. */
  fireIntervalSeconds: number;
  projectileSpeed: number;
  projectileSize: number;
  /** Kann `kugel.svg` aus Instruktion 11 wiederverwenden. */
  projectileAssetSrc: string;
}

/** Pause: friert für begrenzte Zeit ALLE Gegner ein (Bewegung + Schiessen). */
export interface FreezeBoostConfig {
  assetSrc: string;
  effectDurationSeconds: number;
}

/**
 * Bombe: besiegt SOFORT beim Einsammeln alle aktuell vorhandenen Mini-Gegner
 * (Nutzer-Feedback) – im Gegensatz zu den anderen drei Bonustypen kein
 * Zeit-Effekt, daher keine `effectDurationSeconds`. Wirkt auf Gegner/Score,
 * nicht auf `PlayerState` – wird in `main.ts` direkt behandelt, nicht über
 * `applyBonusStoneEffect` in `bonusStone.ts` (siehe dortiger Kommentar).
 */
export interface BombBoostConfig {
  assetSrc: string;
}

export interface BonusStonesConfig {
  spawning: BonusStoneSpawning;
  speedBoost: SpeedBoostConfig;
  cannon: CannonBoostConfig;
  freeze: FreezeBoostConfig;
  bomb: BombBoostConfig;
}

/**
 * Vollständige Konfiguration eines Levels. Jedes Level ist ein eigenes
 * Unterpackage unter `src/levels/` und exportiert genau ein solches Objekt.
 */
export interface LevelConfig {
  id: string;
  name: string;
  backgroundSrc: string;
  foregroundSrc: string;
  mainEnemy: EnemyConfig;
  miniEnemies: {
    count: number;
    config: EnemyConfig;
  };
  scoring?: DefeatScoring;
  bonusStones: BonusStonesConfig;
  /** Hintergrundmusik-Loop für dieses Level. Optional – fehlt sie, bleibt es still. */
  musicSrc?: string;
  /**
   * Schild-Abnahme pro Sekunde auf dem Rand (Nutzer-Feedback: pro Level
   * konfigurierbar). Fehlt sie, gilt `SHIELD_DECAY_PER_SECOND` aus
   * `playerState.ts`. Kleinerer Wert = Schild hält länger.
   */
  shieldDecayPerSecond?: number;
  // TODO(später): hier kommen weitere level-spezifische Eigenheiten rein
  // (Bewegungsmuster-Varianten, Spezialverhalten einzelner Level, Power-ups …).
}
