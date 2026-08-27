import { loadLevelImages, type LevelImages } from '../engine/assetLoader';
import { setupCanvas } from '../engine/canvas';
import { createGameLoop } from '../engine/gameLoop';
import { setupInput } from '../engine/input';
import { advanceDrawing, beginDrawing, EdgeTrigger, type DrawSession } from '../game/drawing';
import { createRectangularField, type Point } from '../game/field';
import { createForegroundLayer, type ForegroundLayer } from '../game/foregroundLayer';
import { LEVEL_1 } from '../game/level';
import { type DrawnLine } from '../game/line';
import { Player } from '../game/player';
import { movePlayerAlongEdge } from '../game/playerMovement';
import { applyCompletedLine } from '../game/polygon';
import { t } from '../i18n';
import '../styles/main.css';

// Abstand des Spielfelds zum Fensterrand, damit der Umriss nicht abgeschnitten
// wird. Später über CSS-Variablen / Theme steuerbar.
const FIELD_MARGIN = 40;
const COLOR_BACKDROP = '#0b0e14';
const COLOR_FIELD_EDGE = '#3b4252';
const COLOR_HUD = '#e5e9f0';
// Auf dem Rand angedockt = rot; ins Feld gefahren und am Zeichnen = grün.
const COLOR_ON_EDGE = '#bf616a';
const COLOR_DRAWING = '#a3be8c';
const PLAYER_RADIUS = 7;

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

function start(canvas: HTMLCanvasElement, assets: LevelImages): void {
  const player = new Player();
  // Kanal für abgeschlossene Linien aus `advanceDrawing`; sie werden noch im
  // selben Frame verarbeitet (Feld-Split) und danach aus der Liste entfernt.
  const completedLines: DrawnLine[] = [];
  let session: DrawSession | null = null;
  // Die Leertaste löst das Verlassen des Rands nur auf ihrer steigenden Flanke aus.
  const drawTrigger = new EdgeTrigger();

  let field: Point[] = createRectangularField(1, 1);
  let fieldWidth = 1;
  let fieldHeight = 1;
  let foreground: ForegroundLayer = createForegroundLayer(assets.foreground, 1, 1);

  function rebuildField(width: number, height: number): void {
    fieldWidth = Math.max(1, width - FIELD_MARGIN * 2);
    fieldHeight = Math.max(1, height - FIELD_MARGIN * 2);
    // ÜBERGANGSLÖSUNG (wie in Instruktion 4): Ein Resize setzt das Feld auf das
    // volle Rechteck zurück und baut den Foreground neu auf – bereits eroberte
    // Flächen / Ausschnitte gehen dabei verloren. Ein späterer Schritt kann die
    // Split-Polygone stattdessen mitskalieren.
    field = createRectangularField(fieldWidth, fieldHeight);
    if (player.mode === 'onEdge') player.syncPosition(field);
    foreground = createForegroundLayer(assets.foreground, fieldWidth, fieldHeight);
  }

  /**
   * Eine abgeschlossene Linie ins Feld einrechnen: Polygon splitten, eroberte
   * Seite bestimmen, aktives Feld + Spieler-Randzustand aktualisieren und die
   * gesamte eroberte Fläche aus dem Foreground entfernen.
   */
  function handleCompletedLine(linePoints: Point[]): void {
    const result = applyCompletedLine(field, linePoints);
    field = result.active;
    player.segmentIndex = result.playerSegmentIndex;
    player.segmentProgress = result.playerSegmentProgress;
    player.syncPosition(field);
    foreground.carveRegion(result.claimed);
  }

  const view = setupCanvas(canvas, { onResize: rebuildField });
  const input = setupInput();
  rebuildField(view.width, view.height);

  document.title = t('gameTitle');

  function update(dt: number): void {
    // Genau einmal pro Frame auswerten (der Detektor merkt sich den Vorzustand).
    const drawPressed = drawTrigger.pressed(input.state.draw);
    const prevPos = { x: player.position.x, y: player.position.y };
    // Ob der befahrene Pfad diesen Frame ausgeschnitten werden soll: nur wenn
    // der Spieler sich wirklich vom Rand gelöst hat (vor ODER nach dem Schritt).
    let carve = session?.hasLeftEdge === true;

    if (player.mode === 'onEdge') {
      session = beginDrawing(player, drawPressed);
      if (!session) {
        movePlayerAlongEdge(player, field, input.state, dt);
      }
    }

    if (player.mode === 'drawing') {
      if (!session) {
        player.mode = 'onEdge'; // defensiv, z.B. nach HMR
      } else {
        const before = completedLines.length;
        if (advanceDrawing(session, player, field, input.state, dt, completedLines)) {
          session = null;
          // Neu abgeschlossene Linie(n) sofort verarbeiten und aus dem Kanal
          // nehmen (nach dem Split sind sie Teil der Feld-Polygon-Kanten).
          completedLines.splice(before).forEach((line) => handleCompletedLine(line.points));
        }
      }
    }

    carve = carve || session?.hasLeftEdge === true;
    if (carve && (prevPos.x !== player.position.x || prevPos.y !== player.position.y)) {
      // Pfadbasiertes Ausschneiden (Übergangslösung, siehe foregroundLayer.ts):
      // Instruktion 5 ersetzt das durch polygon-exaktes Ausschneiden.
      foreground.carvePath(prevPos.x, prevPos.y, player.position.x, player.position.y);
    }
  }

  function strokePolyline(ctx: CanvasRenderingContext2D, points: Point[]): void {
    if (points.length === 0) return;
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }

  function render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLOR_BACKDROP;
    ctx.fillRect(0, 0, view.width, view.height);

    ctx.save();
    ctx.translate(FIELD_MARGIN, FIELD_MARGIN);
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

    // Aktuell gezeichnete Linie (grün): aufgezeichnete Punkte + live bis zum Spieler.
    if (session) {
      ctx.strokeStyle = COLOR_DRAWING;
      ctx.lineWidth = 3;
      strokePolyline(ctx, [...session.line.points, player.position]);
    }

    // Spieler: rot am Rand, grün beim Zeichnen.
    ctx.beginPath();
    ctx.arc(player.position.x, player.position.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = player.mode === 'drawing' ? COLOR_DRAWING : COLOR_ON_EDGE;
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = COLOR_HUD;
    ctx.font = '16px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(t('gameTitle'), 16, 16);
  }

  const loop = createGameLoop(view.ctx, { update, render });
  loop.start();

  // Vite HMR: laufende Ressourcen beim Hot-Reload sauber abbauen.
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      loop.stop();
      input.dispose();
      view.dispose();
    });
  }
}

async function boot(): Promise<void> {
  showLoading(gameCanvas);
  const assets = await loadLevelImages(LEVEL_1);
  start(gameCanvas, assets);
}

void boot().catch((err: unknown) => {
  console.error('Wormfied konnte nicht starten:', err);
  const ctx = gameCanvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = COLOR_BACKDROP;
  ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
  ctx.fillStyle = COLOR_ON_EDGE;
  ctx.font = '16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(err), gameCanvas.width / 2, gameCanvas.height / 2);
});
