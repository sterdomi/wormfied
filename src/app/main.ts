import { setupCanvas } from '../engine/canvas';
import { createGameLoop } from '../engine/gameLoop';
import { setupInput } from '../engine/input';
import { t } from '../i18n';
import '../styles/main.css';

const canvasEl = document.querySelector<HTMLCanvasElement>('#game');
if (!canvasEl) {
  throw new Error('Canvas-Element #game nicht gefunden.');
}

const view = setupCanvas(canvasEl);
const input = setupInput(canvasEl);

document.title = t('gameTitle');

// --- Platzhalter-Zustand ---------------------------------------------------
// Ein einzelner Testkreis, der über die Fläche wandert und an den Rändern
// abprallt. Belegt nur, dass Loop + Delta-Time + Rendering zusammenspielen —
// wird in einem späteren Auftrag durch echte Spiellogik ersetzt.
const circle = {
  x: 140,
  y: 140,
  radius: 24,
  vx: 190, // CSS-Pixel pro Sekunde
  vy: 150,
};

function update(dt: number): void {
  circle.x += circle.vx * dt;
  circle.y += circle.vy * dt;

  if (circle.x - circle.radius < 0) {
    circle.x = circle.radius;
    circle.vx = Math.abs(circle.vx);
  } else if (circle.x + circle.radius > view.width) {
    circle.x = view.width - circle.radius;
    circle.vx = -Math.abs(circle.vx);
  }

  if (circle.y - circle.radius < 0) {
    circle.y = circle.radius;
    circle.vy = Math.abs(circle.vy);
  } else if (circle.y + circle.radius > view.height) {
    circle.y = view.height - circle.radius;
    circle.vy = -Math.abs(circle.vy);
  }
}

function render(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, view.width, view.height);

  // Spielfeldrahmen — hier bewegt sich der Spieler später sicher entlang.
  ctx.strokeStyle = '#3b4252';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, view.width - 4, view.height - 4);

  // Testkreis.
  ctx.beginPath();
  ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#88c0d0';
  ctx.fill();

  // i18n-Platzhalter.
  ctx.fillStyle = '#e5e9f0';
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
