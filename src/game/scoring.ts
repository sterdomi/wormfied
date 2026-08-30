import type { DefeatScoring } from '../levels/types';

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
 * Fallback-Punkte für besiegte Gegner (Instruktion 12), falls ein Level keine
 * eigene `scoring`-Konfiguration mitgibt (`LevelConfig.scoring`). Bewusst
 * deutlich grösser als die flächenbasierten Punkte oben (`POINTS_PER_PERCENT`
 * pro Prozent) – ein besiegter Gegner ist ein klar abgegrenzter, seltenerer
 * Erfolg und darf sich entsprechend lohnender anfühlen als ein einzelnes
 * Flächenprozent.
 */
export const defaultMiniEnemyDefeatedPoints = 500;
export const defaultMainEnemyDefeatedPoints = 2000;

/**
 * Prozent-Bonus beim Levelabschluss (Nutzer-Feedback, angelehnt ans
 * Volfied-Original): Stufen-Tabelle nach dem tatsächlich erreichten
 * Erobert-Prozentwert. Vergeben wird der Bonus der HÖCHSTEN Stufe, deren
 * `minPercent` erreicht ist – wer über die 80 %-Abschlussschwelle hinaus
 * weiter erobert, wird mit spürbar mehr Punkten belohnt, steiler werdend
 * gegen 100 %.
 *
 * Absteigend sortiert (`levelClearPercentBonus` nimmt die erste passende
 * Stufe). `80` ist bewusst mit Bonus 0 gelistet, damit die Tabelle im
 * Level-Complete-Overlay genau bei der Abschlussschwelle beginnt. Die
 * Spitzenstufe liegt bei 99.9 % (nicht 100 %) – ein exakt perfekter Abschluss
 * ist praktisch unerreichbar, ebenso im Volfied-Original.
 */
export const LEVEL_CLEAR_PERCENT_BONUS_TIERS: readonly {
  minPercent: number;
  bonus: number;
}[] = [
  { minPercent: 99.9, bonus: 60_000 },
  { minPercent: 99, bonus: 35_000 },
  { minPercent: 97, bonus: 18_000 },
  { minPercent: 95, bonus: 10_000 },
  { minPercent: 93, bonus: 6_000 },
  { minPercent: 90, bonus: 3_000 },
  { minPercent: 85, bonus: 1_000 },
  { minPercent: 80, bonus: 0 },
];

/**
 * Ab diesem Erobert-Prozentwert beim Levelabschluss gibt es 1 Extra-Leben
 * (Nutzer-Feedback: nur bei einem Beinahe-Perfekt-Abschluss). Das gilt
 * ZUSÄTZLICH zur `EXTRA_LIFE_SCORE_THRESHOLD`-Regel, die davon unberührt
 * weiter greift.
 */
export const LEVEL_CLEAR_EXTRA_LIFE_PERCENT = 99;

/**
 * Punkte-Bonus für einen Erobert-Prozentwert (0–100) laut
 * `LEVEL_CLEAR_PERCENT_BONUS_TIERS`. Unter der untersten Stufe (80 %) 0.
 */
export function levelClearPercentBonus(percent: number): number {
  const tier = LEVEL_CLEAR_PERCENT_BONUS_TIERS.find((t) => percent >= t.minPercent);
  return tier ? tier.bonus : 0;
}

/**
 * Punkte für einen gefangenen (besiegten) Mini-Gegner (Instruktion 12).
 * Mutiert `scoring.score` und liefert die vergebenen Punkte zurück – fällt
 * auf `defaultMiniEnemyDefeatedPoints` zurück, falls `defeatScoring` fehlt.
 */
export function awardMiniEnemyDefeated(scoring: Scoring, defeatScoring?: DefeatScoring): number {
  const points = defeatScoring?.miniEnemyPoints ?? defaultMiniEnemyDefeatedPoints;
  scoring.score += points;
  return points;
}

export interface LevelClearBonusOutcome {
  mainEnemyPoints: number;
  miniEnemyPoints: number;
  /** Prozent-Bonus laut `levelClearPercentBonus(percent)`. */
  percentBonus: number;
  totalPointsAwarded: number;
  /**
   * `true`, wenn `percent >= LEVEL_CLEAR_EXTRA_LIFE_PERCENT` – der Aufrufer
   * vergibt dann 1 Extra-Leben (zusätzlich zur Score-Schwellen-Regel, die
   * über `registerClaim`/`extraLivesFromScore` unabhängig weiterläuft).
   */
  extraLife: boolean;
}

/**
 * Levelabschluss-Bonus: (1) "Aufräum-Bonus" – Hauptgegner + alle noch
 * verbliebenen Mini-Gegner geben Punkte; (2) Prozent-Bonus nach tatsächlich
 * erreichtem Erobert-Prozentwert (`levelClearPercentBonus`, Nutzer-Feedback:
 * "je höher der Prozentwert, desto höher der Score"); (3) ab
 * `LEVEL_CLEAR_EXTRA_LIFE_PERCENT` zusätzlich 1 Extra-Leben (`extraLife`).
 *
 * Feuert NUR, wenn `levelJustCompleted` (das Ergebnisfeld von `registerClaim`)
 * gesetzt ist – das ist per Konstruktion bereits nur beim false→true-Übergang
 * von `scoring.isLevelComplete` der Fall, weshalb hier kein zusätzlicher Guard
 * nötig ist: ruft der Aufrufer diese Funktion über mehrere Frames hinweg auf,
 * während `isLevelComplete` weiterhin `true` bleibt, ist `levelJustCompleted`
 * ab dem zweiten Aufruf bereits `false` und die Funktion liefert `null`, ohne
 * Score oder Leben erneut zu verändern.
 */
export function applyLevelClearBonus(
  scoring: Scoring,
  levelJustCompleted: boolean,
  remainingMiniEnemyCount: number,
  percent: number,
  defeatScoring?: DefeatScoring,
): LevelClearBonusOutcome | null {
  if (!levelJustCompleted) return null;

  const mainEnemyPoints = defeatScoring?.mainEnemyPoints ?? defaultMainEnemyDefeatedPoints;
  const miniEnemyPoints =
    (defeatScoring?.miniEnemyPoints ?? defaultMiniEnemyDefeatedPoints) * remainingMiniEnemyCount;
  const percentBonus = levelClearPercentBonus(percent);
  const totalPointsAwarded = mainEnemyPoints + miniEnemyPoints + percentBonus;
  scoring.score += totalPointsAwarded;

  return {
    mainEnemyPoints,
    miniEnemyPoints,
    percentBonus,
    totalPointsAwarded,
    extraLife: percent >= LEVEL_CLEAR_EXTRA_LIFE_PERCENT,
  };
}

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
