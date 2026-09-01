import type { Enemy } from '../game/enemy';
import type { Point } from '../game/field';
import type { Projectile } from '../game/projectile';

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
  /**
   * Optionaler Schuss-Sound (Pfad wie `LevelConfig.musicSrc`). Fehlt er,
   * spielt der globale `enemy_shot`-SFX. Wird pro Level unter einem eigenen
   * Key geladen (`enemyShotSoundKey` in `main.ts`), analog zur Level-Musik.
   */
  soundSrc?: string;
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
  /**
   * Optionale „Schuss"-Pose des Sprites, kurz eingeblendet, wenn der Gegner
   * feuert. In Level 2 zeigt der Kopf sie, während er ein Körperglied durch
   * den Mund ausspuckt (siehe `mouthSpit.ts` / `render.ts`). Fehlt sie, bleibt
   * es bei `assetSrc`/`walkAssetSrc`.
   */
  shootAssetSrc?: string;
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
 * Sprites, die der Level-Renderer zum Zeichnen der Gegner braucht – ein
 * struktureller Ausschnitt aus `LevelImages` (`engine/assetLoader.ts`), damit
 * `src/levels/` nicht an der Engine hängt. `main.ts` reicht sein `assets`-
 * Objekt unverändert durch.
 */
export interface LevelEnemyAssets {
  mainEnemy: HTMLImageElement;
  mainEnemyWalk?: HTMLImageElement;
  /** „Schuss"-Pose des Hauptgegners (`EnemyConfig.shootAssetSrc`), optional. */
  mainEnemyShoot?: HTMLImageElement;
  miniEnemy: HTMLImageElement;
  miniEnemyWalk?: HTMLImageElement;
}

/** Momentaner Gegner-Zustand + Frame-Timing für einen `renderEnemies`-Aufruf. */
export interface LevelEnemyRenderState {
  mainEnemy: Enemy;
  miniEnemies: Enemy[];
  /**
   * Zusätzlicher Render-Skalierungsfaktor NUR des Hauptgegners (Einkesselung,
   * siehe `game/enemyEncirclement.ts`); Mini-Gegner rendern immer bei 1.
   */
  mainEnemyScale: number;
  /**
   * Beim Levelabschluss verschwindet der Hauptgegner mit seiner Explosion
   * (Nutzer-Feedback) – dann `true`, der Renderer lässt ihn weg.
   */
  hideMainEnemy: boolean;
  /**
   * Gemeinsamer Bein-Wechsel-Takt für Spieler UND Gegner – in `main.ts`
   * bestimmt (`WALK_FRAME_INTERVAL_MS`), damit alle synchron "wackeln".
   */
  useWalkFrame: boolean;
  /** Gemeinsame Frame-Wanduhrzeit (`performance.now()`). */
  now: number;
}

/**
 * Zeichnet die Gegner-Ebene eines Levels. Der Game-Loop (`render()` in
 * `main.ts`) ruft pro Frame den Renderer des aktiven Levels auf – so lebt die
 * levelspezifische Gegner-Darstellung (Sprite-Wahl, Augen-Glow, Eigenheiten
 * einzelner Level) im jeweiligen `src/levels/<level>/`-Package statt zentral
 * in `main.ts`.
 */
export type LevelEnemyRenderer = (
  ctx: CanvasRenderingContext2D,
  assets: LevelEnemyAssets,
  state: LevelEnemyRenderState,
) => void;

/**
 * Per-Frame-Spielzustand für einen `updateEnemies`-Aufruf – alles, was die
 * levelspezifische Gegner-Logik vom Game-Loop braucht und nicht selbst kennt.
 */
export interface LevelEnemyUpdateContext {
  mainEnemy: Enemy;
  miniEnemies: Enemy[];
  /** Aktives (ggf. schon verkleinertes) Feld-Polygon – Bewegungsgrenze. */
  field: Point[];
  /** Aktuelle Spielerposition – Zielpunkt für schiessende Gegner. */
  playerPosition: Point;
  /**
   * Die aktuell gezeichnete Linie (Punktkette inkl. Spielerposition als Kopf),
   * solange der Spieler im `drawing`-Modus ist – sonst `undefined`. Gegner
   * dürfen sie NICHT überqueren (Nutzer-Feedback): sie wirkt für die
   * Gegner-Bewegung wie eine Wand.
   */
  activeLine?: readonly Point[];
  /** Delta-Time dieses Frames (Sekunden). */
  dt: number;
  /**
   * Feuer-Konfiguration von Haupt- bzw. Mini-Gegner aus der Level-Config
   * (`EnemyConfig.shooting`) – `undefined`, wenn der jeweilige Typ nicht
   * schiesst. Durchgereicht statt vom Level selbst gelesen, damit der Updater
   * eine reine Funktion seines Kontexts bleibt (leicht testbar).
   */
  mainEnemyShooting?: ShootingConfig;
  miniEnemyShooting?: ShootingConfig;
  /**
   * `true` in GENAU dem Frame, in dem der Spieler vom Rand abdockt
   * (`isUndocked` false → true) – edge-getriggert, wie der `undock`-Sound in
   * `main.ts`. Level 2 nutzt es, damit der Schlangenkopf beim Abdocken das
   * vorderste Körperglied durch den Mund ausspuckt (siehe
   * `level2/mouthSpit.ts`); die übrigen Level ignorieren das Feld.
   */
  playerJustUndocked?: boolean;
}

/**
 * Aktualisiert die Gegner-Ebene eines Levels für einen Frame: Bewegung +
 * Schiessen. Mutiert die Gegner aus dem Kontext in place und liefert die in
 * diesem Frame neu abgefeuerten Projektile zurück – der Game-Loop hängt sie an
 * seine Projektil-Liste und spielt pro Projektil den Schuss-Sound.
 *
 * Wird pro Frame aus `update()` in `main.ts` aufgerufen
 * (`level.updateEnemies(...)`), aber NUR wenn die Gegner nicht gerade
 * eingefroren sind (Pause-Bonusstein) – das entscheidet der Game-Loop, nicht
 * das Level.
 *
 * Gegenstück zu `LevelEnemyRenderer`: die levelspezifische Gegner-LOGIK
 * (Bewegungsmuster, Feuerverhalten) lebt im jeweiligen `src/levels/<level>/`-
 * Package (`behavior.ts`) statt zentral in `main.ts` – so kann ein Level auch
 * eine ganz andere (z.B. Snake-artige) Bewegung mitbringen.
 */
export type LevelEnemyUpdater = (context: LevelEnemyUpdateContext) => Projectile[];

/** Per-Frame-Zustand für einen rein dekorativen Level-Überzug
 *  (`LevelDecorationRenderer`) – kein Spielzustand, nur Masse + Frame-Zeit
 *  (+ optional Objekte, an die sich ein Effekt hängt). */
export interface LevelDecorationState {
  /** Logische Spielfeldbreite in Pixel. */
  width: number;
  /** Logische Spielfeldhöhe in Pixel. */
  height: number;
  /** Gemeinsame Frame-Wanduhrzeit (`performance.now()`, Millisekunden). */
  now: number;
  /**
   * Aktuell fliegende Gegner-Projektile – nur für Deko-Effekte, die daran
   * hängen (Level 2: Bläschen-Spur hinter dem Torpedo). Fehlt oder leer, wenn
   * gerade keine unterwegs sind.
   */
  enemyProjectiles?: readonly Projectile[];
}

/**
 * Zeichnet einen rein dekorativen Überzug eines Levels – NACH dem Foreground
 * und VOR der Spiel-Ebene, pro Frame aus `render()` in `main.ts` aufgerufen.
 * Für Ambiente ohne jede Spiellogik (z.B. im Wasser-Level 2 aufsteigende
 * Luftblasen). Sollte zustandslos aus `state.now` zeichnen, wie der
 * Bonusstein-Puls und die Bein-Animation – dann braucht es keinen
 * `update()`-Takt und kein Teardown.
 */
export type LevelDecorationRenderer = (
  ctx: CanvasRenderingContext2D,
  state: LevelDecorationState,
) => void;

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
  /**
   * Levelspezifische Gegner-Darstellung, pro Frame vom Game-Loop aufgerufen
   * (siehe `LevelEnemyRenderer`). Liegt im Level-Package (`render.ts`), nicht
   * in `main.ts` – so bleibt die zentrale `render()` frei von den optischen
   * Eigenheiten einzelner Level.
   */
  renderEnemies: LevelEnemyRenderer;
  /**
   * Levelspezifische Gegner-Logik (Bewegung + Schiessen), pro Frame vom
   * Game-Loop aufgerufen (siehe `LevelEnemyUpdater`). Liegt im Level-Package
   * (`behavior.ts`) – Gegenstück zu `renderEnemies`, hält `update()` in
   * `main.ts` frei vom Bewegungsmuster einzelner Level.
   */
  updateEnemies: LevelEnemyUpdater;
  /**
   * Optionaler rein dekorativer Überzug (siehe `LevelDecorationRenderer`) –
   * Ambiente ohne Spiellogik, zwischen Foreground und Spiel-Ebene. Fehlt er,
   * hat das Level keinen.
   */
  renderDecoration?: LevelDecorationRenderer;
  /**
   * Optionaler Effekt-Haken, wenn ein GEGNER-Projektil einschlägt – die
   * Zeichenlinie oder den Spieler getroffen (nicht: aus dem Feld geflogen).
   * `x`/`y` = Einschlagpunkt. Rein visuell/Sound, KEINE Spiellogik (die läuft
   * unabhängig weiter); `main.ts` ruft ihn beim Verbrauch des Projektils auf.
   * Level 2 lässt hier Blasen aufsteigen (`spawnTorpedoBubbleBurst`).
   */
  onEnemyProjectileImpact?: (x: number, y: number) => void;
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
  /**
   * Startet der Spieler in diesem Level bereits mit aktiver Kanone (Nutzer-
   * Feedback), statt sie erst als Bonusstein einsammeln zu müssen? Wirkt wie
   * ein eingesammelter Kanone-Bonus: für das ganze Level aktiv – und dadurch
   * auch der Cyborg-Look, da `cyborgActive` in `main.ts` an einen laufenden
   * Bonus gekoppelt ist. Fehlt das Feld → wie bisher (Kanone nur per Bonus).
   */
  startsWithCannon?: boolean;
  // TODO(später): hier kommen weitere level-spezifische Eigenheiten rein
  // (Bewegungsmuster-Varianten, Spezialverhalten einzelner Level, Power-ups …).
}
