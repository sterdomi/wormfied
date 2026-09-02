import { loadImage, loadLevelImages, type LevelImages } from '../engine/assetLoader';
import { resolveAssetPath } from '../engine/assetPath';
import { createAudioManager } from '../engine/audioManager';
import { setupCanvas } from '../engine/canvas';
import { calculateCanvasScale } from '../engine/canvasScale';
import { createGameLoop } from '../engine/gameLoop';
import { setupInput } from '../engine/input';
import {
  anyUnshieldedEnemyHit,
  ENEMY_TOUCH_RADIUS,
  enemyTouchingLine,
  findPlayerProjectileHittingMiniEnemy,
  projectileIndexHittingUnshieldedPlayer,
  projectileIndexTouchingLine,
} from '../game/collision';
import {
  applyBonusStoneEffect,
  BONUS_STONE_EXPLOSION_COLOR,
  bonusStoneOpacity,
  bonusStoneSoundKey,
  createBonusStoneSpawner,
  isBlockedByBonusStone,
  partitionCapturedBonusStones,
  pruneExpiredBonusStones,
  tickBonusStoneSpawning,
  type BonusStone,
  type BonusStoneType,
} from '../game/bonusStone';
import {
  advanceDrawing,
  EdgeTrigger,
  toggleUndocked,
  tryEnterDrawing,
  type DrawSession,
} from '../game/drawing';
import { createEnemy, type Enemy } from '../game/enemy';
import { enemyMovementMargin, randomDirection } from '../game/enemyMovement';
import {
  createExplosion,
  pruneExplosions,
  renderExplosion,
  type Explosion,
} from '../game/explosion';
import { createRectangularField, type Point } from '../game/field';
import { createForegroundLayer, type ForegroundLayer } from '../game/foregroundLayer';
import { closestPointOnPerimeter } from '../game/geometry';
import { type DrawnLine } from '../game/line';
import { handleLifeLoss } from '../game/lifecycle';
import {
  defeatMiniEnemy,
  partitionCapturedMiniEnemies,
  spawnMiniEnemies,
} from '../game/miniEnemies';
import { Player, playerFacingAngle } from '../game/player';
import {
  createPlayerState,
  decayBoostTimers,
  decayShield,
  SHIELD_DECAY_PER_SECOND,
} from '../game/playerState';
import { movePlayerAlongEdge } from '../game/playerMovement';
import { applyCompletedLine, polygonArea } from '../game/polygon';
import {
  advanceProjectile,
  isProjectileOutOfBounds,
  tickPlayerShooting,
  type Projectile,
} from '../game/projectile';
import {
  enemyOwnArea,
  estimateReachableArea,
  mainEnemyEncirclementScale,
} from '../game/enemyEncirclement';
import {
  applyLevelClearBonus,
  createScoring,
  getClaimedPercentage,
  registerClaim,
  type Scoring,
} from '../game/scoring';
import { advanceSpark, createSpark, type Spark } from '../game/spark';
import {
  bonusStonePulseIntensity,
  createScreenFlash,
  screenFlashOpacity,
  shieldAuraOpacity,
  type ScreenFlash,
} from '../game/visualEffects';
import {
  BONUS_PULSE_COLOR_RGB,
  BONUS_PULSE_GLOW_MAX_ALPHA,
  BONUS_PULSE_GLOW_RADIUS_EXTRA,
  DRAW_PATH_GLOW_ALPHA,
  DRAW_PATH_GLOW_COLOR_RGB,
  DRAW_PATH_GLOW_WIDTH,
  SCREEN_FLASH_COLOR_RGB,
  SCREEN_FLASH_MAX_ALPHA,
  SHIELD_AURA_COLOR_RGB,
  SHIELD_AURA_RADIUS_EXTRA,
} from '../game/visualEffectsConfig';
import { levels } from '../levels';
import { type LevelConfig } from '../levels/types';
import { createHud } from '../ui/hud';
import { setupOrientationWarning } from '../ui/orientationWarning';
import { isTouchCapable } from '../ui/touchControls';
import { t } from '../i18n';
import { fetchTopScores, submitScore } from '../services/leaderboard';
import { getPlayerName } from '../services/playerName';
import '../styles/main.css';

// Abstand des (fest grossen) Spielfelds zu Logo/Rand in "logischen" Pixeln,
// bevor `render()` den gesamten Logo+Feld-Block auf die tatsächliche
// Viewport-Grösse herunterskaliert (siehe dort) – bleibt also bei jeder
// Fenster-/Bildschirmgrösse proportional gleich gross. Später über
// CSS-Variablen / Theme steuerbar.
const FIELD_MARGIN = 40;
/**
 * Feste Spielfeld-Grösse, unabhängig von der Fenstergrösse – ein Resize
 * ändert nur noch, WO das (horizontal zentrierte) Feld gezeichnet wird,
 * nicht mehr seine Grösse oder den Spielzustand (löst die bisherige
 * ÜBERGANGSLÖSUNG aus Instruktion 4 ab, die bei jedem Resize das Feld samt
 * eroberter Fläche zurückgesetzt hat).
 *
 * 16:9-Breitbildformat statt der ursprünglichen 4:3-nahen 800×600
 * (Nutzer-Feedback nach Instruktion 20: auf breiten Phone-Querformaten war
 * der seitliche Letterbox-Rand zu gross, die Touch-Steuerung dort gefühlt
 * beengt) – 960×540 statt exakt proportional hochgerechneter 800×450,
 * damit die Gesamtfläche (und damit Gegnerzahl/-abstände, Bewegungstempo)
 * nah am bisherigen Wert bleibt (518'400 statt 480'000 Px², +8%) UND das
 * Feld dabei spürbar BREITER wird (960 statt 800), nicht primär niedriger.
 */
const FIELD_WIDTH = 960;
const FIELD_HEIGHT = 540;
const COLOR_BACKDROP = '#0b0e14';
const COLOR_FIELD_EDGE = '#3b4252';
const COLOR_HUD = '#e5e9f0';
const COLOR_DRAWING = '#a3be8c';
const COLOR_SPARK = '#8fbcff';
const COLOR_SPARK_CORE = '#eaf3ff';
// Fallback-Textfarbe für den Boot-Fehlerbildschirm (kein Spieler-Bezug mehr,
// seit der Spieler als Sprite statt als Kreis gerendert wird).
const COLOR_ERROR_TEXT = '#bf616a';
/**
 * Spieler-Sprite (Marienkäfer) – nicht Teil von `LevelConfig`, da er über alle
 * Level hinweg gleich aussieht (Instruktion 13).
 */
const PLAYER_ASSET_SRC = '/assets/player.svg';
/**
 * Zweite Bein-Pose für dieselbe Zwei-Bild-Lauf-Animation wie bei den Gegnern
 * (Instruktion 16), im gemeinsamen `WALK_FRAME_INTERVAL_MS`-Takt gewechselt.
 */
const PLAYER_WALK_ASSET_SRC = '/assets/player-walk.svg';
/**
 * "Cyborg"-Variante des Spieler-Sprites (+ Lauf-Pose), solange ein
 * Spezialstein-Effekt aktiv ist (Speed-Boost ODER Kanone, Instruktion 14) –
 * visuelles Feedback, dass der Spieler gerade "aufgerüstet" ist. Wie
 * `PLAYER_ASSET_SRC`/`PLAYER_WALK_ASSET_SRC` levelübergreifend gleich.
 */
const PLAYER_CYBORG_ASSET_SRC = '/assets/player-cyborg.svg';
const PLAYER_WALK_CYBORG_ASSET_SRC = '/assets/player-walk-cyborg.svg';
/** Rendergrösse (Durchmesser) des Spieler-Sprites in Pixel. */
const playerSize = 45;
/**
 * Logo (ersetzt den reinen Textschriftzug oben): ebenfalls levelübergreifend
 * gleich, wie das Spieler-Sprite separat geladen.
 */
const LOGO_ASSET_SRC = '/assets/wormfied-logo.svg';
/** Breite des Logos oben in der Mitte (Höhe ergibt sich aus dem Seitenverhältnis). */
const LOGO_WIDTH = 180;
const LOGO_ASPECT_RATIO = 180 / 640; // viewBox-Verhältnis von wormfied-logo.svg
const LOGO_HEIGHT = LOGO_WIDTH * LOGO_ASPECT_RATIO;
const LOGO_MARGIN_TOP = 10;
/** Abstand Logo-Unterkante zum Spielfeld. */
const LOGO_MARGIN_BOTTOM = 10;
/**
 * Oberer Rand des Spielfelds: muss Platz fürs Logo lassen (sonst ragt es ins
 * Feld hinein) – bewusst grösser als der seitliche/untere `FIELD_MARGIN`.
 */
const FIELD_MARGIN_TOP = LOGO_MARGIN_TOP + LOGO_HEIGHT + LOGO_MARGIN_BOTTOM;
/** Grosses Logo auf dem Startbildschirm (Instruktion: einfacher Startscreen). */
const START_SCREEN_LOGO_WIDTH = 480;
/** Abstand zwischen Logo-Unterkante und dem "Enter"-Hinweis darunter. */
const START_SCREEN_LOGO_GAP = 56;
/** Abstand des kleinen Steuerungs-Hinweises unter dem "Enter"-CTA. */
const START_SCREEN_CONTROLS_GAP = 28;
/** Dezentere Farbe für den Steuerungs-Hinweis, damit der "Enter"-CTA oben führend bleibt. */
const COLOR_START_SCREEN_HINT = '#8a93a6';
/**
 * Kollisions-Toleranzradius für "Gegner/Projektil berührt Spieler direkt"
 * (Instruktion 8/11): an `playerSize` ausgerichtet statt am generischen
 * `ENEMY_TOUCH_RADIUS`, damit der Trefferbereich optisch zur Sprite-Grösse
 * passt.
 */
const PLAYER_HIT_RADIUS = playerSize / 2;
/**
 * Bein-Lauf-Animation für Gegner UND Spieler (Instruktion 16): simpler
 * Sprite-Swap zwischen dem Standbild und einer zweiten Bein-Pose statt
 * prozeduraler Bein-Animation – ein gemeinsamer, wanduhrzeitbasierter Takt
 * für alle (kein Per-Entität-Zustand nötig), analog zum `ScreenFlash`-Timing.
 */
const WALK_FRAME_INTERVAL_MS = 220;
/**
 * Wartezeit nach Levelabschluss, bevor das Highscore-/"Level geschafft"-
 * Overlay erscheint (Nutzer-Feedback): lässt die Explosionen von Haupt- +
 * Mini-Gegnern erst sichtbar ablaufen, bevor sie zugedeckt werden. Etwas
 * über der Explosions-Animationsdauer (`DEFAULT_DURATION_MS` in
 * `explosion.ts`, aktuell 500ms), damit sie sicher fertig ist.
 */
const LEVEL_COMPLETE_REVEAL_DELAY_MS = 700;
/** Mindestabstand der Mini-Gegner-Startpositionen zueinander und zum Hauptgegner. */
const MIN_MINI_SPACING = 70;

/**
 * Statuslampen des Cyborg-Spieler-Sprites (Nutzer-Feedback nach dem
 * Cyborg-Sprite-Feature): NICHT mehr Teil der SVGs selbst (beide
 * `player-cyborg(-walk)?.svg` zeigen an diesen Stellen nur noch eine
 * neutrale dunkle Fassung, siehe dortige Kommentare) – das eigentliche
 * Blinken zeichnet `render()` als eigener Überzug, analog zum
 * Augen-Glow-Überzug der Gegner (`drawEnemySprite`/`enemyEyeGlowBlur` in
 * `src/levels/level1/render.ts`, Instruktion 17, Punkt 4). Grund für die
 * Auslagerung: der bisherige Ansatz
 * (Lampen fix in zwei Sprite-Varianten "an"/"aus" eingebrannt) war 1:1 an
 * den Bein-Wechsel-Takt gekoppelt (`WALK_FRAME_INTERVAL_MS`, 220ms) – zu
 * schnell UND zu klein, um als eigenständiges "Blinken" wahrgenommen zu
 * werden, ging im allgemeinen Sprite-Wechsel-Flackern unter. Ein
 * SVG-`<animate>` für echtes Blinken scheidet aus: `ctx.drawImage()` einer
 * als Canvas-Bildquelle genutzten SVG hält deren SMIL-Animation NICHT am
 * Laufen, sondern friert sie auf einem undefinierten Frame ein (siehe
 * `player-cyborg.svg`). Koordinaten/Radien 1:1 aus den ursprünglich dort
 * eingebrannten `<circle>`-Werten übernommen (viewBox 220, wie die
 * `EyeSpot`s in `src/levels/level1/render.ts`).
 */
interface LampSpot {
  x: number;
  y: number;
  radiusFraction: number;
  color: string;
}
const CYBORG_LAMP_SPOTS: readonly LampSpot[] = [
  { x: 80 / 220 - 0.5, y: 90 / 220 - 0.5, radiusFraction: 10 / 220, color: '#ffca28' },
  { x: 142 / 220 - 0.5, y: 95 / 220 - 0.5, radiusFraction: 9.5 / 220, color: '#00e5ff' },
  { x: 75 / 220 - 0.5, y: 140 / 220 - 0.5, radiusFraction: 11 / 220, color: '#00e5ff' },
  { x: 145 / 220 - 0.5, y: 145 / 220 - 0.5, radiusFraction: 10.5 / 220, color: '#ffca28' },
  { x: 90 / 220 - 0.5, y: 175 / 220 - 0.5, radiusFraction: 8.5 / 220, color: '#ffca28' },
  { x: 132 / 220 - 0.5, y: 178 / 220 - 0.5, radiusFraction: 8.5 / 220, color: '#00e5ff' },
  { x: 74 / 220 - 0.5, y: 0 / 220 - 0.5, radiusFraction: 3.5 / 220, color: '#00e5ff' },
  { x: 146 / 220 - 0.5, y: 0 / 220 - 0.5, radiusFraction: 3.5 / 220, color: '#00e5ff' },
];
/**
 * Deutlich langsamer als `WALK_FRAME_INTERVAL_MS` (220ms) – eigener,
 * unabhängiger Takt, damit das Blinken als solches lesbar bleibt statt im
 * Bein-Wechsel-Flackern unterzugehen.
 */
const CYBORG_LAMP_BLINK_INTERVAL_MS = 500;

const foundCanvas = document.querySelector<HTMLCanvasElement>('#game');
if (!foundCanvas) {
  throw new Error('Canvas-Element #game nicht gefunden.');
}
const gameCanvas: HTMLCanvasElement = foundCanvas;

/**
 * Ein AudioManager fürs ganze Spiel (Instruktion 18) – geladene Sounds und
 * Mute-/Lautstärke-Zustand müssen über Startbildschirm ↔ Partie-Wechsel
 * (`boot`s Schleife) hinweg erhalten bleiben, deshalb Modul-Singleton statt
 * pro `start()`-Aufruf neu erzeugt.
 */
const audioManager = createAudioManager();

// Läuft für die gesamte Seiten-Lebensdauer, unabhängig vom Start-/Game-Over-
// Zyklus (nichts zu `dispose()`n) – Nutzer-Feedback: Wormfied ist fürs
// Querformat gedacht.
setupOrientationWarning();

/**
 * Service Worker registrieren (Instruktion 20, Punkt 2) – cached die
 * Kern-Assets für Offline-Fähigkeit + schnelleren Wiederaufruf, siehe
 * `public/sw.js` für die Cache-Strategie und deren Begründung.
 * `resolveAssetPath` löst den Pfad gegen die Vite-`base` auf (Subpath-Build,
 * siehe `assetPath.ts`) – der Scope des Workers ist dadurch automatisch
 * korrekt auf das Verzeichnis von `sw.js` beschränkt.
 *
 * NUR im Produktions-Build (`import.meta.env.PROD`) – der Vite-Dev-Server
 * liefert bei `npm run dev` ohnehin jede Datei frisch von der Platte, ein
 * dort zusätzlich registrierter Service Worker würde Bilder/Sounds aber
 * Cache-first ausliefern und damit genau die "ich sehe meine Änderung
 * nicht"-Falle aus der Produktion unnötig auch lokal aufmachen.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(resolveAssetPath('/sw.js')).catch((err: unknown) => {
      console.error('Service-Worker-Registrierung fehlgeschlagen:', err);
    });
  });
}

/** Pfad je Sound-Key – liegt unter `public/assets/sound/` (nicht `sounds/`,
 *  siehe Abschluss-Bericht). `pickup_generic.wav`/`pickup.wav` jetzt für die
 *  Pause-/Bombe-Bonussteine reserviert (Nutzer-Feedback) – zuvor ungenutzt. */
const SOUND_SOURCES: Record<string, string> = {
  undock: '/assets/sound/undock.wav',
  dock: '/assets/sound/dock.wav',
  draw_loop: '/assets/sound/draw_loop.wav',
  player_cannon_shot: '/assets/sound/player_cannon_shot.wav',
  enemy_shot: '/assets/sound/enemy_shot.wav',
  mini_enemy_explosion: '/assets/sound/mini_enemy_explosion.wav',
  main_enemy_explosion: '/assets/sound/main_enemy_explosion.wav',
  pickup_speed: '/assets/sound/pickup_speed.wav',
  pickup_cannon: '/assets/sound/pickup_cannon.wav',
  pickup_generic: '/assets/sound/pickup_generic.wav',
  pickup: '/assets/sound/pickup.wav',
  life_loss: '/assets/sound/life_loss.wav',
  game_over: '/assets/sound/game_over.wav',
  level_complete: '/assets/sound/level_complete.wav',
};

/** Basis-Sound-Key für die levelspezifische Hintergrundmusik (`level.musicSrc`). */
const MUSIC_SOUND_KEY = 'music';
/**
 * Konkreter Musik-Key je Level – eigener Key pro Level-`id`, damit ein
 * Levelwechsel die Musik des vorigen Levels nicht überschreibt (die Buffer
 * bleiben unter ihrem Key geladen, ein wiederholtes Level spielt sofort weiter).
 */
function levelMusicKey(level: LevelConfig): string {
  return `${MUSIC_SOUND_KEY}:${level.id}`;
}

/** Pfad des levelspezifischen Schuss-Sounds (`shooting.soundSrc`), falls
 *  einer gesetzt ist – Hauptgegner hat Vorrang vor den Mini-Gegnern. */
function levelEnemyShotSrc(level: LevelConfig): string | undefined {
  return level.mainEnemy.shooting?.soundSrc ?? level.miniEnemies.config.shooting?.soundSrc;
}
/**
 * Sound-Key für den Gegner-Schuss dieses Levels: ein eigener Key pro Level-`id`
 * (analog `levelMusicKey`), sobald `shooting.soundSrc` gesetzt ist – sonst der
 * globale `enemy_shot`-SFX aus `SOUND_SOURCES`.
 */
function enemyShotSoundKey(level: LevelConfig): string {
  return levelEnemyShotSrc(level) ? `enemy_shot:${level.id}` : 'enemy_shot';
}
/** Deutlich leiser als die SFX, damit sie im Hintergrund bleibt (Nutzer-Feedback: nochmals 30% leiser als zuvor, 0.35 → 0.245). */
const MUSIC_VOLUME = 0.245;

/** Einfacher "Lädt …"-Zustand, bevor die Level-Assets da sind. */
function showLoading(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.fillStyle = COLOR_BACKDROP;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = COLOR_HUD;
  ctx.font = '20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t('loading'), canvas.width / 2, canvas.height / 2);
}

/** Zeichnet einen Frame des Startbildschirms: grosses Logo + Enter-Hinweis. */
function renderStartScreen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  logoImage: HTMLImageElement,
): void {
  ctx.fillStyle = COLOR_BACKDROP;
  ctx.fillRect(0, 0, width, height);

  const logoWidth = Math.min(START_SCREEN_LOGO_WIDTH, width * 0.85);
  const logoHeight = logoWidth * LOGO_ASPECT_RATIO;
  const blockHeight = logoHeight + START_SCREEN_LOGO_GAP;
  const top = (height - blockHeight) / 2;

  ctx.drawImage(logoImage, (width - logoWidth) / 2, top, logoWidth, logoHeight);

  ctx.fillStyle = COLOR_HUD;
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const enterHintY = top + logoHeight + START_SCREEN_LOGO_GAP / 2;
  ctx.fillText(t('pressEnterToPlay'), width / 2, enterHintY);

  // Kleiner Steuerungs-Hinweis, dezenter als der Haupt-CTA oben – nur die
  // fürs aktuelle Gerät passende Zeile (Nutzer-Feedback: nicht beide).
  ctx.fillStyle = COLOR_START_SCREEN_HINT;
  ctx.font = '16px system-ui, sans-serif';
  const controlsHint = isTouchCapable() ? t('controlsHintTouch') : t('controlsHintDesktop');
  ctx.fillText(controlsHint, width / 2, enterHintY + START_SCREEN_CONTROLS_GAP);
}

/**
 * Startbildschirm: grosses Logo, wartet auf Enter (steigende Flanke, wie der
 * Neustart-Trigger nach Game Over). Löst danach eigenen Canvas-/Input-Setup
 * wieder auf – `start()` richtet für das eigentliche Spiel sein eigenes ein.
 */
function showStartScreen(canvas: HTMLCanvasElement, logoImage: HTMLImageElement): Promise<void> {
  return new Promise((resolve) => {
    const view = setupCanvas(canvas);
    const input = setupInput();
    const enterTrigger = new EdgeTrigger();

    const loop = createGameLoop(view.ctx, {
      update: () => {
        input.tick();
        if (enterTrigger.pressed(input.state.restart)) {
          loop.stop();
          input.dispose();
          view.dispose();
          resolve();
        }
      },
      render: (ctx) => renderStartScreen(ctx, view.width, view.height, logoImage),
    });
    loop.start();
  });
}

/**
 * Was ein abgeschlossenes Level ins nächste mitnimmt (Nutzer-Feedback: Score
 * und Leben laufen über den Levelwechsel weiter). Das Schild dagegen startet
 * pro Level frisch bei `STARTING_SHIELD`.
 */
interface LevelCarryOver {
  score: number;
  lives: number;
}

/**
 * Ergebnis eines `start()`-Laufs – sagt `boot()`, wie es weitergeht:
 * `toStartScreen` nach Game Over (zurück zum Startbildschirm, wieder ab
 * Level 1), `nextLevel` nach Levelabschluss + Enter (ohne Startbildschirm
 * direkt ins nächste Level – bei nur einem Level eine Wiederholung), samt
 * dem Score-/Leben-Stand, den das nächste Level übernimmt.
 */
type StartOutcome =
  | { kind: 'toStartScreen' }
  | { kind: 'nextLevel'; carryOver: LevelCarryOver };

/**
 * Startet eine Partie mit `level`. Löst mit `toStartScreen` auf, sobald nach
 * einem Game Over Enter gedrückt wird; mit `nextLevel`, sobald nach dem
 * Levelabschluss-Overlay Enter gedrückt wird. In beiden Fällen ist die Partie
 * vorher sauber abgebaut
 * (`teardown`), den weiteren Ablauf (nächstes Level / Startbildschirm)
 * steuert `boot()`.
 *
 * `carryOver` (aus dem `nextLevel`-Ergebnis des vorigen Levels) hebt Score
 * und Leben auf deren Endstand an; `null` = frische Partie (Startwerte).
 */
function start(
  canvas: HTMLCanvasElement,
  level: LevelConfig,
  assets: LevelImages,
  playerImage: HTMLImageElement,
  playerWalkImage: HTMLImageElement,
  playerCyborgImage: HTMLImageElement,
  playerWalkCyborgImage: HTMLImageElement,
  logoImage: HTMLImageElement,
  carryOver: LevelCarryOver | null,
): Promise<StartOutcome> {
  // Wird synchron im Promise-Executor unten zugewiesen (läuft vor jedem
  // anderen Code in dieser Funktion) – die Definite-Assignment-Assertion ist
  // hier sicher, TypeScript kennt das Ausführungsverhalten des
  // Promise-Konstruktors selbst aber nicht.
  let resolveStart!: (outcome: StartOutcome) => void;
  const donePromise = new Promise<StartOutcome>((resolve) => {
    resolveStart = resolve;
  });

  const player = new Player();
  const playerState = createPlayerState();
  // Kanal für abgeschlossene Linien aus `advanceDrawing`; sie werden noch im
  // selben Frame verarbeitet (Feld-Split) und danach aus der Liste entfernt.
  const completedLines: DrawnLine[] = [];
  let session: DrawSession | null = null;
  // Loop-Sound während `mode === 'drawing'` (Instruktion 18, Punkt 3) – Node
  // gehalten, um ihn gezielt zu stoppen (beim Andocken oder Lebensverlust
  // mitten im Zeichnen); `null` solange keiner läuft (auch Guard gegen
  // doppeltes Starten).
  let drawLoopNode: AudioBufferSourceNode | null = null;
  // Hintergrundmusik-Loop dieser Partie (levelspezifisch, `level.musicSrc`) –
  // einmal gestartet, läuft über einen kompletten `start()`-Aufruf durch.
  // `teardown()` stoppt sie; der nächste Level-/Partie-Start setzt sie neu an.
  let musicNode: AudioBufferSourceNode | null = null;
  // Stromball, der bei Gegner-Linien-Kontakt Richtung Spieler fährt (nur einer
  // gleichzeitig, lebt so lange wie die aktuelle Zeichen-Session).
  let spark: Spark | null = null;
  // Foreground-Pixelzustand beim Start des aktuellen Zeichenversuchs – zum
  // Rückgängigmachen bei einer Kollision (Punkt 1, Instruktion 8).
  let foregroundSnapshot: ImageData | null = null;
  // Screen-Flash bei Lebensverlust (Instruktion 17, Punkt 5) – strukturell
  // wie `Explosion` (Instruktion 12), `null` solange keiner läuft.
  let screenFlash: ScreenFlash | null = null;
  // Levelabschluss (Nutzer-Feedback): das Highscore-/"Level geschafft"-Overlay
  // soll die Explosionen von Haupt- + Mini-Gegnern nicht sofort zudecken.
  // `scoring.isLevelComplete` friert die Spiellogik schon beim Treffer ein
  // (Explosionen laufen über `pruneExplosions` weiter), das Overlay selbst
  // erscheint erst `LEVEL_COMPLETE_REVEAL_DELAY_MS` später. `null` = kein
  // Overlay ausstehend.
  let levelCompleteRevealAt: number | null = null;
  let pendingLevelCompletePercent = 0;
  // Enter löst nur auf seiner steigenden Flanke aus (Leertaste liefert das
  // seit Instruktion 15 bereits fertig über `input.state.drawJustPressed`).
  // `let` statt `const` (Nutzer-Feedback): wird beim Eintritt in Game Over
  // ODER Level Complete durch eine frische Instanz ersetzt, siehe dort.
  let restartTrigger = new EdgeTrigger();

  const hud = createHud((muted) => audioManager.setMuted(muted));

  let field: Point[] = createRectangularField(1, 1);
  let foreground: ForegroundLayer = createForegroundLayer(assets.foreground, 1, 1);
  let scoring: Scoring = createScoring(0);
  let mainEnemy: Enemy = createEnemy({ x: 0, y: 0 }, level.mainEnemy);
  let miniEnemies: Enemy[] = [];
  let projectiles: Projectile[] = [];
  let explosions: Explosion[] = [];
  let bonusStones: BonusStone[] = [];
  const bonusSpawner = createBonusStoneSpawner();
  // Spieler-Projektile (Kanone-Bonus, Instruktion 14) – eigene Liste, klar
  // getrennt von den Gegner-Projektilen (`projectiles`).
  let playerProjectiles: Projectile[] = [];
  // Gecachter, unscharf gezeichneter Viewport-Hintergrund (Instruktion 20,
  // Nutzer-Feedback nach dem ersten iPhone-Test: der fixe 4:3-nahe
  // Feld-Block lässt auf einem breiten Phone-Querformat grosse, komplett
  // leere schwarze Balken seitlich übrig) – siehe `getBackdrop` unten.
  let backdropCache: { width: number; height: number; canvas: HTMLCanvasElement } | null = null;
  // Render-Skalierungsfaktor des Hauptgegners (Nutzer-Feedback: schrumpft nur,
  // wenn die für IHN tatsächlich erreichbare Fläche knapp wird, nicht schon
  // bei irgendeiner Eroberung irgendwo im Feld) – NUR bei einer echten
  // Feldänderung oder einem besiegten Mini-Gegner neu berechnet
  // (`recomputeMainEnemyEncirclementScale`), nicht pro Frame, siehe
  // Docstring in `enemyEncirclement.ts`.
  let mainEnemyEncirclementScaleValue = 1;

  /**
   * Aktualisiert `mainEnemyEncirclementScaleValue` anhand der aktuellen
   * `field`/`mainEnemy`-Position – siehe `enemyEncirclement.ts`.
   *
   * Nutzer-Feedback ("verschärfe Voraussetzungen"): schrumpft NUR, solange
   * ausserdem `miniEnemies` leer ist (alle Mini-Gegner besiegt) – bleibt
   * sonst unabhängig von der Fläche bei voller Grösse. Diese Bedingung
   * gehört bewusst hierher (Spielzustand des laufenden Levels), nicht in
   * die reine `mainEnemyEncirclementScale`-Funktion in `enemyEncirclement.ts`.
   */
  function recomputeMainEnemyEncirclementScale(): void {
    if (miniEnemies.length > 0) {
      mainEnemyEncirclementScaleValue = 1;
      return;
    }
    const margin = enemyMovementMargin(mainEnemy);
    const reachableArea = estimateReachableArea(field, mainEnemy.position, margin);
    mainEnemyEncirclementScaleValue = mainEnemyEncirclementScale(
      reachableArea,
      enemyOwnArea(mainEnemy.size),
    );
  }

  /** Level-Initialisierung (Neustart-Pfad nutzt sie ebenfalls). Feste
   *  Grösse (`FIELD_WIDTH`/`FIELD_HEIGHT`) – ein Fenster-Resize ruft das
   *  NICHT mehr auf, siehe `setupCanvas`-Aufruf unten. */
  function rebuildField(): Point[] {
    field = createRectangularField(FIELD_WIDTH, FIELD_HEIGHT);
    if (player.mode === 'onEdge') player.syncPosition(field);
    // Foreground zurück auf das Originalbild (neu aufgebauter Offscreen-Canvas).
    foreground = createForegroundLayer(assets.foreground, FIELD_WIDTH, FIELD_HEIGHT);
    // Gesamtfläche des Levels einmal festhalten (Basis für die Erobert-Anzeige).
    scoring = createScoring(polygonArea(field));
    hud.setClaimedPercentage(0);
    hud.setScore(0);
    hud.setLevelComplete(false);
    // Hauptgegner in die Feldmitte, Mini-Gegner zufällig verteilt (Mindestabstand
    // zueinander und zum Hauptgegner + Spieler-Start).
    mainEnemy = createEnemy(
      { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 },
      level.mainEnemy,
      randomDirection(),
    );
    miniEnemies = spawnMiniEnemies(
      field,
      level.miniEnemies.count,
      level.miniEnemies.config,
      [mainEnemy.position, player.position],
      MIN_MINI_SPACING,
    );
    projectiles = [];
    explosions = [];
    bonusStones = [];
    bonusSpawner.timeSinceLastSpawn = 0;
    playerProjectiles = [];
    recomputeMainEnemyEncirclementScale();
    return field;
  }

  /**
   * Eine abgeschlossene Linie ins Feld einrechnen: Polygon splitten, eroberte
   * Seite bestimmen, aktives Feld + Spieler-Randzustand aktualisieren, die
   * gesamte eroberte Fläche aus dem Foreground entfernen und die
   * Prozentanzeige nachziehen.
   */
  function handleCompletedLine(linePoints: Point[]): void {
    // Die Seite MIT dem HAUPTgegner bleibt aktives Feld; die andere gilt als
    // erobert. Mini-Gegner beeinflussen das nicht.
    const result = applyCompletedLine(field, linePoints, mainEnemy.position);
    field = result.active;
    player.segmentIndex = result.playerSegmentIndex;
    player.segmentProgress = result.playerSegmentProgress;
    player.syncPosition(field);
    foreground.carveRegion(result.claimed);

    // Mini-Gegner, die in der eroberten Fläche liegen, sind "gefangen": Bonus-
    // Punkte + eine Explosion an ihrer letzten Position (Instruktion 12).
    const { survivors, captured } = partitionCapturedMiniEnemies(miniEnemies, result.claimed);
    miniEnemies = survivors;
    for (const enemy of captured) {
      defeatMiniEnemy(enemy, scoring, explosions, level.scoring);
      audioManager.play('mini_enemy_explosion');
    }

    // Bonussteine, die in der eroberten Fläche liegen, sind ebenfalls
    // "gefangen": Effekt aktivieren + Aufnahme-Explosion in typspezifischer
    // Farbe (Instruktion 14, Punkt 6).
    const bonusCapture = partitionCapturedBonusStones(bonusStones, result.claimed);
    bonusStones = bonusCapture.survivors;
    for (const stone of bonusCapture.captured) {
      if (stone.type === 'bomb') {
        // Bombe (Nutzer-Feedback): besiegt SOFORT alle aktuell vorhandenen
        // Mini-Gegner – wirkt auf die Gegner-Liste, nicht auf `playerState`,
        // daher hier statt in `applyBonusStoneEffect` behandelt (siehe
        // Kommentar dort).
        for (const enemy of miniEnemies) {
          defeatMiniEnemy(enemy, scoring, explosions, level.scoring);
        }
        if (miniEnemies.length > 0) audioManager.play('mini_enemy_explosion');
        miniEnemies = [];
      } else {
        applyBonusStoneEffect(stone, playerState, level.bonusStones);
      }
      explosions.push(createExplosion(stone.position, BONUS_STONE_EXPLOSION_COLOR[stone.type]));
      audioManager.play(bonusStoneSoundKey(stone.type));
    }
    // Neues Feld kann dem Hauptgegner plötzlich mehr oder weniger Raum lassen,
    // UND das Einschliessen (oder die Bombe oben) kann gerade den letzten
    // Mini-Gegner besiegt haben (Nutzer-Feedback, siehe `enemyEncirclement.ts`)
    // – deshalb NACH beiden Capture-Schleifen, nur hier + in `rebuildField` +
    // beim Erschiessen eines Mini-Gegners neu berechnet, nicht pro Frame.
    recomputeMainEnemyEncirclementScale();

    scoring.claimedArea += result.claimedArea;
    const percent = getClaimedPercentage(scoring.claimedArea, scoring.totalFieldArea);
    hud.setClaimedPercentage(percent);

    // Punkte proportional zur neu eroberten Fläche + daraus resultierende
    // Extra-Leben + 80%-Levelabschluss.
    const outcome = registerClaim(scoring, result.claimedArea);
    if (outcome.extraLives > 0) {
      playerState.lives += outcome.extraLives; // kein Cap – bewusst (Arcade-Mechanik)
      hud.setLives(playerState.lives);
      hud.flashLives();
    }

    // Levelabschluss-Bonus (Aufräum-Bonus + Prozent-Bonus + Extra-Leben ab
    // 99 %): `applyLevelClearBonus` feuert nur beim false→true-Übergang (siehe
    // dortiger Kommentar), also genau einmal, auch falls dieser Frame-Handler
    // danach nochmal liefe.
    const bonus = applyLevelClearBonus(
      scoring,
      outcome.levelJustCompleted,
      miniEnemies.length,
      percent,
      level.scoring,
    );
    if (bonus) {
      explosions.push(createExplosion(mainEnemy.position));
      for (const enemy of miniEnemies) explosions.push(createExplosion(enemy.position));
      miniEnemies = [];
      audioManager.play('main_enemy_explosion');
      // Extra-Leben für einen Beinahe-Perfekt-Abschluss (Nutzer-Feedback: erst
      // ab 99 %) – zusätzlich zu den score-schwellenbasierten Extra-Leben aus
      // `registerClaim` oben.
      if (bonus.extraLife) {
        playerState.lives += 1; // kein Cap – bewusst (Arcade-Mechanik)
        hud.setLives(playerState.lives);
        hud.flashLives();
      }
      // Overlay + Sieges-Sound erst nach der Explosions-Animation (siehe
      // `LEVEL_COMPLETE_REVEAL_DELAY_MS`), nicht sofort – `update()` löst das
      // aus, sobald die Wartezeit um ist.
      levelCompleteRevealAt = performance.now() + LEVEL_COMPLETE_REVEAL_DELAY_MS;
      pendingLevelCompletePercent = percent;
      // Nutzer-Feedback: ein beim Levelabschluss noch gehaltener Neustart-
      // Knopf (Enter, oder – auf Touch-Geräten – Joystick/Action-Button, die
      // sich ihr rohes "gehalten"-Bit mit `restart` teilen, siehe `input.ts`)
      // durfte NICHT sofort als frischer Druck fürs "nächstes Level"-Overlay
      // zählen – sonst raste das Overlay quasi unsichtbar durch, sobald die
      // Wartezeit um war. Frischer Trigger: zählt erst wieder nach einem
      // echten Loslassen + neuem Druck (siehe `EdgeTrigger`).
      restartTrigger = new EdgeTrigger();
    }
    hud.setScore(scoring.score);
  }

  /**
   * Lebensverlust-Ablauf (Gegner berührt aktive Linie ODER ungeschützten
   * Spieler auf dem Rand): laufenden Zeichenversuch rückgängig machen, Leben
   * abziehen, Schild auffüllen, ggf. Game Over, kurzes visuelles Feedback.
   */
  function loseLife(): void {
    if (session) {
      // Pfadbasiert ausgeschnittenen Foreground dieses Versuchs wiederherstellen.
      if (foregroundSnapshot) foreground.restore(foregroundSnapshot);
      const snap = closestPointOnPerimeter(field, session.line.points[0]);
      player.segmentIndex = snap.segmentIndex;
      player.segmentProgress = snap.progress;
      player.position = { x: snap.point.x, y: snap.point.y };
      session = null;
      // Zeichnen-Loop-Sound beenden (Instruktion 18, Punkt 3): Lebensverlust
      // mitten im Zeichnen reisst den Spieler ebenfalls aus `drawing` heraus.
      audioManager.stop(drawLoopNode);
      drawLoopNode = null;
    }
    spark = null;
    projectiles = []; // Gefahr zurücksetzen – keine noch fliegenden Kugeln
    foregroundSnapshot = null;
    player.mode = 'onEdge';
    // Wie beim automatischen Andocken (Instruktion 15, Punkt 6) – der
    // erzwungene Rand-Reset nach Lebensverlust ist ebenfalls ein Rückkehr zu
    // `onEdge` und sollte den Spieler nicht weiter "scharf" abgedockt lassen.
    player.isUndocked = false;

    handleLifeLoss(playerState);
    hud.setLives(playerState.lives);
    hud.setShield(playerState.shield);
    screenFlash = createScreenFlash();
    audioManager.play('life_loss');

    if (playerState.isGameOver) {
      const finalScore = scoring.score;
      hud.setGameOver(true, finalScore);
      audioManager.play('game_over');
      // Frischer Trigger (Nutzer-Feedback, wie beim Levelabschluss oben):
      // ein beim Sterben noch gehaltener Neustart-Knopf darf nicht sofort
      // als Bestätigung fürs Game-Over-Overlay zählen.
      restartTrigger = new EdgeTrigger();

      // Globale Bestenliste (Nutzer-Wunsch): Score erst übermitteln, DANN
      // laden – sonst könnte die frisch übermittelte eigene Platzierung in
      // der angezeigten Top 10 fehlen. Bewusst "fire-and-forget" (kein
      // `await`): ein langsames/fehlgeschlagenes Firestore-Netzwerk darf den
      // synchronen Game-Loop nicht blockieren, siehe `services/leaderboard.ts`.
      const playerName = getPlayerName();
      void submitScore(playerName, finalScore)
        .then(() => fetchTopScores())
        .then((entries) => {
          hud.setLeaderboard(entries, { name: playerName, score: Math.round(finalScore) });
        });
    }
  }

  // Kein `onResize`-Handler mehr: die Feldgrösse ist fix, ein Resize
  // ändert nur `view.width`/`view.height` (für Hintergrund-Füllung und
  // Zentrierung in `render`), nicht mehr den Spielzustand.
  const view = setupCanvas(canvas);
  const input = setupInput();
  rebuildField();
  if (carryOver) {
    // Score + Leben laufen über den Levelwechsel weiter (Nutzer-Feedback) –
    // `rebuildField` bzw. `createPlayerState` starten sie bei 0 / STARTING_LIVES,
    // hier auf den Endstand des vorigen Levels gehoben. Das Schild bleibt
    // bewusst frisch (`STARTING_SHIELD`).
    scoring.score = carryOver.score;
    playerState.lives = carryOver.lives;
  }
  if (level.startsWithCannon) {
    // Level-Startausrüstung (Nutzer-Feedback): Kanone von Anfang an aktiv –
    // `Infinity` fürs ganze Level, genau wie ein eingesammelter Kanone-Bonus
    // (`applyBonusStoneEffect`). Der Cyborg-Look kommt automatisch mit, da
    // `cyborgActive` unten an `cannonRemainingSeconds > 0` hängt.
    playerState.cannonRemainingSeconds = Infinity;
  }
  hud.setScore(scoring.score);
  hud.setLives(playerState.lives);
  hud.setShield(playerState.shield);

  document.title = t('gameTitle');

  function update(dt: number): void {
    // Berechnet `drawJustPressed` für diesen Frame (Flankenerkennung) – muss
    // VOR jedem Lesen von `input.state.drawJustPressed` laufen, auch während
    // eines Freezes unten, damit kein "gehalten seit dem Einfrieren"-Rest
    // beim Auftauen fälschlich als frischer Druck zählt.
    input.tick();
    const restartPressed = restartTrigger.pressed(input.state.restart);

    // Explosions-/Flash-Fortschritt hängt an `performance.now()`, nicht an
    // `dt` – dieser Aufräumschritt läuft deshalb bewusst VOR den
    // Freeze-Checks unten, damit der Levelabschluss-Bonus (Instruktion 12)
    // auch bei eingefrorenem Game-Loop sichtbar zu Ende animiert.
    explosions = pruneExplosions(explosions, performance.now());
    if (screenFlash && screenFlashOpacity(screenFlash, performance.now()) <= 0) {
      screenFlash = null;
    }

    if (playerState.isGameOver) {
      // Keine Spieler-/Gegnerbewegung mehr – zurück zum Startbildschirm erst
      // per Enter/Neustart-Taste (Nutzer-Feedback: kein automatisches
      // Wegnavigieren mehr, u.a. weil das die globale Bestenliste abschnitt,
      // falls deren Firestore-Abfrage noch lief, siehe `loseLife`).
      if (restartPressed) {
        teardown();
        resolveStart({ kind: 'toStartScreen' });
      }
      return;
    }

    // Level-Complete-Check nur, wenn nicht bereits Game Over (schliessen sich
    // gegenseitig aus). Auch hier alles eingefroren bis Enter.
    if (scoring.isLevelComplete) {
      if (levelCompleteRevealAt !== null) {
        // Noch in der Wartephase (Explosionen laufen sichtbar, siehe oben in
        // `update` `pruneExplosions`) – Overlay/Sound erst danach, Restart in
        // dieser Phase bewusst ignoriert.
        if (performance.now() >= levelCompleteRevealAt) {
          levelCompleteRevealAt = null;
          hud.setLevelComplete(true, pendingLevelCompletePercent, scoring.score);
          audioManager.play('level_complete');
        }
        return;
      }
      // Levelabschluss bestätigt: Partie abbauen, den weiteren Ablauf
      // (nächstes Level, ohne Startbildschirm) übernimmt `boot()`. Score +
      // Leben (inkl. Levelabschluss-Bonus, der schon in `scoring.score`
      // steckt) wandern als `carryOver` mit.
      if (restartPressed) {
        teardown();
        resolveStart({
          kind: 'nextLevel',
          carryOver: { score: scoring.score, lives: playerState.lives },
        });
      }
      return;
    }

    // Boost-Timer laufen unabhängig vom Modus herunter (Instruktion 14).
    decayBoostTimers(playerState, dt);
    const speedMultiplier =
      playerState.speedBoostRemainingSeconds > 0 ? level.bonusStones.speedBoost.speedMultiplier : 1;

    const prevPos = { x: player.position.x, y: player.position.y };
    // Ob der befahrene Pfad diesen Frame ausgeschnitten werden soll: nur wenn
    // der Spieler sich wirklich vom Rand gelöst hat (vor ODER nach dem Schritt).
    let carve = session?.hasLeftEdge === true;
    // `true` nur in dem Frame, in dem der Spieler tatsächlich losfährt (Rand
    // verlässt, `onEdge` → `drawing`) – edge-getriggert, geht so an
    // `level.updateEnemies` (Level 2: Kopf spuckt dann ein Körperglied aus).
    // Bewusst NICHT an den `isUndocked`-Toggle gekoppelt (siehe unten): der
    // Kanone-Schuss vom Rand aus (Nutzer-Feedback) nutzt dieselbe Taste und
    // würde sonst schon beim reinen Zielen/Schiessen ohne Losfahren feuern.
    let playerJustUndocked = false;
    // `true` in dem Frame, in dem ein vollständiger Rückzug den Foreground-
    // Schnappschuss wiederherstellt (siehe unten) – unterdrückt dann den
    // finalen `carvePath`-Aufruf weiter unten, der sonst genau diesen Frame
    // wieder ein kleines Stück "Spur" auf den frisch wiederhergestellten
    // Foreground carven würde.
    let retreatCancelledDrawing = false;

    if (player.mode === 'onEdge') {
      // Andock/Abdock-Toggle (Instruktion 15): ändert nur `isUndocked`, keine
      // Positionsänderung. Der eigentliche Übergang zu `drawing` passiert erst
      // bei tatsächlicher Richtungseingabe nach innen, siehe `tryEnterDrawing`.
      const wasUndocked = player.isUndocked;
      toggleUndocked(player, input.state.drawJustPressed);
      // Nur beim tatsächlichen Abdocken (false → true) – nicht beim Abbrechen
      // (true → false), dafür ist kein eigener Sound vorgesehen. Rein optisch/
      // akustisch – NICHT dasselbe wie `playerJustUndocked` unten, das den
      // ausschliesslich mit der Kanone verwendeten Taste teilt (siehe oben).
      if (!wasUndocked && player.isUndocked) audioManager.play('undock');

      session = tryEnterDrawing(player, field, input.state);
      // Erst hier, NACH `tryEnterDrawing`, tatsächlich `true`: der Spieler
      // fährt diesen Frame wirklich ins Feld, nicht bloss der Tastendruck, der
      // (vom Rand aus) auch nur die Kanone abfeuern könnte.
      playerJustUndocked = session !== null;
      if (session) {
        // Zeichenversuch beginnt: Foreground-Zustand sichern (Rückgängig bei Kollision).
        foregroundSnapshot = foreground.snapshot();
        // Zeichnen-Loop starten (Instruktion 18, Punkt 3) – der `!drawLoopNode`-
        // Guard verhindert ein doppeltes Starten, falls dieser Zweig aus
        // irgendeinem Grund mehrfach durchlaufen würde.
        if (!drawLoopNode) drawLoopNode = audioManager.play('draw_loop', { loop: true });
      } else {
        movePlayerAlongEdge(player, field, input.state, dt, speedMultiplier);
      }
    }

    if (player.mode === 'drawing') {
      if (!session) {
        player.mode = 'onEdge'; // defensiv, z.B. nach HMR
        foregroundSnapshot = null;
        spark = null;
      } else {
        const before = completedLines.length;
        const isBlockedByStone = (p: Point): boolean =>
          isBlockedByBonusStone(bonusStones, p, level.bonusStones.spawning.radius);
        if (
          advanceDrawing(
            session,
            player,
            field,
            input.state,
            dt,
            completedLines,
            isBlockedByStone,
            speedMultiplier,
          )
        ) {
          session = null;
          spark = null; // erreicht → der Spieler ist dem Stromball entkommen
          // Automatisches Andocken (Instruktion 15, Punkt 6): `advanceDrawing`
          // liefert hier `true`, wenn entweder der Rand erreicht (Split) ODER
          // der Spieler seine eigene Linie bis zum Ausgangspunkt zurückgefahren
          // ist (Nutzer-Feedback, kein Split – siehe unten).
          audioManager.stop(drawLoopNode);
          drawLoopNode = null;
          audioManager.play('dock');
          // Neu abgeschlossene Linie(n) sofort verarbeiten und aus dem Kanal
          // nehmen (nach dem Split sind sie Teil der Feld-Polygon-Kanten).
          const newlyCompleted = completedLines.splice(before);
          if (newlyCompleted.length > 0) {
            newlyCompleted.forEach((line) => handleCompletedLine(line.points));
          } else if (foregroundSnapshot) {
            // Kein Split, sondern ein vollständiger Rückzug bis zum
            // Ausgangspunkt: den pfadbasiert ausgeschnittenen Foreground
            // dieses Versuchs wiederherstellen (Nutzer-Feedback) – sonst
            // bleiben unschöne "Spuren" ohne jede Funktion zurück, obwohl
            // nichts abgetrennt wurde. Gleiches Vorgehen wie bei `loseLife`.
            foreground.restore(foregroundSnapshot);
            retreatCancelledDrawing = true;
          }
          foregroundSnapshot = null; // Versuch beendet (Split, Rückzug oder blosses Andocken)
          // 80% erreicht -> Level eingefroren, Rest dieses Frames überspringen.
          if (scoring.isLevelComplete) return;
        }
      }
    }

    carve = carve || session?.hasLeftEdge === true;
    if (
      carve &&
      !retreatCancelledDrawing &&
      (prevPos.x !== player.position.x || prevPos.y !== player.position.y)
    ) {
      // Pfadbasiertes Ausschneiden (Übergangslösung, siehe foregroundLayer.ts):
      // Instruktion 5 ergänzt das um polygon-exaktes Flächen-Ausschneiden.
      foreground.carvePath(prevPos.x, prevPos.y, player.position.x, player.position.y);
    }

    // Alle Gegner (Hauptgegner + Mini-Gegner) für Kollisionen als eine Liste
    // behandeln – Mini-Gegner sind gleichwertig gefährlich.
    let allEnemies = [mainEnemy, ...miniEnemies];
    // Pause-Bonusstein (Nutzer-Feedback): solange aktiv, bewegen sich Gegner
    // nicht und schiessen nicht – bleiben aber als Hindernis an ihrer
    // Position bestehen (Kollisionen unten laufen unverändert weiter).
    const enemiesFrozen = playerState.enemyFreezeRemainingSeconds > 0;
    if (!enemiesFrozen) {
      // Bewegung + Schiessen sind levelspezifisch und liegen im Level-Package
      // (`updateEnemies`, Gegenstück zu `renderEnemies`) – mutiert `mainEnemy`
      // /`miniEnemies` in place (dieselben Objekte wie in `allEnemies`) und
      // liefert die neu abgefeuerten Projektile; der Game-Loop hängt sie an
      // und spielt pro Schuss den Sound.
      const shots = level.updateEnemies({
        mainEnemy,
        miniEnemies,
        field,
        playerPosition: player.position,
        // Aktive Zeichenlinie (Punktkette + Spielerposition als Kopf), solange
        // der Spieler zeichnet – Gegner dürfen sie nicht überqueren.
        activeLine:
          player.mode === 'drawing' && session
            ? [...session.line.points, { x: player.position.x, y: player.position.y }]
            : undefined,
        dt,
        mainEnemyShooting: level.mainEnemy.shooting,
        miniEnemyShooting: level.miniEnemies.config.shooting,
        playerJustUndocked,
        // Laufzeit-Spawn eines Mini-Gegners (Level 2: Loch-Spawner). Push in
        // die live `miniEnemies`-Liste; spätere `.filter()`-Neuzuweisungen in
        // diesem Frame behalten ihn (er ist dann Teil des gefilterten Arrays).
        spawnMiniEnemyAt: (position: Point): Enemy => {
          const mini = createEnemy(position, level.miniEnemies.config, randomDirection());
          miniEnemies.push(mini);
          return mini;
        },
      });
      const enemyShotKey = enemyShotSoundKey(level);
      for (const shot of shots) {
        projectiles.push(shot);
        audioManager.play(enemyShotKey);
      }
    }

    // Projektile bewegen und die aus dem Bereich geflogenen aufräumen.
    for (const p of projectiles) advanceProjectile(p, dt);
    projectiles = projectiles.filter((p) => !isProjectileOutOfBounds(p, FIELD_WIDTH, FIELD_HEIGHT));

    // Bonussteine: abgelaufene entfernen, ggf. einen neuen spawnen
    // (Instruktion 14, Punkt 3/4).
    bonusStones = pruneExpiredBonusStones(
      bonusStones,
      level.bonusStones.spawning.lifetimeSeconds,
      performance.now(),
    );
    const spawnedStone = tickBonusStoneSpawning(
      bonusSpawner,
      bonusStones,
      field,
      level.bonusStones.spawning,
      dt,
      performance.now(),
    );
    if (spawnedStone) bonusStones.push(spawnedStone);

    // Kanone-Bonus: Tap-to-Fire, in JEDEM Modus möglich – auch geschützt vom
    // Rand aus (Nutzer-Feedback nach Instruktion 15: Richtung anpeilen per
    // Pfeiltaste, ohne loszufahren, siehe `movePlayerAlongEdge`, dann mit
    // Leertaste feuern, ohne den Schild-Schutz aufzugeben). Ohne aktiven
    // Bonus bewirkt der Druck nichts, da `tickPlayerShooting` bei
    // `cannonRemainingSeconds <= 0` `null` liefert.
    const cannonShot = tickPlayerShooting(
      playerState,
      input.state.drawJustPressed,
      player.facing,
      player.position,
      level.bonusStones.cannon,
      dt,
    );
    if (cannonShot) {
      playerProjectiles.push(cannonShot);
      audioManager.play('player_cannon_shot');
    }
    for (const p of playerProjectiles) advanceProjectile(p, dt);
    playerProjectiles = playerProjectiles.filter(
      (p) => !isProjectileOutOfBounds(p, FIELD_WIDTH, FIELD_HEIGHT),
    );

    // Spieler-Projektil trifft Mini-Gegner: gleicher Ablauf wie beim
    // Einschliessen (Explosion + Punkte), Hauptgegner bleibt unverwundbar
    // dagegen (Instruktion 14, Punkt 9).
    const miniHit = findPlayerProjectileHittingMiniEnemy(playerProjectiles, miniEnemies);
    if (miniHit) {
      playerProjectiles.splice(miniHit.projectileIndex, 1);
      miniEnemies = miniEnemies.filter((e) => e !== miniHit.enemy);
      // `allEnemies` wurde oben bereits VOR diesem Treffer gebaut – ohne
      // dieses Herausfiltern würde der gerade besiegte Mini-Gegner weiter
      // unten (Stromball-/Rand-Kollision) noch denselben Frame mitzählen.
      allEnemies = allEnemies.filter((e) => e !== miniHit.enemy);
      defeatMiniEnemy(miniHit.enemy, scoring, explosions, level.scoring);
      audioManager.play('mini_enemy_explosion');
      hud.setScore(scoring.score);
      // Könnte gerade der letzte Mini-Gegner gewesen sein (Nutzer-Feedback:
      // Hauptgegner schrumpft erst, wenn alle besiegt sind) – neu berechnen,
      // nicht erst beim nächsten Feld-Split.
      recomputeMainEnemyEncirclementScale();
    }

    // Irgendein Gegner ↔ aktive Linie: löst einen Stromball aus, der die Linie
    // entlang Richtung Spieler fährt (doppelte Zeichengeschwindigkeit). Ein
    // Leben kostet es erst, wenn der Ball den Spieler erreicht.
    if (player.mode === 'drawing' && session) {
      // Ein Gegner an der Linie löst den Stromball aus (nur einer gleichzeitig).
      if (!spark) {
        const touching = enemyTouchingLine(
          allEnemies,
          session.line,
          ENEMY_TOUCH_RADIUS,
          player.position,
        );
        if (touching) spark = createSpark(session.line, player.position, touching.position);
      }

      // Ein Projektil verpufft beim Kontakt mit der Linie – und löst dabei
      // GENAU DENSELBEN Stromball aus wie eine Gegner-Berührung (falls noch
      // keiner läuft), ausgehend vom Einschlagpunkt.
      const li = projectileIndexTouchingLine(projectiles, session.line, player.position);
      if (li >= 0) {
        const hitPos = { x: projectiles[li].position.x, y: projectiles[li].position.y };
        projectiles.splice(li, 1);
        level.onEnemyProjectileImpact?.(hitPos.x, hitPos.y);
        if (!spark) spark = createSpark(session.line, player.position, hitPos);
      }

      if (spark && advanceSpark(spark, session.line, player.position, dt)) {
        spark = null;
        loseLife();
        return;
      }
    }

    // Auf dem Rand: Schild nimmt ab; bei leerem Schild ist der Spieler dort
    // ebenfalls verwundbar – für jeden Gegner UND jedes Projektil.
    if (player.mode === 'onEdge') {
      decayShield(playerState, dt, level.shieldDecayPerSecond ?? SHIELD_DECAY_PER_SECOND);
      hud.setShield(playerState.shield);
      if (
        anyUnshieldedEnemyHit(allEnemies, player.position, playerState.shield, PLAYER_HIT_RADIUS)
      ) {
        loseLife();
        return;
      }
      const hi = projectileIndexHittingUnshieldedPlayer(
        projectiles,
        player.position,
        playerState.shield,
        PLAYER_HIT_RADIUS,
      );
      if (hi >= 0) {
        const hit = projectiles[hi].position;
        level.onEnemyProjectileImpact?.(hit.x, hit.y);
        projectiles.splice(hi, 1);
        loseLife();
      }
    }
  }

  function strokePolyline(ctx: CanvasRenderingContext2D, points: Point[]): void {
    if (points.length === 0) return;
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }

  /**
   * Liefert einen auf `width`×`height` (volle Viewport-Grösse) skalierten,
   * weichgezeichneten + abgedunkelten Ausschnitt des Level-Hintergrunds
   * ("cover"-Skalierung, wie CSS `background-size: cover`) – füllt die
   * Letterbox-Fläche neben/über dem skalierten Feld-Block mit einer zum
   * Level passenden Textur statt mit reinem Schwarz (Nutzer-Feedback: auf
   * einem breiten iPhone-Querformat wirkten die bisherigen reinen
   * schwarzen Balken wie ungenutzter/kaputter Platz).
   *
   * Der teure Teil (`ctx.filter = 'blur(...)'`) läuft NUR bei einer
   * tatsächlichen Grössenänderung (gecacht nach `width`/`height`), nicht
   * pro Frame – ein Resize ist selten, 60 Frames/Sekunde sind es nicht.
   */
  function getBackdrop(width: number, height: number): HTMLCanvasElement {
    if (backdropCache && backdropCache.width === width && backdropCache.height === height) {
      return backdropCache.canvas;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const bctx = canvas.getContext('2d');
    if (bctx) {
      const img = assets.background;
      const coverScale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const drawWidth = img.width * coverScale;
      const drawHeight = img.height * coverScale;
      bctx.filter = 'blur(48px)';
      bctx.drawImage(
        img,
        (canvas.width - drawWidth) / 2,
        (canvas.height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
      bctx.filter = 'none';
      // Abdunkeln: hält den Kontrast zum eigentlichen (scharfen) Feld-Block
      // hoch, damit dieser klar als "das Spiel" erkennbar bleibt statt mit
      // dem Rand zu verschwimmen.
      bctx.fillStyle = 'rgb(11 14 20 / 70%)';
      bctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    backdropCache = { width, height, canvas };
    return canvas;
  }

  // Einmal pro Partie (nicht pro Frame, siehe `render`) – `assets` ändert
  // sich während einer laufenden Partie nicht.
  const bonusStoneSprites: Record<BonusStoneType, HTMLImageElement> = {
    speedBoost: assets.bonusSpeed,
    cannon: assets.bonusCannon,
    freeze: assets.bonusFreeze,
    bomb: assets.bonusBomb,
  };

  function render(ctx: CanvasRenderingContext2D): void {
    // Eine gemeinsame Wanduhrzeit für alle zeitbasierten Effekte dieses
    // Frames (Bein-Animation, Bonusstein-Puls, Augen-Puls, Explosionen,
    // Screen-Flash) – ein `performance.now()`-Aufruf statt vieler.
    const now = performance.now();

    if (view.width > 0 && view.height > 0) {
      ctx.drawImage(getBackdrop(view.width, view.height), 0, 0);
    } else {
      ctx.fillStyle = COLOR_BACKDROP;
      ctx.fillRect(0, 0, view.width, view.height);
    }

    // Logo + Spielfeld + Ränder zusammen so skalieren, dass sie den gesamten
    // Viewport unverzerrt ausnutzen (Instruktion 20, Punkt 1) – das feste
    // FIELD_WIDTH/HEIGHT bleibt dabei die LOGISCHE Spielfeld-Grösse
    // (Kollisionen, Positionen usw. unverändert), nur die Darstellung
    // skaliert. `calculateCanvasScale` deckelt `scale` bewusst NICHT bei 1
    // mehr (siehe dort) – auf grossen Bildschirmen/Tablets wird der Inhalt
    // jetzt ebenfalls vergrössert statt in Originalgrösse mit viel
    // ungenutztem Rand stehen zu bleiben.
    const contentWidth = FIELD_WIDTH + FIELD_MARGIN * 2;
    const contentHeight = FIELD_MARGIN_TOP + FIELD_HEIGHT + FIELD_MARGIN;
    const {
      scale,
      offsetX: originX,
      offsetY: originY,
    } = calculateCanvasScale(view.width, view.height, contentWidth, contentHeight);

    ctx.save();
    ctx.translate(originX, originY);
    ctx.scale(scale, scale);

    // Logo statt Text-Schriftzug, horizontal mittig oben, oberhalb des
    // Spielfelds (siehe FIELD_MARGIN_TOP) statt darüber zu liegen – jetzt
    // Teil desselben skalierten Blocks wie das Feld, damit beide zusammen
    // schrumpfen/zentrieren.
    ctx.drawImage(
      logoImage,
      (contentWidth - LOGO_WIDTH) / 2,
      LOGO_MARGIN_TOP,
      LOGO_WIDTH,
      LOGO_HEIGHT,
    );

    ctx.save();
    ctx.translate(FIELD_MARGIN, FIELD_MARGIN_TOP);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Ebenen: Background → Foreground (Offscreen, ausgeschnitten) → optionaler
    // Deko-Überzug des Levels → Spiel-Layer.
    ctx.drawImage(assets.background, 0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    ctx.drawImage(foreground.canvas, 0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // Rein dekorativ, ohne Spiellogik (Level 2: aufsteigende Luftblasen im
    // Wasser + Bläschen-Spur hinter dem Torpedo) – zeichnet zustandslos aus
    // `now` (+ den aktiven Projektilen), siehe `LevelDecorationRenderer`.
    level.renderDecoration?.(ctx, {
      width: FIELD_WIDTH,
      height: FIELD_HEIGHT,
      now,
      enemyProjectiles: projectiles,
    });

    // Spielfeld-Umriss (aktuell ein Rechteck, später ein komplexeres Polygon).
    // Feinere Linie als zuvor (Nutzer-Feedback, Vergleich mit dem
    // Volfied-Original: dort deutlich dünnere Umriss-/Zeichenlinien).
    ctx.strokeStyle = COLOR_FIELD_EDGE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    field.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();

    // Bein-Pose wechselt im gemeinsamen Takt (`WALK_FRAME_INTERVAL_MS`) für
    // eine einfache Zwei-Bild-Lauf-Animation – hier bestimmt (statt im
    // Level-Renderer), damit Spieler UND Gegner synchron "wackeln".
    const useWalkFrame = Math.floor(now / WALK_FRAME_INTERVAL_MS) % 2 === 1;
    // Gegner-Darstellung liegt im Level-Package (`src/levels/level1/render.ts`):
    // Sprite-Wahl, pulsierender Augen-Glow und der beim Einkesseln schrumpfende
    // Hauptgegner (`mainEnemyScale` aus dem Cache
    // `recomputeMainEnemyEncirclementScale`, NUR der Hauptgegner) werden dort
    // behandelt. Beim Levelabschluss verschwindet der Hauptgegner mit seiner
    // Explosion (`hideMainEnemy`) – analog zu den Mini-Gegnern, die zum selben
    // Zeitpunkt aus `miniEnemies` entfernt werden (siehe `handleCompletedLine`).
    level.renderEnemies(ctx, assets, {
      mainEnemy,
      miniEnemies,
      mainEnemyScale: mainEnemyEncirclementScaleValue,
      hideMainEnemy: scoring.isLevelComplete,
      useWalkFrame,
      now,
    });

    // Bonussteine: mit ihrem typspezifischen Sprite, in der letzten Sekunde
    // vor Ablauf sanft ausblendend (Instruktion 14, Punkt 4), zusätzlich mit
    // kontinuierlich pulsierendem Glow dahinter (Instruktion 17, Punkt 2) –
    // Puls beschleunigt sich in den letzten Sekunden als Warnsignal.
    for (const stone of bonusStones) {
      const sprite = bonusStoneSprites[stone.type];
      const diameter = level.bonusStones.spawning.radius * 2;
      const fadeOpacity = bonusStoneOpacity(stone, level.bonusStones.spawning.lifetimeSeconds, now);
      const pulse = bonusStonePulseIntensity(
        stone.spawnedAt,
        level.bonusStones.spawning.lifetimeSeconds,
        now,
      );

      // Glow als radialer Gradient (kein `shadowBlur`, siehe
      // Performance-Hinweis – läuft potenziell über mehrere Steine
      // gleichzeitig und ist grösser als die Augen-Glows oben).
      const glowColor = BONUS_PULSE_COLOR_RGB[stone.type];
      const glowRadius = level.bonusStones.spawning.radius + BONUS_PULSE_GLOW_RADIUS_EXTRA * pulse;
      const glowGradient = ctx.createRadialGradient(
        stone.position.x,
        stone.position.y,
        0,
        stone.position.x,
        stone.position.y,
        glowRadius,
      );
      const glowAlpha = pulse * fadeOpacity * BONUS_PULSE_GLOW_MAX_ALPHA;
      glowGradient.addColorStop(0, `rgba(${glowColor}, ${glowAlpha})`);
      glowGradient.addColorStop(1, `rgba(${glowColor}, 0)`);
      ctx.save();
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(stone.position.x, stone.position.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = fadeOpacity;
      ctx.drawImage(
        sprite,
        stone.position.x - diameter / 2,
        stone.position.y - diameter / 2,
        diameter,
        diameter,
      );
      ctx.restore();
    }

    // Projektile: nach den Gegnern, vor Spielfigur/Linie. In Flugrichtung
    // gedreht (`velocity`-Winkel), damit gerichtete Sprites wie der
    // Level-2-Torpedo (Grafik zeigt nach +x) in Schussrichtung zeigen; eine
    // runde Kugel bleibt davon unberührt.
    if (assets.projectile) {
      for (const p of projectiles) {
        ctx.save();
        ctx.translate(p.position.x, p.position.y);
        ctx.rotate(Math.atan2(p.velocity.y, p.velocity.x));
        ctx.drawImage(assets.projectile, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    }
    for (const p of playerProjectiles) {
      ctx.drawImage(
        assets.playerProjectile,
        p.position.x - p.size / 2,
        p.position.y - p.size / 2,
        p.size,
        p.size,
      );
    }

    // Explosionen: nach Gegnern/Projektilen, vor der Zeichenlinie/Spieler-Ebene.
    for (const explosion of explosions) renderExplosion(ctx, explosion, now);

    // Aktuell gezeichnete Linie (grün): aufgezeichnete Punkte + live bis zum Spieler.
    if (session) {
      const linePoints = [...session.line.points, player.position];
      // Glühender Unterzug (Instruktion 17, Punkt 3): eine breitere,
      // halbtransparente Kopie derselben Linie darunter statt `shadowBlur`
      // (siehe Performance-Hinweis – kann bei langen Zeichenversuchen aus
      // vielen Punkten bestehen). Gleiche Farbfamilie wie die Linie selbst,
      // damit die "hier bin ich verwundbar"-Symbolik erhalten bleibt.
      ctx.strokeStyle = `rgba(${DRAW_PATH_GLOW_COLOR_RGB}, ${DRAW_PATH_GLOW_ALPHA})`;
      ctx.lineWidth = DRAW_PATH_GLOW_WIDTH;
      strokePolyline(ctx, linePoints);

      ctx.strokeStyle = COLOR_DRAWING;
      ctx.lineWidth = 2;
      strokePolyline(ctx, linePoints);
    }

    // Stromball: heller Kern mit Glow, fährt die Linie entlang.
    if (spark) {
      ctx.beginPath();
      ctx.arc(spark.position.x, spark.position.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(143, 188, 255, 0.35)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(spark.position.x, spark.position.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = COLOR_SPARK;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(spark.position.x, spark.position.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = COLOR_SPARK_CORE;
      ctx.fill();
    }

    // Schild-Aura hinter dem Spieler (Instruktion 17, Punkt 1): radialer
    // Gradient statt `shadowBlur` (siehe Performance-Hinweis), Deckkraft
    // proportional zu `shield` – keine Aura mehr bei aufgebrauchtem Schild,
    // konsistent mit der Ungeschützt-Regel aus Instruktion 8.
    const auraOpacity = shieldAuraOpacity(playerState.shield);
    if (auraOpacity > 0) {
      const auraRadius = playerSize / 2 + SHIELD_AURA_RADIUS_EXTRA;
      const auraGradient = ctx.createRadialGradient(
        player.position.x,
        player.position.y,
        playerSize * 0.2,
        player.position.x,
        player.position.y,
        auraRadius,
      );
      auraGradient.addColorStop(0, `rgba(${SHIELD_AURA_COLOR_RGB}, ${auraOpacity})`);
      auraGradient.addColorStop(1, `rgba(${SHIELD_AURA_COLOR_RGB}, 0)`);
      ctx.save();
      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(player.position.x, player.position.y, auraRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Spieler: Marienkäfer-Sprite, in aktuelle Bewegungsrichtung gedreht,
    // Bein-Pose im selben Takt wie bei den Gegnern (Instruktion 16).
    // "Cyborg"-Variante, solange Speed-Boost oder Kanone aktiv ist
    // (Instruktion 14) – visuelles Feedback für den Spezialstein-Effekt.
    const cyborgActive =
      playerState.speedBoostRemainingSeconds > 0 || playerState.cannonRemainingSeconds > 0;
    const activePlayerSprite = cyborgActive
      ? useWalkFrame
        ? playerWalkCyborgImage
        : playerCyborgImage
      : useWalkFrame
        ? playerWalkImage
        : playerImage;
    ctx.save();
    ctx.translate(player.position.x, player.position.y);
    ctx.rotate(playerFacingAngle(player.facing));
    ctx.drawImage(activePlayerSprite, -playerSize / 2, -playerSize / 2, playerSize, playerSize);

    // Cyborg-Statuslampen: eigener, langsamerer Blink-Takt als eigenständiger
    // Überzug (siehe `CYBORG_LAMP_SPOTS`) statt in den Sprites eingebrannt –
    // nur eine Hälfte des Zyklus gezeichnet ("aus" = einfach nichts zeichnen,
    // die neutrale dunkle Fassung aus dem Sprite bleibt sichtbar).
    if (cyborgActive && Math.floor(now / CYBORG_LAMP_BLINK_INTERVAL_MS) % 2 === 0) {
      for (const lamp of CYBORG_LAMP_SPOTS) {
        ctx.shadowColor = lamp.color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = lamp.color;
        ctx.beginPath();
        ctx.arc(
          lamp.x * playerSize,
          lamp.y * playerSize,
          lamp.radiusFraction * playerSize,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    ctx.restore(); // Ende Spieler-Rotate

    ctx.restore(); // Ende der Feld-Translate (siehe `ctx.translate(FIELD_MARGIN, FIELD_MARGIN_TOP)` oben)
    ctx.restore(); // Ende des skalierten Logo+Feld-Blocks (siehe `ctx.scale(scale, scale)` oben)

    // Schaden-Feedback bei Lebensverlust (Instruktion 17, Punkt 5): rötlicher
    // Vignetten-Flash, der in der Mitte transparent bleibt und zum Rand hin
    // sichtbarer wird – blendet über SCREEN_FLASH_DURATION_MS linear aus
    // (Pruning/Timing siehe `update`, strukturell wie `Explosion`).
    if (screenFlash) {
      const flashOpacity = screenFlashOpacity(screenFlash, now);
      if (flashOpacity > 0) {
        const flashRadius = Math.max(view.width, view.height) * 0.75;
        const flashGradient = ctx.createRadialGradient(
          view.width / 2,
          view.height / 2,
          0,
          view.width / 2,
          view.height / 2,
          flashRadius,
        );
        flashGradient.addColorStop(0, `rgba(${SCREEN_FLASH_COLOR_RGB}, 0)`);
        flashGradient.addColorStop(
          1,
          `rgba(${SCREEN_FLASH_COLOR_RGB}, ${flashOpacity * SCREEN_FLASH_MAX_ALPHA})`,
        );
        ctx.fillStyle = flashGradient;
        ctx.fillRect(0, 0, view.width, view.height);
      }
    }
  }

  // Debug-Taste „N": aktuelles Level sofort überspringen – wie ein bestätigter
  // Levelabschluss (direkt ins nächste Level, ohne Startbildschirm, Score +
  // Leben laufen über `carryOver` mit). Wird von `teardown()` wieder abgehängt.
  // TODO(vor Release): hinter `import.meta.env.DEV` legen oder entfernen –
  // aktuell bewusst immer aktiv, um Level 2 ohne Level-1-Abschluss zu testen.
  let disposeDebugKeys: () => void = () => {};

  /** Räumt Loop, Input-Listener, Resize-Listener, HUD-DOM und Musik auf. */
  function teardown(): void {
    loop.stop();
    input.dispose();
    disposeDebugKeys();
    view.dispose();
    hud.dispose();
    audioManager.stop(musicNode);
    musicNode = null;
  }

  const loop = createGameLoop(view.ctx, { update, render });
  loop.start();

  {
    let levelSkipped = false;
    const onDebugKey = (e: KeyboardEvent): void => {
      if (e.code !== 'KeyN' || levelSkipped) return;
      levelSkipped = true;
      teardown();
      resolveStart({
        kind: 'nextLevel',
        carryOver: { score: scoring.score, lives: playerState.lives },
      });
    };
    window.addEventListener('keydown', onDebugKey);
    disposeDebugKeys = (): void => window.removeEventListener('keydown', onDebugKey);
  }

  // Hintergrundmusik dieser Partie starten – nur, wenn das Level eine
  // `musicSrc` konfiguriert hat (sonst bliebe der Musik-Key ungeladen bzw.
  // trüge die Musik eines anderen Levels).
  if (level.musicSrc) {
    musicNode = audioManager.play(levelMusicKey(level), { loop: true, volume: MUSIC_VOLUME });
  }

  // Vite HMR: laufende Ressourcen beim Hot-Reload sauber abbauen (löst NICHT
  // `donePromise` auf – das würde die alte `boot()`-Instanz nach dem Modul-
  // Swap unnötig weiterlaufen lassen).
  if (import.meta.hot) {
    import.meta.hot.dispose(() => teardown());
  }

  return donePromise;
}

async function boot(): Promise<void> {
  showLoading(gameCanvas);

  // Levelübergreifende Assets einmal laden: Spieler-Sprites (normal + Cyborg-
  // Variante, je inkl. Lauf-Pose) + Logo (bewusst NICHT Teil von `LevelConfig`,
  // Instruktion 13) und die globalen SFX (Instruktion 18, Punkt 2).
  const [playerImage, playerWalkImage, playerCyborgImage, playerWalkCyborgImage, logoImage] =
    await Promise.all([
      loadImage(PLAYER_ASSET_SRC),
      loadImage(PLAYER_WALK_ASSET_SRC),
      loadImage(PLAYER_CYBORG_ASSET_SRC),
      loadImage(PLAYER_WALK_CYBORG_ASSET_SRC),
      loadImage(LOGO_ASSET_SRC),
      audioManager.loadAll(SOUND_SOURCES),
    ]);

  // Levelbilder pro Level nur einmal laden (Wiederholung eines Levels lädt
  // nicht neu). Die levelspezifische Hintergrundmusik (`level.musicSrc`) kommt
  // im selben Schritt dazu – unter einem eigenen Key pro Level (`levelMusicKey`),
  // damit sie ein Levelwechsel nicht überschreibt.
  const levelImagesCache = new Map<string, LevelImages>();
  async function loadLevel(level: LevelConfig): Promise<LevelImages> {
    const cached = levelImagesCache.get(level.id);
    if (cached) return cached;
    showLoading(gameCanvas);
    const enemyShotSrc = levelEnemyShotSrc(level);
    const [images] = await Promise.all([
      loadLevelImages(level),
      level.musicSrc
        ? audioManager.loadSound(levelMusicKey(level), level.musicSrc)
        : Promise.resolve(),
      enemyShotSrc
        ? audioManager.loadSound(enemyShotSoundKey(level), enemyShotSrc)
        : Promise.resolve(),
    ]);
    levelImagesCache.set(level.id, images);
    return images;
  }

  // Startbildschirm ↔ Partie im Wechsel. `start()` meldet über seinen
  // `StartOutcome` zurück, wie es weitergeht:
  //  - `toStartScreen` (Game Over): zurück zum Startbildschirm, wieder ab
  //    Level 1, mit frischem Score/Leben (`carryOver` zurück auf `null`).
  //  - `nextLevel` (Levelabschluss + Enter): ohne Startbildschirm direkt ins
  //    nächste Level, Score + Leben laufen über `carryOver` weiter.
  //    `% levels.length` lässt hinter dem letzten Level wieder das erste
  //    folgen (ersetzt den früheren In-Place-Neustart `restartGame`).
  let levelIndex = 0;
  let showStart = true;
  let carryOver: LevelCarryOver | null = null;
  for (;;) {
    const level = levels[levelIndex];
    const assets = await loadLevel(level);
    if (showStart) await showStartScreen(gameCanvas, logoImage);
    const outcome = await start(
      gameCanvas,
      level,
      assets,
      playerImage,
      playerWalkImage,
      playerCyborgImage,
      playerWalkCyborgImage,
      logoImage,
      carryOver,
    );
    if (outcome.kind === 'nextLevel') {
      levelIndex = (levelIndex + 1) % levels.length;
      showStart = false;
      carryOver = outcome.carryOver;
    } else {
      levelIndex = 0;
      showStart = true;
      carryOver = null;
    }
  }
}

void boot().catch((err: unknown) => {
  console.error('Wormfied konnte nicht starten:', err);
  const ctx = gameCanvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = COLOR_BACKDROP;
  ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
  ctx.fillStyle = COLOR_ERROR_TEXT;
  ctx.font = '16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(err), gameCanvas.width / 2, gameCanvas.height / 2);
});
