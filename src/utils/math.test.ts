import { describe, it, expect } from 'vitest';
import { clamp, lerp } from './math';

describe('clamp', () => {
  it('lässt Werte innerhalb des Intervalls unverändert', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('begrenzt nach unten und oben', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });
});

describe('lerp', () => {
  it('liefert die Endpunkte bei t = 0 und t = 1', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('interpoliert die Mitte bei t = 0.5', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});
