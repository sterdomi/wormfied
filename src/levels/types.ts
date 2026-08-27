/** Konfiguration eines Gegnertyps (Hauptgegner oder Mini-Gegner). */
export interface EnemyConfig {
  /** Pfad zum SVG-Sprite (wie PNGs über `Image()` ladbar). */
  assetSrc: string;
  /** Bewegungsgeschwindigkeit in Pixel/Sekunde. */
  speed: number;
  /** Rendergrösse (Durchmesser) in Pixel. */
  size: number;
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
  // TODO(später): hier kommen weitere level-spezifische Eigenheiten rein
  // (Bewegungsmuster-Varianten, Spezialverhalten einzelner Level, Power-ups …).
}
