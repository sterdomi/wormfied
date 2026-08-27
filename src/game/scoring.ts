/**
 * Fortschritts-Zustand eines Levels: wie viel Fläche wurde schon erobert.
 *
 * `totalFieldArea` wird einmal beim Level-Start festgehalten (Fläche des
 * initialen Feld-Polygons). `claimedArea` zählt kumulativ hoch – bei jedem
 * Feld-Split wird die Fläche des eroberten Teilpolygons addiert (die dort in
 * `splitFieldByLine` bereits berechnet wird, siehe `polygon.ts`).
 *
 * Score, Leben und Runde folgen in späteren Instruktionen.
 */
export interface Scoring {
  readonly totalFieldArea: number;
  claimedArea: number;
}

export function createScoring(totalFieldArea: number): Scoring {
  return { totalFieldArea, claimedArea: 0 };
}

/**
 * Eroberter Anteil in Prozent (0–100), auf eine Nachkommastelle gerundet.
 * Reine Funktion – kein State, kein Rendering.
 */
export function getClaimedPercentage(claimedArea: number, totalFieldArea: number): number {
  if (totalFieldArea <= 0) return 0;
  const raw = (claimedArea / totalFieldArea) * 100;
  const clamped = Math.min(100, Math.max(0, raw));
  return Math.round(clamped * 10) / 10;
}

/**
 * Formatiert einen Prozentwert wie im Referenzbild: `NN.N%` mit einer
 * Nachkommastelle und führender Null (`01.0%`, `12.3%`, `100.0%`).
 * Erwartet einen Wert aus `getClaimedPercentage` (0–100).
 */
export function formatClaimedPercentage(percent: number): string {
  const [intPart, fracPart] = percent.toFixed(1).split('.');
  return `${intPart.padStart(2, '0')}.${fracPart}%`;
}
