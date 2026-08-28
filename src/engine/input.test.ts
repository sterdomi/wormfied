// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { setupInput } from './input';

function press(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code }));
}
function release(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { code }));
}

describe('setupInput – drawJustPressed (Instruktion 15)', () => {
  it('ist nur im Frame des tatsächlichen Tastendrucks true, nicht bei fortgesetztem Halten', () => {
    const input = setupInput();

    input.tick();
    expect(input.state.drawJustPressed).toBe(false); // noch nichts gedrückt

    press('Space');
    input.tick();
    expect(input.state.drawJustPressed).toBe(true); // frisch gedrückt

    input.tick(); // weiterhin gehalten, aber kein neuer keydown
    expect(input.state.drawJustPressed).toBe(false);
    input.tick();
    expect(input.state.drawJustPressed).toBe(false); // bleibt false, solange gehalten

    release('Space');
    input.tick();
    expect(input.state.drawJustPressed).toBe(false);

    press('Space');
    input.tick();
    expect(input.state.drawJustPressed).toBe(true); // erneuter Druck → wieder true

    input.dispose();
  });

  it('zählt mehrfache keydown-Events während gehaltener Taste (Browser-Key-Repeat) nicht als erneuten Druck', () => {
    const input = setupInput();

    press('Space');
    input.tick();
    expect(input.state.drawJustPressed).toBe(true);

    // Simuliert OS-Key-Repeat: weitere keydown-Events, ohne Loslassen dazwischen.
    press('Space');
    press('Space');
    input.tick();
    expect(input.state.drawJustPressed).toBe(false);

    input.dispose();
  });

  it('setzt den gehaltenen Zustand bei Fokusverlust zurück', () => {
    const input = setupInput();
    press('Space');
    input.tick();
    expect(input.state.drawJustPressed).toBe(true);

    window.dispatchEvent(new Event('blur'));
    input.tick();
    expect(input.state.drawJustPressed).toBe(false);

    // Ohne erneuten Druck bleibt es false – kein "Nachzucken" nach dem Blur.
    input.tick();
    expect(input.state.drawJustPressed).toBe(false);

    input.dispose();
  });
});
