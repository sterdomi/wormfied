export type InputDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Abstrakter Eingabezustand, den die Spiellogik liest. Bewusst OHNE Bezug zu
 * Tastencodes oder Events: der Keyboard-Handler unten befüllt ihn, später
 * könnten Gamepad-, Touch- oder Joystick-Handler denselben Zustand befüllen,
 * ohne dass `player.ts` / `playerMovement.ts` / `drawing.ts` angefasst werden.
 */
export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  /**
   * `true` NUR in dem einen Frame, in dem die Leertaste frisch gedrückt wurde
   * (steigende Flanke) – nicht bei durchgehendem Halten (Instruktion 15,
   * löst das haltebasierte Modell aus Instruktion 3 ab). Bedeutung ist
   * kontextabhängig in der Spiellogik: Abdocken/Abbrechen auf dem Rand,
   * Tap-to-Fire beim Zeichnen.
   *
   * Input-quellen-agnostisch: jede Eingabequelle, die `InputState` befüllt
   * (Gamepad-Knopf, Touch-Tap), profitiert vom selben Mechanismus – die
   * Spiellogik liest nur dieses Feld, nie einen rohen "gehalten"-Zustand.
   */
  drawJustPressed: boolean;
  /** Neustart nach Game Over gewünscht. Keyboard: Enter. */
  restart: boolean;
}

export interface InputHandle {
  /** In-place aktualisierter Zustand – Referenz einmal holen, pro Frame lesen. */
  readonly state: Readonly<InputState>;
  /**
   * Einmal pro Frame VOR dem Lesen von `state` aufrufen (z.B. am Anfang von
   * `update(dt)`): berechnet `drawJustPressed` für diesen Frame durch
   * Vergleich des vorherigen mit dem aktuellen Leertasten-Zustand und
   * setzt es danach wieder zurück, bis erneut gedrückt wird.
   */
  tick: () => void;
  dispose: () => void;
}

const KEY_MAP: Readonly<Record<string, InputDirection>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

/**
 * Desktop-Keyboard-Handler: übersetzt Pfeiltasten/WASD → Richtungen, Leertaste
 * → `drawJustPressed` (Flanke, s.u.) und Enter → `restart`. Die Spiellogik
 * kennt nur `InputState`, nicht die konkreten Tasten.
 */
export function setupInput(): InputHandle {
  const state: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    drawJustPressed: false,
    restart: false,
  };
  // Roher (gehaltener) Leertasten-Zustand – bewusst NICHT Teil von
  // `InputState`: seit Instruktion 15 braucht die Spiellogik nur noch die
  // Flanke (`drawJustPressed`), kein durchgehendes Halten mehr. Dieser Wert
  // lebt rein intern zur Flankenerkennung in `tick()`.
  let drawHeld = false;
  let wasDrawHeld = false;

  const setDirection = (code: string, pressed: boolean): void => {
    const dir = KEY_MAP[code];
    if (dir) state[dir] = pressed;
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      drawHeld = true;
      e.preventDefault(); // Seiten-Scroll durch Leertaste unterdrücken
      return;
    }
    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      state.restart = true;
      return;
    }
    setDirection(e.code, true);
  };

  const onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      drawHeld = false;
      return;
    }
    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      state.restart = false;
      return;
    }
    setDirection(e.code, false);
  };

  // Fokusverlust: sonst "klebt" eine Taste, deren keyup das Fenster nie erreicht.
  const onBlur = (): void => {
    state.up = state.down = state.left = state.right = false;
    drawHeld = false;
    state.restart = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return {
    state,
    tick(): void {
      state.drawJustPressed = drawHeld && !wasDrawHeld;
      wasDrawHeld = drawHeld;
    },
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    },
  };
}
