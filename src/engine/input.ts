export type InputDirection = 'up' | 'down' | 'left' | 'right';

/** Live-Tastenzustand: pro Richtung `true`, solange die Taste gedrückt ist. */
export type KeyState = Record<InputDirection, boolean>;

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

export interface InputState {
  /**
   * Objekt mit dem aktuellen Druckzustand je Richtung. Wird in-place
   * aktualisiert – Referenz einmal holen und pro Frame auslesen.
   */
  readonly keys: Readonly<KeyState>;
  dispose: () => void;
}

/**
 * Minimales Desktop-Keyboard-Handling für die Rand-Steuerung: Pfeiltasten und
 * WASD. Kein Diagonal-Handling nötig, da sich der Spieler nur entlang der
 * Feldkanten bewegt.
 */
export function setupInput(): InputState {
  const keys: KeyState = { up: false, down: false, left: false, right: false };

  const setKey = (code: string, pressed: boolean): void => {
    const dir = KEY_MAP[code];
    if (dir) keys[dir] = pressed;
  };

  const onKeyDown = (e: KeyboardEvent): void => setKey(e.code, true);
  const onKeyUp = (e: KeyboardEvent): void => setKey(e.code, false);
  // Fokusverlust: sonst "klebt" eine Taste, deren keyup das Fenster nie erreicht.
  const onBlur = (): void => {
    keys.up = keys.down = keys.left = keys.right = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return {
    keys,
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    },
  };
}
