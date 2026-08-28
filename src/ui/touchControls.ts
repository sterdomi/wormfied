/**
 * Mobile Touch-Steuerung (Instruktion 19): virtueller Joystick unten links +
 * Action-Button unten rechts, als HTML-Overlay über dem Canvas (nicht ins
 * Canvas gezeichnet – einfacher zu positionieren/stylen, gleiche Technik wie
 * `hud.ts`). Bewusst nur eine ZUSÄTZLICHE Eingabequelle: befüllt dieselbe
 * Zustandsform wie die Tastatur, verändert keine bestehende Bewegungs-/
 * Zeichenlogik. Das Zusammenführen mit dem Tastatur-Zustand passiert in
 * `engine/input.ts`.
 */

/**
 * `restart` teilt sich den Action-Button mit `drawJustPressed` (Nutzer-
 * Feedback: ein Tap soll auch als "Enter" zählen) – beide werden vom
 * selben rohen `actionHeld`-Zustand abgeleitet. Das überschneidet sich
 * nicht: `drawJustPressed` wird nur während einer laufenden Partie
 * gelesen, `restart` nur auf dem eingefrorenen Game-Over-/Level-Complete-
 * bzw. dem Startbildschirm (dort läuft keine Bewegungs-/Zeichenlogik, die
 * ein gleichzeitig "gehaltenes" `restart` stören könnte).
 */
export interface TouchInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  drawJustPressed: boolean;
  restart: boolean;
}

export interface TouchControlsHandle {
  readonly state: Readonly<TouchInputState>;
  /** Wie bei der Tastatur: einmal pro Frame vor dem Lesen von `state` aufrufen. */
  tick: () => void;
  dispose: () => void;
}

export interface DirectionFlags {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

const NO_DIRECTION: DirectionFlags = { up: false, down: false, left: false, right: false };

/**
 * Übersetzt einen Auslenkungsvektor (Bildschirmkoordinaten, y nach unten) in
 * eine der vier Vier-Wege-Richtungen (dominante Achse gewinnt bei einem
 * diagonalen Vektor, analog zur bestehenden Vier-Wege-Bewegung – keine
 * 8-Wege-Logik). Liegt der Vektor innerhalb `deadZoneRadius` um den
 * Nullpunkt, sind alle Richtungen `false` (Zittern bei minimalen
 * Fingerbewegungen unterdrücken).
 */
export function vectorToDirection(dx: number, dy: number, deadZoneRadius: number): DirectionFlags {
  if (Math.hypot(dx, dy) <= deadZoneRadius) return NO_DIRECTION;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return { ...NO_DIRECTION, [dx > 0 ? 'right' : 'left']: true };
  }
  return { ...NO_DIRECTION, [dy > 0 ? 'down' : 'up']: true };
}

/** `pointer: coarse` + `ontouchstart` statt Bildschirmbreite – schliesst
 *  grosse Tablets nicht fälschlich aus bzw. schmale Desktop-Fenster nicht
 *  fälschlich ein (Instruktion 19, Punkt 1). Defensiv gegenüber Umgebungen
 *  ohne `matchMedia` (z.B. jsdom in Tests, sehr alte Browser) – dann gilt
 *  das Gerät als nicht touch-fähig statt einen Fehler zu werfen. */
export function isTouchCapable(): boolean {
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: coarse)').matches && 'ontouchstart' in window;
}

const JOYSTICK_MAX_RADIUS = 40;
const JOYSTICK_DEAD_ZONE_RADIUS = JOYSTICK_MAX_RADIUS * 0.15;

function findTouch(list: TouchList, id: number | null): Touch | null {
  if (id === null) return null;
  for (let i = 0; i < list.length; i++) {
    if (list[i].identifier === id) return list[i];
  }
  return null;
}

/** No-op-Stub für Nicht-Touch-Geräte: keine DOM-Elemente, kein leerer Platz,
 *  keine unsichtbaren Hitboxen. */
function createNoopHandle(): TouchControlsHandle {
  return {
    state: {
      up: false,
      down: false,
      left: false,
      right: false,
      drawJustPressed: false,
      restart: false,
    },
    tick: () => {},
    dispose: () => {},
  };
}

export function setupTouchControls(): TouchControlsHandle {
  if (!isTouchCapable()) return createNoopHandle();

  const state: TouchInputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    drawJustPressed: false,
    restart: false,
  };

  // Joystick: feste Basis-Position (erscheint NICHT dort, wo der Finger
  // zuerst aufsetzt – vorhersehbarer für ein Arcade-Spiel).
  const joystickBase = document.createElement('div');
  joystickBase.className = 'touch-joystick';
  const joystickKnob = document.createElement('div');
  joystickKnob.className = 'touch-joystick__knob';
  joystickBase.append(joystickKnob);

  const actionButton = document.createElement('button');
  actionButton.type = 'button';
  actionButton.className = 'touch-action-button';
  actionButton.textContent = '●'; // Platzhalter-Icon, siehe Instruktion
  actionButton.setAttribute('aria-hidden', 'true'); // rein für Touch, kein Tastatur-/Screenreader-Ziel

  document.body.append(joystickBase, actionButton);

  // Multi-Touch (Punkt 5): Joystick und Button tracken JEWEILS ihre eigene
  // `touch.identifier`, damit sie gleichzeitig bedienbar sind, ohne sich
  // gegenseitig zu überschreiben.
  let joystickTouchId: number | null = null;
  let actionTouchId: number | null = null;
  let actionHeld = false;
  let wasActionHeld = false;

  function updateJoystick(touch: Touch): void {
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;

    const dir = vectorToDirection(dx, dy, JOYSTICK_DEAD_ZONE_RADIUS);
    state.up = dir.up;
    state.down = dir.down;
    state.left = dir.left;
    state.right = dir.right;

    const distance = Math.min(Math.hypot(dx, dy), JOYSTICK_MAX_RADIUS);
    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * distance;
    const knobY = Math.sin(angle) * distance;
    joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
  }

  function resetJoystick(): void {
    state.up = state.down = state.left = state.right = false;
    joystickKnob.style.transform = '';
  }

  const onJoystickStart = (e: TouchEvent): void => {
    if (joystickTouchId !== null) return; // schon ein aktiver Joystick-Touch
    const touch = e.changedTouches[0];
    joystickTouchId = touch.identifier;
    updateJoystick(touch);
    e.preventDefault();
  };
  const onJoystickMove = (e: TouchEvent): void => {
    const touch = findTouch(e.changedTouches, joystickTouchId);
    if (!touch) return;
    updateJoystick(touch);
    e.preventDefault();
  };
  const onJoystickEnd = (e: TouchEvent): void => {
    const touch = findTouch(e.changedTouches, joystickTouchId);
    if (!touch) return;
    joystickTouchId = null;
    resetJoystick();
    e.preventDefault();
  };

  const onActionStart = (e: TouchEvent): void => {
    if (actionTouchId !== null) return; // schon ein aktiver Button-Touch
    const touch = e.changedTouches[0];
    actionTouchId = touch.identifier;
    actionHeld = true;
    actionButton.classList.add('touch-action-button--active');
    e.preventDefault();
  };
  const onActionEnd = (e: TouchEvent): void => {
    const touch = findTouch(e.changedTouches, actionTouchId);
    if (!touch) return;
    actionTouchId = null;
    actionHeld = false;
    actionButton.classList.remove('touch-action-button--active');
    e.preventDefault();
  };

  // `passive: false`, da `preventDefault()` (Scroll/Zoom unterdrücken) nötig
  // ist – `touch-action: none` im CSS ist die zweite Absicherung.
  const touchOpts: AddEventListenerOptions = { passive: false };
  joystickBase.addEventListener('touchstart', onJoystickStart, touchOpts);
  joystickBase.addEventListener('touchmove', onJoystickMove, touchOpts);
  joystickBase.addEventListener('touchend', onJoystickEnd, touchOpts);
  joystickBase.addEventListener('touchcancel', onJoystickEnd, touchOpts);

  actionButton.addEventListener('touchstart', onActionStart, touchOpts);
  actionButton.addEventListener('touchend', onActionEnd, touchOpts);
  actionButton.addEventListener('touchcancel', onActionEnd, touchOpts);

  return {
    state,
    tick(): void {
      // Gleicher Flanken-Mechanismus wie die Tastatur (Instruktion 15, Punkt
      // 1): `drawJustPressed` nur in dem einen Frame nach `touchstart`, nicht
      // erneut beim Loslassen.
      state.drawJustPressed = actionHeld && !wasActionHeld;
      wasActionHeld = actionHeld;
      // Tap auf den Action-Button zählt auch als "Enter" (Nutzer-Feedback) –
      // roh gehalten wie bei der Tastatur, die Flankenerkennung übernimmt
      // main.ts' `restartTrigger` (EdgeTrigger) für beide Quellen gleich.
      state.restart = actionHeld;
    },
    dispose(): void {
      joystickBase.removeEventListener('touchstart', onJoystickStart);
      joystickBase.removeEventListener('touchmove', onJoystickMove);
      joystickBase.removeEventListener('touchend', onJoystickEnd);
      joystickBase.removeEventListener('touchcancel', onJoystickEnd);
      actionButton.removeEventListener('touchstart', onActionStart);
      actionButton.removeEventListener('touchend', onActionEnd);
      actionButton.removeEventListener('touchcancel', onActionEnd);
      joystickBase.remove();
      actionButton.remove();
    },
  };
}
