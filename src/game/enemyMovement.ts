import type { Point } from './field';
import { type Enemy, type Vec } from './enemy';
import { closestPointOnPerimeter } from './geometry';
import { isPointInPolygon } from './polygon';

/** Standard-Geschwindigkeit des Hauptgegners (Pixel/Sekunde), = Wert aus
 *  Instruktion 7, seither verdoppelt (Nutzer-Feedback). Level-Konfigurationen
 *  können davon abweichen (level1 setzt eigene, ebenfalls verdoppelte Werte). */
export const ENEMY_SPEED = 180;

/** Die vier möglichen Bewegungsrichtungen – dieselbe Menge, aus der auch
 *  `randomDirection` wählt, hier aber erschöpfend (nicht zufällig mit
 *  Zurücklegen) durchprobiert, siehe `moveEnemy`. */
const CARDINAL_DIRECTIONS: readonly Vec[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/**
 * Durchschnittliches Intervall (Sekunden) zwischen zwei Pausen eines Gegners
 * bei der erratischen Lauf-Bewegung – `moveEnemy` würfelt pro Zyklus per
 * Zufall etwas darum herum (siehe `nextPauseIntervalSeconds`), damit nicht
 * alle Gegner exakt im selben Takt anhalten.
 */
export const ENEMY_PAUSE_INTERVAL_SECONDS = 10;
/**
 * Wie lange ein Gegner bei einer Pause stehen bleibt (Nutzer-Feedback:
 * "manchmal für eine Sekunde anhalten").
 */
export const ENEMY_PAUSE_DURATION_SECONDS = 1;
/** ± Zufallsstreuung um `ENEMY_PAUSE_INTERVAL_SECONDS`, damit nicht alle
 *  Gegner exakt im selben Takt anhalten. */
const ENEMY_PAUSE_INTERVAL_JITTER_SECONDS = 2;

/** Würfelt das Intervall (Sekunden) bis zur nächsten Pause neu aus – ruft
 *  `rng()` GENAU EINMAL auf, damit Aufrufer mit einem deterministischen `rng`
 *  (Tests) das Ergebnis leicht vorhersagen können. */
function nextPauseIntervalSeconds(rng: () => number): number {
  return ENEMY_PAUSE_INTERVAL_SECONDS + (rng() * 2 - 1) * ENEMY_PAUSE_INTERVAL_JITTER_SECONDS;
}

/**
 * Zustand der erratischen Lauf-Bewegung (`moveEnemy`) FÜR EINEN Gegner: die
 * Pausen-Timer (Nutzer-Feedback: Gegner halten ab und zu kurz an). Bewusst
 * neben `Enemy` gehalten – die geteilte Gegner-Struktur soll nicht mit jedem
 * Bewegungsmuster mitwachsen (ein Level mit z.B. Snake-Bewegung bringt seinen
 * eigenen Zustandstyp mit). Der Aufrufer (das `updateEnemies`-Behavior des
 * Levels) hält je Gegner eine Instanz und reicht sie an `moveEnemy`.
 */
export interface RandomWalkState {
  /** Sekunden seit der letzten Pause – zählt hoch bis `nextPauseIntervalSeconds`. */
  timeSinceLastPause: number;
  /** > 0, solange der Gegner gerade pausiert (zählt pro Frame runter). */
  pauseRemainingSeconds: number;
  /** Zufällig neu gewürfeltes Intervall (Sekunden) bis zur nächsten Pause –
   *  erneuert nach jeder Pause, damit Gegner nicht alle im gleichen Takt anhalten. */
  nextPauseIntervalSeconds: number;
}

/** Frischer `RandomWalkState`. Erstes Intervall bewusst ohne Zufalls-Jitter
 *  (kein `rng` nötig) – der Jitter kommt ab der zweiten Pause dazu. */
export function createRandomWalkState(): RandomWalkState {
  return {
    timeSinceLastPause: 0,
    pauseRemainingSeconds: 0,
    nextPauseIntervalSeconds: ENEMY_PAUSE_INTERVAL_SECONDS,
  };
}

/**
 * Wie `isPointInPolygon`, aber zusätzlich mit Sicherheitsabstand zum Rand:
 * `point` gilt nur als "passt rein", wenn er UND sein voller Abstand
 * `margin` zum nächstgelegenen Randpunkt innerhalb des Polygons liegen.
 *
 * Nutzer-Feedback: Gegner rutschten durch zu schmale Lücken/Korridore, weil
 * die bisherige Prüfung nur den exakten (unendlich kleinen) Mittelpunkt
 * gegen das Polygon testete – unabhängig von der tatsächlichen
 * Sprite-Ausdehnung. `margin` = `enemy.size / 2` (der Sprite-Radius) macht
 * daraus effektiv "passt der GANZE Gegner rein, nicht nur sein Mittelpunkt".
 *
 * Exportiert, da `enemyEncirclement.ts` dieselbe Definition von "erreichbar"
 * braucht (die dort geschätzte Fläche soll nur zählen, was der Gegner
 * tatsächlich befahren kann – exakt das, was diese Funktion hier für die
 * Bewegung selbst schon entscheidet).
 */
export function fitsInPolygon(point: Point, polygon: Point[], margin: number): boolean {
  if (!isPointInPolygon(point, polygon)) return false;
  if (margin <= 0) return true;
  return closestPointOnPerimeter(polygon, point).distance >= margin;
}

/** Sicherheitsabstand zum Rand für Bewegung UND Erreichbarkeits-Schätzung
 *  (`enemyEncirclement.ts`) – an einer Stelle, damit beide dieselbe
 *  Definition von "passt rein" verwenden. */
export function enemyMovementMargin(enemy: Enemy): number {
  return enemy.size / 2;
}

/**
 * Zufällige Bewegungsrichtung für Gegner – NUR eine der vier Achsrichtungen
 * (rechts/links/runter/hoch), keine Diagonale (Nutzer-Feedback: "schräg
 * fahren darf nicht möglich sein", passend zur bereits achsparallelen
 * Spielerbewegung, siehe `headingFromInput` in `drawing.ts`). `rng`
 * (liefert 0..1) ist für Tests injizierbar.
 */
export function randomDirection(rng: () => number = Math.random): Vec {
  const r = rng();
  if (r < 0.25) return { x: 1, y: 0 };
  if (r < 0.5) return { x: -1, y: 0 };
  if (r < 0.75) return { x: 0, y: 1 };
  return { x: 0, y: -1 };
}

/**
 * Ein Frame Bewegung für EINEN beliebigen Gegner (Haupt- oder Mini-Gegner –
 * dieselbe Funktion, nur andere `Enemy`-Instanz). Begrenzt auf das Innere von
 * `polygon` (dem aktuellen, ggf. schon verkleinerten Feld). Nutzt `enemy.speed`.
 * Mutiert `enemy`. Delta-Time-basiert.
 *
 * Simple erratische Bewegung: in die aktuelle Richtung laufen. Würde der
 * nächste Schritt aus der Fläche führen (`fitsInPolygon` schlägt fehl), unter
 * den vier Achsrichtungen eine zufällig auswählen, die die volle Marge
 * einhält; findet sich keine (Nutzer-Feedback, siehe unten), als Fallback die
 * Richtung mit der grössten Abstands-VERBESSERUNG nehmen; hilft auch das
 * nicht, diesen Frame stehen bleiben. KEIN exaktes Reflexionsverhalten –
 * Hauptsache der Gegner bleibt zuverlässig innerhalb der Fläche.
 *
 * PLATZHALTER für ausgefeilteres Gegnerverhalten (Verfolgen / gezieltes
 * Ausweichen), das bei Bedarf später verfeinert werden kann.
 *
 * Zusätzlich (Nutzer-Feedback): der Gegner hält ab und zu kurz an
 * (`ENEMY_PAUSE_DURATION_SECONDS`, im Schnitt alle
 * `ENEMY_PAUSE_INTERVAL_SECONDS` ± Zufallsstreuung) – bewegt sich während
 * einer laufenden Pause diesen Frame gar nicht, unabhängig von Eingabe/KI.
 * Dieser Pausen-Zustand liegt in `walk` (`RandomWalkState`, vom Aufrufer je
 * Gegner gehalten), NICHT auf `enemy`.
 *
 * Und (Nutzer-Feedback): die "bleibt innerhalb der Fläche"-Prüfung hält
 * zusätzlich `enemy.size / 2` Sicherheitsabstand zum Rand ein (siehe
 * `fitsInPolygon`), damit der Gegner nicht durch Lücken/Korridore rutscht,
 * die schmaler als sein eigenes Sprite sind – ABER (weiteres Nutzer-Feedback:
 * "jetzt bleibt er zu früh stehen"): ein Feld-Split (Instruktion 5) kann die
 * aktive Randlinie von einem Frame auf den nächsten plötzlich sehr nah an den
 * Gegner heranrücken, sodass er sich urplötzlich in einer die Marge
 * verletzenden Position wiederfindet, obwohl er sich nicht bewegt hat. Ohne
 * Sonderbehandlung fände `moveEnemy` dann NIE wieder eine voll marge-konforme
 * Richtung und der Gegner bliebe für immer stehen. Der Verbesserungs-Fallback
 * unten löst genau das: erlaubt Bewegung, die den Abstand zum Rand
 * VERGRÖSSERT (auch ohne die volle Marge sofort zu erreichen), verweigert
 * aber gleichbleibende oder schlechtere Bewegung – reines Längsdurchqueren
 * eines wirklich zu engen Gangs bleibt dadurch weiterhin blockiert.
 */
export function moveEnemy(
  enemy: Enemy,
  walk: RandomWalkState,
  polygon: Point[],
  dt: number,
  rng: () => number = Math.random,
): void {
  if (walk.pauseRemainingSeconds > 0) {
    walk.pauseRemainingSeconds = Math.max(0, walk.pauseRemainingSeconds - dt);
    return;
  }

  walk.timeSinceLastPause += dt;
  if (walk.timeSinceLastPause >= walk.nextPauseIntervalSeconds) {
    walk.timeSinceLastPause = 0;
    walk.pauseRemainingSeconds = ENEMY_PAUSE_DURATION_SECONDS;
    walk.nextPauseIntervalSeconds = nextPauseIntervalSeconds(rng);
    return; // Pause beginnt erst DIESEN Frame – noch keine Bewegung.
  }

  const margin = enemyMovementMargin(enemy);
  const step = enemy.speed * dt;
  const advanced = (dir: Vec): Point => ({
    x: enemy.position.x + dir.x * step,
    y: enemy.position.y + dir.y * step,
  });

  const straightAhead = advanced(enemy.direction);
  if (fitsInPolygon(straightAhead, polygon, margin)) {
    enemy.position = straightAhead;
    return;
  }

  // Alle vier Achsrichtungen (erschöpfend, nicht zufällig MIT Zurücklegen wie
  // zuvor – bei nur 4 möglichen Richtungen könnte reines Losen sonst dieselbe
  // ungültige Richtung mehrfach treffen statt die tatsächlich gültige(n) zu
  // finden), die die volle Marge einhalten; `rng` wählt nur noch AUS den
  // gültigen Kandidaten aus (Abwechslung), nicht mehr FÜR die Suche selbst.
  const safeCandidates = CARDINAL_DIRECTIONS.map((dir) => ({ dir, point: advanced(dir) })).filter(
    ({ point }) => fitsInPolygon(point, polygon, margin),
  );
  if (safeCandidates.length > 0) {
    const index = Math.min(safeCandidates.length - 1, Math.floor(rng() * safeCandidates.length));
    const pick = safeCandidates[index];
    enemy.direction = pick.dir;
    enemy.position = pick.point;
    return;
  }

  // Verbesserungs-Fallback (siehe Docstring oben): keine Richtung erfüllt die
  // volle Marge – die mit dem grössten (echten) Abstandsgewinn nehmen.
  const currentDistance = closestPointOnPerimeter(polygon, enemy.position).distance;
  let best: { dir: Vec; point: Point; distance: number } | null = null;
  for (const dir of CARDINAL_DIRECTIONS) {
    const point = advanced(dir);
    if (!isPointInPolygon(point, polygon)) continue;
    const distance = closestPointOnPerimeter(polygon, point).distance;
    if (distance > currentDistance && (!best || distance > best.distance)) {
      best = { dir, point, distance };
    }
  }
  if (best) {
    enemy.direction = best.dir;
    enemy.position = best.point;
  }
  // sonst: diesen Frame stehen bleiben (z.B. exakt in der Mitte eines
  // wirklich zu engen Gangs – dort ist Stehenbleiben das korrekte Verhalten).
}

/**
 * Bewegt alle übergebenen Gegner für einen Frame (siehe `moveEnemy`).
 * `walkFor` liefert den `RandomWalkState` je Gegner – der Aufrufer hält die
 * Zustände (z.B. in einer `WeakMap<Enemy, RandomWalkState>`), da `moveEnemy`
 * sie über Frames hinweg fortschreibt.
 */
export function moveEnemies(
  enemies: readonly Enemy[],
  walkFor: (enemy: Enemy) => RandomWalkState,
  polygon: Point[],
  dt: number,
  rng: () => number = Math.random,
): void {
  for (const enemy of enemies) moveEnemy(enemy, walkFor(enemy), polygon, dt, rng);
}
