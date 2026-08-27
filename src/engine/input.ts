export type InputDirection = 'up' | 'down' | 'left' | 'right';

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
  /** True, solange die logische Richtungstaste gedrückt ist. */
  isDown: (dir: InputDirection) => boolean;
  /** Mausposition in CSS-Pixeln relativ zur oberen linken Canvas-Ecke. */
  readonly pointer: Readonly<{ x: number; y: number }>;
  dispose: () => void;
}

/**
 * Minimales Desktop-Input-Handling (Tastatur + Maus). Erfasst nur den
 * Eingabezustand — noch ohne Spiellogik. Touch/Gamepad folgen später.
 */
export function setupInput(target: HTMLElement): InputState {
  const pressed = new Set<InputDirection>();
  const pointer = { x: 0, y: 0 };

  const onKeyDown = (e: KeyboardEvent): void => {
    const dir = KEY_MAP[e.code];
    if (dir) pressed.add(dir);
  };

  const onKeyUp = (e: KeyboardEvent): void => {
    const dir = KEY_MAP[e.code];
    if (dir) pressed.delete(dir);
  };

  const onBlur = (): void => pressed.clear();

  const onPointerMove = (e: PointerEvent): void => {
    const rect = target.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  target.addEventListener('pointermove', onPointerMove);

  return {
    isDown: (dir) => pressed.has(dir),
    pointer,
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      target.removeEventListener('pointermove', onPointerMove);
    },
  };
}
