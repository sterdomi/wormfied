/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// Kein Framework-Plugin: reines Vanilla-TS + Canvas.
export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  test: {
    // Die spätere Geometrie-Logik (Punkt-in-Polygon, Fläche, Linien-Kollision)
    // ist reine Mathematik und braucht kein DOM. Bei Bedarf auf 'jsdom' wechseln.
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
