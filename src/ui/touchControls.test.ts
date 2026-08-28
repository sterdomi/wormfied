import { describe, it, expect } from 'vitest';
import { vectorToDirection } from './touchControls';

describe('vectorToDirection (Instruktion 19)', () => {
  it('reiner Rechts-Vektor: nur right', () => {
    expect(vectorToDirection(50, 0, 6)).toEqual({
      up: false,
      down: false,
      left: false,
      right: true,
    });
  });

  it('reiner Links-/Hoch-/Runter-Vektor: jeweils nur die eine Richtung', () => {
    expect(vectorToDirection(-50, 0, 6)).toEqual({
      up: false,
      down: false,
      left: true,
      right: false,
    });
    expect(vectorToDirection(0, -50, 6)).toEqual({
      up: true,
      down: false,
      left: false,
      right: false,
    });
    expect(vectorToDirection(0, 50, 6)).toEqual({
      up: false,
      down: true,
      left: false,
      right: false,
    });
  });

  it('Vektor innerhalb der Dead Zone: alle Richtungen false', () => {
    expect(vectorToDirection(2, 3, 6)).toEqual({
      up: false,
      down: false,
      left: false,
      right: false,
    });
  });

  it('Vektor genau auf dem Dead-Zone-Rand zählt noch als "innerhalb" (keine Richtung)', () => {
    expect(vectorToDirection(6, 0, 6)).toEqual({
      up: false,
      down: false,
      left: false,
      right: false,
    });
  });

  it('diagonaler Vektor: die dominante Achse gewinnt', () => {
    // stärker horizontal als vertikal ausgelenkt → right
    expect(vectorToDirection(40, 10, 6)).toEqual({
      up: false,
      down: false,
      left: false,
      right: true,
    });
    // stärker vertikal als horizontal ausgelenkt → down
    expect(vectorToDirection(10, 40, 6)).toEqual({
      up: false,
      down: true,
      left: false,
      right: false,
    });
  });
});
