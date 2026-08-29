export interface CanvasView {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** Breite der Zeichenfläche in CSS-Pixeln (unabhängig von devicePixelRatio). */
  width: number;
  /** Höhe der Zeichenfläche in CSS-Pixeln. */
  height: number;
  /** Entfernt den Resize-Listener. */
  dispose: () => void;
}

export interface CanvasSetupOptions {
  /** Wird nach jedem Resize mit der neuen CSS-Pixel-Grösse aufgerufen. */
  onResize?: (width: number, height: number) => void;
}

/**
 * Richtet ein Canvas samt 2D-Context ein und hält die Backing-Store-Auflösung
 * bei Fenstergrössen-Änderungen scharf: die Pixel-Dimensionen werden mit
 * `devicePixelRatio` multipliziert und der Context entsprechend skaliert.
 *
 * Dadurch kann der restliche Code durchgehend in CSS-Pixeln zeichnen, ohne
 * `devicePixelRatio` selbst zu berücksichtigen.
 */
export function setupCanvas(
  canvas: HTMLCanvasElement,
  options: CanvasSetupOptions = {},
): CanvasView {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D-Context konnte nicht erstellt werden.');
  }

  const view: CanvasView = {
    canvas,
    ctx,
    width: 0,
    height: 0,
    dispose: () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
    },
  };

  function resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || window.innerWidth;
    const cssHeight = canvas.clientHeight || window.innerHeight;

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    // Eine Zeichen-Einheit == ein CSS-Pixel.
    view.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    view.width = cssWidth;
    view.height = cssHeight;
    options.onResize?.(cssWidth, cssHeight);
  }

  resize();
  window.addEventListener('resize', resize);
  // Zusätzlich zu 'resize' (Instruktion 20, Punkt 1): manche mobilen Browser
  // feuern bei einer Drehung ein 'orientationchange' ohne (bzw. mit
  // verzögertem) 'resize', v.a. bevor sich `clientWidth`/`clientHeight` auf
  // die neue Ausrichtung eingestellt haben.
  window.addEventListener('orientationchange', resize);

  return view;
}
