import { setupCanvas } from '../engine/canvas';
import { createGameLoop } from '../engine/gameLoop';
import { setupInput } from '../engine/input';
import { advanceDrawing, beginDrawing, EdgeTrigger, type DrawSession } from '../game/drawing';
import { createRectangularField, type Point } from '../game/field';
import { type DrawnLine } from '../game/line';
import { Player } from '../game/player';
import { movePlayerAlongEdge } from '../game/playerMovement';
import { t } from '../i18n';
import '../styles/main.css';

// Abstand des Spielfelds zum Fensterrand, damit der Umriss nicht abgeschnitten
// wird. Später über CSS-Variablen / Theme steuerbar.
const FIELD_MARGIN = 40;
const COLOR_FIELD_EDGE = '#3b4252';
const COLOR_HUD = '#e5e9f0';
// Auf dem Rand angedockt = rot; ins Feld gefahren und am Zeichnen = grün.
const COLOR_ON_EDGE = '#bf616a';
const COLOR_DRAWING = '#a3be8c';
const COLOR_COMPLETED_LINE = '#d08770';
const PLAYER_RADIUS = 7;

const canvasEl = document.querySelector<HTMLCanvasElement>('#game');
if (!canvasEl) {
  throw new Error('Canvas-Element #game nicht gefunden.');
}

let field: Point[] = createRectangularField(1, 1);
const player = new Player();
// Abgeschlossene Linien werden gesammelt und dauerhaft gezeichnet, aber in
// diesem Schritt noch NICHT ins Feld-Polygon eingerechnet (das ist Instruktion 4).
const completedLines: DrawnLine[] = [];
let session: DrawSession | null = null;
// Die Leertaste löst das Verlassen des Rands nur auf ihrer steigenden Flanke aus.
const drawTrigger = new EdgeTrigger();

/** Feld an die aktuelle Canvas-Grösse anpassen und Spielerposition nachziehen. */
function rebuildField(width: number, height: number): void {
  field = createRectangularField(
    Math.max(1, width - FIELD_MARGIN * 2),
    Math.max(1, height - FIELD_MARGIN * 2),
  );
  if (player.mode === 'onEdge') player.syncPosition(field);
}

const view = setupCanvas(canvasEl, { onResize: rebuildField });
const input = setupInput();
rebuildField(view.width, view.height);

document.title = t('gameTitle');

function update(dt: number): void {
  // Genau einmal pro Frame auswerten (der Detektor merkt sich den Vorzustand).
  const drawPressed = drawTrigger.pressed(input.state.draw);

  if (player.mode === 'onEdge') {
    // Auf dem Rand: mit frisch gedrückter Leertaste vom Rand lösen ("grün") …
    session = beginDrawing(player, drawPressed);
    // … sonst normal am Rand entlanglaufen.
    if (!session) {
      movePlayerAlongEdge(player, field, input.state, dt);
    }
  }

  if (player.mode === 'drawing') {
    if (!session) {
      // Defensiv (z.B. nach HMR): ohne Session kein Zeichnen.
      player.mode = 'onEdge';
    } else if (advanceDrawing(session, player, field, input.state, dt, completedLines)) {
      session = null; // Linie hat den Rand erreicht, Spieler ist wieder onEdge.
    }
  }
}

function strokePolyline(ctx: CanvasRenderingContext2D, points: Point[]): void {
  if (points.length === 0) return;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

function render(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, view.width, view.height);

  ctx.save();
  ctx.translate(FIELD_MARGIN, FIELD_MARGIN);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Spielfeld-Umriss (aktuell ein Rechteck, später ein komplexeres Polygon).
  ctx.strokeStyle = COLOR_FIELD_EDGE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  field.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();

  // Abgeschlossene Linien.
  ctx.strokeStyle = COLOR_COMPLETED_LINE;
  ctx.lineWidth = 2;
  completedLines.forEach((line) => strokePolyline(ctx, line.points));

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
