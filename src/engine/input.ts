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
  /** "Ins Feld hineinfahren und zeichnen" gewünscht. Keyboard: Leertaste. */
  draw: boolean;
}

export interface InputHandle {
  /** In-place aktualisierter Zustand – Referenz einmal holen, pro Frame lesen. */
  readonly state: Readonly<InputState>;
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
 * Desktop-Keyboard-Handler: übersetzt Pfeiltasten/WASD → Richtungen und
 * Leertaste → `draw`. Die Spiellogik kennt nur `InputState`, nicht "Leertaste".
 */
export function setupInput(): InputHandle {
  const state: InputState = { up: false, down: false, left: false, right: false, draw: false };

  const setDirection = (code: string, pressed: boolean): void => {
    const dir = KEY_MAP[code];
    if (dir) state[dir] = pressed;
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      state.draw = true;
      e.preventDefault(); // Seiten-Scroll durch Leertaste unterdrücken
      return;
    }
    setDirection(e.code, true);
  };

  const onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      state.draw = false;
      return;
    }
    setDirection(e.code, false);
  };

  // Fokusverlust: sonst "klebt" eine Taste, deren keyup das Fenster nie erreicht.
  const onBlur = (): void => {
    state.up = state.down = state.left = state.right = state.draw = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return {
    state,
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    },
  };
}
