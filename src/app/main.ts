import { setupCanvas } from '../engine/canvas';
import { createGameLoop } from '../engine/gameLoop';
import { setupInput } from '../engine/input';
import { createRectangularField, type Point } from '../game/field';
import { Player } from '../game/player';
import { movePlayerAlongEdge } from '../game/playerMovement';
import { t } from '../i18n';
import '../styles/main.css';

// Abstand des Spielfelds zum Fensterrand, damit der Umriss nicht abgeschnitten
// wird. Später über CSS-Variablen / Theme steuerbar.
const FIELD_MARGIN = 40;
const COLOR_FIELD_EDGE = '#3b4252';
const COLOR_PLAYER = '#88c0d0';
const COLOR_HUD = '#e5e9f0';
const PLAYER_RADIUS = 7;

const canvasEl = document.querySelector<HTMLCanvasElement>('#game');
if (!canvasEl) {
  throw new Error('Canvas-Element #game nicht gefunden.');
}

let field: Point[] = createRectangularField(1, 1);
const player = new Player();

/** Feld an die aktuelle Canvas-Grösse anpassen und Spielerposition nachziehen. */
function rebuildField(width: number, height: number): void {
  field = createRectangularField(
    Math.max(1, width - FIELD_MARGIN * 2),
    Math.max(1, height - FIELD_MARGIN * 2),
  );
  player.syncPosition(field);
}

const view = setupCanvas(canvasEl, { onResize: rebuildField });
const input = setupInput();
rebuildField(view.width, view.height);

document.title = t('gameTitle');

function update(dt: number): void {
  movePlayerAlongEdge(player, field, input.keys, dt);
}

function render(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, view.width, view.height);

  ctx.save();
  ctx.translate(FIELD_MARGIN, FIELD_MARGIN);

  // Spielfeld-Umriss (aktuell ein Rechteck, später ein komplexeres Polygon).
  ctx.strokeStyle = COLOR_FIELD_EDGE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  field.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();

  // Spieler.
  ctx.beginPath();
  ctx.arc(player.position.x, player.position.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_PLAYER;
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
