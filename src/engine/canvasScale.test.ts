import { describe, it, expect } from 'vitest';
import { calculateCanvasScale } from './canvasScale';

describe('calculateCanvasScale (Instruktion 20)', () => {
  it('quadratischer Viewport mit breiterem Logik-Format ergibt Letterbox-Offsets oben/unten', () => {
    // Viewport 600×600 (quadratisch), Logik-Inhalt 800×600 (breiter als hoch)
    // → die Breite ist der bindende Faktor, oben/unten bleibt Platz übrig.
    const result = calculateCanvasScale(600, 600, 800, 600);
    expect(result.scale).toBeCloseTo(0.75);
    expect(result.offsetX).toBeCloseTo(0);
    expect(result.offsetY).toBeCloseTo(75);
  });

  it('breiter, kurzer Viewport (typisches Phone im Querformat) ergibt Letterbox-Offsets seitlich', () => {
    // Wormfied zwingt via Orientation-Hinweis zum Querformat gespielt zu
    // werden (siehe orientationWarning.ts) – ein reales Phone-Querformat ist
    // dabei oft schlanker (16:9, hier 667×375) als das 4:3-nahe Logik-Format
    // (800×600) des Spielfeld-Blocks, daher hier die realistischere
    // "seitliche Balken"-Variante statt eines Hochformat-Viewports (der bei
    // fixem Breitformat-Inhalt IMMER zu oben/unten-Balken führt, nie zu
    // seitlichen – das wäre ein in sich widersprüchliches Testszenario).
    const result = calculateCanvasScale(667, 375, 800, 600);
    expect(result.scale).toBeCloseTo(0.625);
    expect(result.offsetX).toBeCloseTo(83.5);
    expect(result.offsetY).toBeCloseTo(0);
  });
});
