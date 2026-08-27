/**
 * Punkte pro Prozentpunkt eroberter Fläche. Grössere Claims geben dadurch
 * automatisch proportional mehr Punkte – kein zusätzlicher Bonus-Faktor für
 * "mutigere" (grössere) Linien in diesem Schritt.
 */
export const POINTS_PER_PERCENT = 250;

/** Bei jedem Vielfachen dieses Score-Werts gibt es ein Extra-Leben. */
export const EXTRA_LIFE_SCORE_THRESHOLD = 10_000;

/** Ab diesem Prozentwert gilt das Level als abgeschlossen (Volfields Wert). */
export const LEVEL_COMPLETE_THRESHOLD = 80;

/**
 * Fortschritts-Zustand eines Levels: eroberte Fläche, Score und
 * Levelabschluss-Flag.
 *
 * `totalFieldArea` wird einmal beim Level-Start festgehalten (Fläche des
 * initialen Feld-Polygons). `claimedArea` zählt kumulativ hoch – bei jedem
 * Feld-Split wird die Fläche des eroberten Teilpolygons addiert.
 */
export interface Scoring {
  readonly totalFieldArea: number;
  claimedArea: number;
  score: number;
  isLevelComplete: boolean;
}

export function createScoring(totalFieldArea: number): Scoring {
  return { totalFieldArea, claimedArea: 0, score: 0, isLevelComplete: false };
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

/**
 * Anzahl neu überschrittener Extra-Leben-Schwellen zwischen zwei Score-Ständen.
 * Über `Math.floor(after / T) - Math.floor(before / T)` werden auch grosse
 * Sprünge über mehrere Schwellen hinweg korrekt gezählt.
 */
export function extraLivesFromScore(scoreBefore: number, scoreAfter: number): number {
  return (
    Math.floor(scoreAfter / EXTRA_LIFE_SCORE_THRESHOLD) -
    Math.floor(scoreBefore / EXTRA_LIFE_SCORE_THRESHOLD)
  );
}

export interface ClaimOutcome {
  /** In diesem Schritt vergebene Punkte (bereits auf `score` addiert). */
  pointsAwarded: number;
  /** Anzahl durch diesen Schritt neu verdienter Extra-Leben. */
  extraLives: number;
  /** `true`, wenn mit diesem Schritt die 80 %-Schwelle erstmals erreicht wurde. */
  levelJustCompleted: boolean;
}

/**
 * Rechnet eine neu eroberte Fläche in den Score ein.
 *
 * `claimedArea` ist die Fläche DIESER Eroberung; `scoring.claimedArea` muss
 * bereits die neue Gesamtsumme enthalten (für den 80 %-Check). Punkte =
 * Flächenanteil dieser Eroberung an `totalFieldArea` (in Prozent) ×
 * `POINTS_PER_PERCENT`, auf ganze Zahl gerundet.
 */
export function registerClaim(scoring: Scoring, claimedArea: number): ClaimOutcome {
  const scoreBefore = scoring.score;
  const percentOfTotal =
    scoring.totalFieldArea > 0 ? (claimedArea / scoring.totalFieldArea) * 100 : 0;
  const pointsAwarded = Math.round(percentOfTotal * POINTS_PER_PERCENT);
  scoring.score += pointsAwarded;

  const extraLives = extraLivesFromScore(scoreBefore, scoring.score);

  const wasComplete = scoring.isLevelComplete;
  if (
    getClaimedPercentage(scoring.claimedArea, scoring.totalFieldArea) >= LEVEL_COMPLETE_THRESHOLD
  ) {
    scoring.isLevelComplete = true;
  }

  return {
    pointsAwarded,
    extraLives,
    levelJustCompleted: scoring.isLevelComplete && !wasComplete,
  };
}
