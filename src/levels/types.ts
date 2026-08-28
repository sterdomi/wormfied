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

/** Kanone: Spieler kann für begrenzte Zeit Mini-Gegner aus der Distanz treffen. */
export interface CannonBoostConfig {
  assetSrc: string;
  effectDurationSeconds: number;
  /** Zeit zwischen zwei automatischen Schüssen, solange die Kanone aktiv ist. */
  fireIntervalSeconds: number;
  projectileSpeed: number;
  projectileSize: number;
  /** Kann `kugel.svg` aus Instruktion 11 wiederverwenden. */
  projectileAssetSrc: string;
}

export interface BonusStonesConfig {
  spawning: BonusStoneSpawning;
  speedBoost: SpeedBoostConfig;
  cannon: CannonBoostConfig;
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
  // TODO(später): hier kommen weitere level-spezifische Eigenheiten rein
  // (Bewegungsmuster-Varianten, Spezialverhalten einzelner Level, Power-ups …).
}
