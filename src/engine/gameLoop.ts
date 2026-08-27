export interface GameLoopCallbacks {
  /**
   * Aktualisiert den Spielzustand.
   * @param dt Vergangene Zeit seit dem letzten Frame in Sekunden.
   */
  update: (dt: number) => void;
  /** Zeichnet den aktuellen Zustand. */
  render: (ctx: CanvasRenderingContext2D) => void;
}

export interface GameLoop {
  start: () => void;
  stop: () => void;
  readonly running: boolean;
}

/** Maximale Frame-Zeit (~15 fps). Verhindert grosse Sprünge nach Tab-Wechseln,
 *  die sonst zu "Tunneling" bei der späteren Kollisionsprüfung führen würden. */
const MAX_DT = 1 / 15;

/**
 * `requestAnimationFrame`-basierter Game-Loop mit Delta-Time — konzeptionell
 * wie der `gameLoop` im Scopa-Projekt, aber mit an `update(dt)` weitergereichter
 * Frame-Zeit: Wormfied hat im Gegensatz zu Scopa kontinuierliche Bewegung und
 * Kollisionsprüfung pro Frame, die framerate-unabhängig laufen muss.
 *
 * `update` und `render` werden als Callbacks übergeben, damit die spätere
 * Spiellogik sauber angehängt werden kann.
 */
export function createGameLoop(
  ctx: CanvasRenderingContext2D,
  { update, render }: GameLoopCallbacks,
): GameLoop {
  let rafId = 0;
  let lastTime = 0;
  let hasLastTime = false;
  let running = false;

  function frame(now: number): void {
    if (!running) return;

    const dt = hasLastTime ? Math.min((now - lastTime) / 1000, MAX_DT) : 0;
    lastTime = now;
    hasLastTime = true;

    update(dt);
    render(ctx);

    rafId = requestAnimationFrame(frame);
  }

  return {
    start(): void {
      if (running) return;
      running = true;
      hasLastTime = false;
      rafId = requestAnimationFrame(frame);
    },
    stop(): void {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    },
    get running(): boolean {
      return running;
    },
  };
}
