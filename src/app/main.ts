import { loadImage, loadLevelImages, type LevelImages } from '../engine/assetLoader';
import { setupCanvas } from '../engine/canvas';
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
  createBonusStoneSpawner,
  isBlockedByBonusStone,
  partitionCapturedBonusStones,
  pruneExpiredBonusStones,
  tickBonusStoneSpawning,
  type BonusStone,
} from '../game/bonusStone';
import {
  advanceDrawing,
  EdgeTrigger,
  toggleUndocked,
  tryEnterDrawing,
  type DrawSession,
} from '../game/drawing';
import { createEnemy, enemyFacingAngle, type Enemy } from '../game/enemy';
import { moveEnemies, randomDirection } from '../game/enemyMovement';
import { createExplosion, pruneExplosions, renderExplosion, type Explosion } from '../game/explosion';
import { createRectangularField, type Point } from '../game/field';
import { createForegroundLayer, type ForegroundLayer } from '../game/foregroundLayer';
import { closestPointOnPerimeter } from '../game/geometry';
import { type DrawnLine } from '../game/line';
import { handleLifeLoss } from '../game/lifecycle';
import { defeatMiniEnemy, partitionCapturedMiniEnemies, spawnMiniEnemies } from '../game/miniEnemies';
import { Player, playerFacingAngle } from '../game/player';
import { createPlayerState, decayBoostTimers, decayShield } from '../game/playerState';
import { movePlayerAlongEdge } from '../game/playerMovement';
import { applyCompletedLine, polygonArea } from '../game/polygon';
import {
  advanceProjectile,
  isProjectileOutOfBounds,
  tickEnemyShooting,
  tickPlayerShooting,
  type Projectile,
} from '../game/projectile';
import { resetGame } from '../game/resetGame';
import {
  applyLevelClearBonus,
  createScoring,
  getClaimedPercentage,
  registerClaim,
  type Scoring,
} from '../game/scoring';
import { advanceSpark, createSpark, type Spark } from '../game/spark';
import { levels } from '../levels';
import { type LevelConfig } from '../levels/types';
import { createHud } from '../ui/hud';
import { t } from '../i18n';
import '../styles/main.css';

// Abstand des Spielfelds zum Fensterrand (links/rechts/unten), damit der
// Umriss nicht abgeschnitten wird. Später über CSS-Variablen / Theme steuerbar.
const FIELD_MARGIN = 40;
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
/** Rendergrösse (Durchmesser) des Spieler-Sprites in Pixel. */
const playerSize = 30;
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
/**
 * Kollisions-Toleranzradius für "Gegner/Projektil berührt Spieler direkt"
 * (Instruktion 8/11): an `playerSize` ausgerichtet statt am generischen
 * `ENEMY_TOUCH_RADIUS`, damit der Trefferbereich optisch zur Sprite-Grösse
 * passt.
 */
const PLAYER_HIT_RADIUS = playerSize / 2;
/** Mindestabstand der Mini-Gegner-Startpositionen zueinander und zum Hauptgegner. */
const MIN_MINI_SPACING = 70;

const foundCanvas = document.querySelector<HTMLCanvasElement>('#game');
if (!foundCanvas) {
  throw new Error('Canvas-Element #game nicht gefunden.');
}
const gameCanvas: HTMLCanvasElement = foundCanvas;

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

function start(
  canvas: HTMLCanvasElement,
  level: LevelConfig,
  assets: LevelImages,
  playerImage: HTMLImageElement,
  logoImage: HTMLImageElement,
): void {
  const player = new Player();
  const playerState = createPlayerState();
  // Kanal für abgeschlossene Linien aus `advanceDrawing`; sie werden noch im
  // selben Frame verarbeitet (Feld-Split) und danach aus der Liste entfernt.
  const completedLines: DrawnLine[] = [];
  let session: DrawSession | null = null;
  // Stromball, der bei Gegner-Linien-Kontakt Richtung Spieler fährt (nur einer
  // gleichzeitig, lebt so lange wie die aktuelle Zeichen-Session).
  let spark: Spark | null = null;
  // Foreground-Pixelzustand beim Start des aktuellen Zeichenversuchs – zum
  // Rückgängigmachen bei einer Kollision (Punkt 1, Instruktion 8).
  let foregroundSnapshot: ImageData | null = null;
  // Zeitpunkt, bis zu dem der Schaden-Blitz gezeichnet wird (ms, performance.now).
  let damageFlashUntil = 0;
  // Enter löst nur auf seiner steigenden Flanke aus (Leertaste liefert das
  // seit Instruktion 15 bereits fertig über `input.state.drawJustPressed`).
  const restartTrigger = new EdgeTrigger();

  const hud = createHud();

  let field: Point[] = createRectangularField(1, 1);
  let fieldWidth = 1;
  let fieldHeight = 1;
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

  /** Level-Initialisierung (auch Resize- und Neustart-Pfad nutzen sie). */
  function rebuildField(width: number, height: number): Point[] {
    fieldWidth = Math.max(1, width - FIELD_MARGIN * 2);
    fieldHeight = Math.max(1, height - FIELD_MARGIN_TOP - FIELD_MARGIN);
    // ÜBERGANGSLÖSUNG (wie in Instruktion 4): Ein Resize setzt das Feld auf das
    // volle Rechteck zurück und baut den Foreground neu auf – bereits eroberte
    // Flächen / Ausschnitte gehen dabei verloren. Ein späterer Schritt kann die
    // Split-Polygone stattdessen mitskalieren.
    field = createRectangularField(fieldWidth, fieldHeight);
    if (player.mode === 'onEdge') player.syncPosition(field);
    // Foreground zurück auf das Originalbild (neu aufgebauter Offscreen-Canvas).
    foreground = createForegroundLayer(assets.foreground, fieldWidth, fieldHeight);
    // Gesamtfläche des Levels einmal festhalten; ein Resize setzt sie (und die
    // Erobert-Anzeige) zurück, weil das Feld wieder komplett ist.
    scoring = createScoring(polygonArea(field));
    hud.setClaimedPercentage(0);
    hud.setScore(0);
    hud.setLevelComplete(false);
    // Hauptgegner in die Feldmitte, Mini-Gegner zufällig verteilt (Mindestabstand
    // zueinander und zum Hauptgegner + Spieler-Start).
    mainEnemy = createEnemy(
      { x: fieldWidth / 2, y: fieldHeight / 2 },
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
    for (const enemy of captured) defeatMiniEnemy(enemy, scoring, explosions, level.scoring);

    // Bonussteine, die in der eroberten Fläche liegen, sind ebenfalls
    // "gefangen": Effekt aktivieren + Aufnahme-Explosion in typspezifischer
    // Farbe (Instruktion 14, Punkt 6).
    const bonusCapture = partitionCapturedBonusStones(bonusStones, result.claimed);
    bonusStones = bonusCapture.survivors;
    for (const stone of bonusCapture.captured) {
      applyBonusStoneEffect(stone, playerState, level.bonusStones);
      explosions.push(createExplosion(stone.position, BONUS_STONE_EXPLOSION_COLOR[stone.type]));
    }

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

    // Levelabschluss-Bonus ("Aufräum-Bonus"): `applyLevelClearBonus` feuert
    // nur beim false→true-Übergang (siehe dortiger Kommentar), also genau
    // einmal, auch falls dieser Frame-Handler danach nochmal liefe.
    const bonus = applyLevelClearBonus(
      scoring,
      outcome.levelJustCompleted,
      miniEnemies.length,
      level.scoring,
    );
    if (bonus) {
      explosions.push(createExplosion(mainEnemy.position));
      for (const enemy of miniEnemies) explosions.push(createExplosion(enemy.position));
      miniEnemies = [];
      hud.setLevelComplete(true, percent, scoring.score);
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
    damageFlashUntil = performance.now() + 140;

    if (playerState.isGameOver) {
      hud.setGameOver(true);
    }
  }

  /** Kompletter Neustart nach Game Over. */
  function restartGame(): void {
    resetGame(
      player,
      playerState,
      () => rebuildField(view.width, view.height),
      () => {
        session = null;
        spark = null;
        projectiles = [];
        explosions = [];
        bonusStones = [];
        bonusSpawner.timeSinceLastSpawn = 0;
        playerProjectiles = [];
        foregroundSnapshot = null;
        damageFlashUntil = 0;
        hud.setGameOver(false);
        hud.setLevelComplete(false);
        hud.setClaimedPercentage(0);
        hud.setScore(scoring.score);
        hud.setLives(playerState.lives);
        hud.setShield(playerState.shield);
      },
    );
  }

  const view = setupCanvas(canvas, { onResize: rebuildField });
  const input = setupInput();
  rebuildField(view.width, view.height);
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

    // Explosions-Fortschritt hängt an `performance.now()`, nicht an `dt` –
    // dieser Aufräumschritt läuft deshalb bewusst VOR den Freeze-Checks
    // unten, damit der Levelabschluss-Bonus (Instruktion 12) auch bei
    // eingefrorenem Game-Loop sichtbar zu Ende animiert.
    explosions = pruneExplosions(explosions, performance.now());

    if (playerState.isGameOver) {
      // Keine Spieler-/Gegnerbewegung mehr – nur auf Neustart warten.
      if (restartPressed) restartGame();
      return;
    }

    // Level-Complete-Check nur, wenn nicht bereits Game Over (schliessen sich
    // gegenseitig aus). Auch hier alles eingefroren bis Enter.
    if (scoring.isLevelComplete) {
      if (restartPressed) restartGame();
      return;
    }

    // Boost-Timer laufen unabhängig vom Modus herunter (Instruktion 14).
    decayBoostTimers(playerState, dt);
    const speedMultiplier =
      playerState.speedBoostRemainingSeconds > 0
        ? level.bonusStones.speedBoost.speedMultiplier
        : 1;

    const prevPos = { x: player.position.x, y: player.position.y };
    // Ob der befahrene Pfad diesen Frame ausgeschnitten werden soll: nur wenn
    // der Spieler sich wirklich vom Rand gelöst hat (vor ODER nach dem Schritt).
    let carve = session?.hasLeftEdge === true;

    if (player.mode === 'onEdge') {
      // Andock/Abdock-Toggle (Instruktion 15): ändert nur `isUndocked`, keine
      // Positionsänderung. Der eigentliche Übergang zu `drawing` passiert erst
      // bei tatsächlicher Richtungseingabe nach innen, siehe `tryEnterDrawing`.
      toggleUndocked(player, input.state.drawJustPressed);
      session = tryEnterDrawing(player, field, input.state);
      if (session) {
        // Zeichenversuch beginnt: Foreground-Zustand sichern (Rückgängig bei Kollision).
        foregroundSnapshot = foreground.snapshot();
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
          foregroundSnapshot = null; // Versuch beendet (Split oder blosses Andocken)
          spark = null; // erreicht → der Spieler ist dem Stromball entkommen
          // Neu abgeschlossene Linie(n) sofort verarbeiten und aus dem Kanal
          // nehmen (nach dem Split sind sie Teil der Feld-Polygon-Kanten).
          completedLines.splice(before).forEach((line) => handleCompletedLine(line.points));
          // 80% erreicht -> Level eingefroren, Rest dieses Frames überspringen.
          if (scoring.isLevelComplete) return;
        }
      }
    }

    carve = carve || session?.hasLeftEdge === true;
    if (carve && (prevPos.x !== player.position.x || prevPos.y !== player.position.y)) {
      // Pfadbasiertes Ausschneiden (Übergangslösung, siehe foregroundLayer.ts):
      // Instruktion 5 ergänzt das um polygon-exaktes Flächen-Ausschneiden.
      foreground.carvePath(prevPos.x, prevPos.y, player.position.x, player.position.y);
    }

    // Alle Gegner (Hauptgegner + Mini-Gegner) bewegen und für Kollisionen als
    // eine Liste behandeln – Mini-Gegner sind gleichwertig gefährlich.
    let allEnemies = [mainEnemy, ...miniEnemies];
    moveEnemies(allEnemies, field, dt);

    // Gegner schiessen (auf die aktuelle Spielerposition gezielt).
    const shot = tickEnemyShooting(mainEnemy, level.mainEnemy.shooting, player.position, dt);
    if (shot) projectiles.push(shot);
    for (const mini of miniEnemies) {
      const miniShot = tickEnemyShooting(
        mini,
        level.miniEnemies.config.shooting,
        player.position,
        dt,
      );
      if (miniShot) projectiles.push(miniShot);
    }

    // Projektile bewegen und die aus dem Bereich geflogenen aufräumen.
    for (const p of projectiles) advanceProjectile(p, dt);
    projectiles = projectiles.filter((p) => !isProjectileOutOfBounds(p, fieldWidth, fieldHeight));

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
    if (cannonShot) playerProjectiles.push(cannonShot);
    for (const p of playerProjectiles) advanceProjectile(p, dt);
    playerProjectiles = playerProjectiles.filter(
      (p) => !isProjectileOutOfBounds(p, fieldWidth, fieldHeight),
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
      hud.setScore(scoring.score);
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
      decayShield(playerState, dt);
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

  function drawEnemySprite(
    ctx: CanvasRenderingContext2D,
    sprite: HTMLImageElement,
    e: Enemy,
  ): void {
    // In Bewegungsrichtung ausrichten (Sprite-Kopf zeigt lokal nach oben).
    ctx.save();
    ctx.translate(e.position.x, e.position.y);
    ctx.rotate(enemyFacingAngle(e.direction));
    ctx.drawImage(sprite, -e.size / 2, -e.size / 2, e.size, e.size);
    ctx.restore();
  }

  function render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLOR_BACKDROP;
    ctx.fillRect(0, 0, view.width, view.height);

    ctx.save();
    ctx.translate(FIELD_MARGIN, FIELD_MARGIN_TOP);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Ebenen: Background → Foreground (Offscreen, ausgeschnitten) → Spiel-Layer.
    ctx.drawImage(assets.background, 0, 0, fieldWidth, fieldHeight);
    ctx.drawImage(foreground.canvas, 0, 0, fieldWidth, fieldHeight);

    // Spielfeld-Umriss (aktuell ein Rechteck, später ein komplexeres Polygon).
    ctx.strokeStyle = COLOR_FIELD_EDGE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    field.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();

    // Gegner: Hauptgegner + Mini-Gegner, jeweils mit ihrem SVG-Sprite,
    // skaliert auf ihre konfigurierte Grösse.
    drawEnemySprite(ctx, assets.mainEnemy, mainEnemy);
    for (const mini of miniEnemies) drawEnemySprite(ctx, assets.miniEnemy, mini);

    // Bonussteine: mit ihrem typspezifischen Sprite, in der letzten Sekunde
    // vor Ablauf sanft ausblendend (Instruktion 14, Punkt 4).
    const bonusStoneNow = performance.now();
    for (const stone of bonusStones) {
      const sprite = stone.type === 'speedBoost' ? assets.bonusSpeed : assets.bonusCannon;
      const diameter = level.bonusStones.spawning.radius * 2;
      ctx.save();
      ctx.globalAlpha = bonusStoneOpacity(
        stone,
        level.bonusStones.spawning.lifetimeSeconds,
        bonusStoneNow,
      );
      ctx.drawImage(
        sprite,
        stone.position.x - diameter / 2,
        stone.position.y - diameter / 2,
        diameter,
        diameter,
      );
      ctx.restore();
    }

    // Projektile: nach den Gegnern, vor Spielfigur/Linie.
    if (assets.projectile) {
      for (const p of projectiles) {
        ctx.drawImage(
          assets.projectile,
          p.position.x - p.size / 2,
          p.position.y - p.size / 2,
          p.size,
          p.size,
        );
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
    const explosionNow = performance.now();
    for (const explosion of explosions) renderExplosion(ctx, explosion, explosionNow);

    // Aktuell gezeichnete Linie (grün): aufgezeichnete Punkte + live bis zum Spieler.
    if (session) {
      ctx.strokeStyle = COLOR_DRAWING;
      ctx.lineWidth = 3;
      strokePolyline(ctx, [...session.line.points, player.position]);
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

    // Spieler: Marienkäfer-Sprite, in aktuelle Bewegungsrichtung gedreht.
    ctx.save();
    ctx.translate(player.position.x, player.position.y);
    ctx.rotate(playerFacingAngle(player.facing));
    ctx.drawImage(playerImage, -playerSize / 2, -playerSize / 2, playerSize, playerSize);
    ctx.restore();

    ctx.restore();

    // Logo statt Text-Schriftzug, horizontal mittig oben, oberhalb des
    // Spielfelds (siehe FIELD_MARGIN_TOP) statt darüber zu liegen.
    ctx.drawImage(
      logoImage,
      (view.width - LOGO_WIDTH) / 2,
      LOGO_MARGIN_TOP,
      LOGO_WIDTH,
      LOGO_HEIGHT,
    );

    // Schaden-Feedback: kurzes rotes Aufblitzen über dem ganzen Canvas.
    if (performance.now() < damageFlashUntil) {
      ctx.fillStyle = 'rgba(191, 97, 106, 0.4)';
      ctx.fillRect(0, 0, view.width, view.height);
    }
  }

  const loop = createGameLoop(view.ctx, { update, render });
  loop.start();

  // Vite HMR: laufende Ressourcen beim Hot-Reload sauber abbauen.
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      loop.stop();
      input.dispose();
      view.dispose();
      hud.dispose();
    });
  }
}

async function boot(): Promise<void> {
  showLoading(gameCanvas);
  const level = levels[0];
  // Levelbilder + Spieler-Sprite + Logo parallel laden – Spieler und Logo
  // sind bewusst NICHT Teil von `LevelConfig` (levelübergreifend gleich,
  // Instruktion 13).
  const [assets, playerImage, logoImage] = await Promise.all([
    loadLevelImages(level),
    loadImage(PLAYER_ASSET_SRC),
    loadImage(LOGO_ASSET_SRC),
  ]);
  start(gameCanvas, level, assets, playerImage, logoImage);
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
