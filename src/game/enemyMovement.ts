import type { Point } from './field';
import type { Enemy, Vec } from './enemy';
import { isPointInPolygon } from './polygon';

/** Standard-Geschwindigkeit des Hauptgegners (Pixel/Sekunde), = Wert aus
 *  Instruktion 7. Level-Konfigurationen können davon abweichen. */
export const ENEMY_SPEED = 90;

/**
 * Max. Versuche, eine gültige neue Zufallsrichtung zu finden, bevor der
 * Fallback (Richtung umkehren) greift.
 */
const MAX_DIRECTION_TRIES = 10;

/** Zufälliger Einheitsvektor. `rng` (liefert 0..1) ist für Tests injizierbar. */
export function randomDirection(rng: () => number = Math.random): Vec {
  const angle = rng() * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/**
 * Ein Frame Bewegung für EINEN beliebigen Gegner (Haupt- oder Mini-Gegner –
 * dieselbe Funktion, nur andere `Enemy`-Instanz). Begrenzt auf das Innere von
 * `polygon` (dem aktuellen, ggf. schon verkleinerten Feld). Nutzt `enemy.speed`.
 * Mutiert `enemy`. Delta-Time-basiert.
 *
 * Simple erratische Bewegung: in die aktuelle Richtung laufen. Würde der
 * nächste Schritt aus der Fläche führen (`isPointInPolygon` schlägt fehl), eine
 * neue Zufallsrichtung würfeln (max. `MAX_DIRECTION_TRIES` Versuche); klappt
 * keine, als Fallback die Richtung umkehren; hilft auch das nicht, diesen Frame
 * stehen bleiben. KEIN exaktes Reflexionsverhalten – Hauptsache der Gegner
 * bleibt zuverlässig innerhalb der Fläche.
 *
 * PLATZHALTER für ausgefeilteres Gegnerverhalten (Verfolgen / gezieltes
 * Ausweichen), das bei Bedarf später verfeinert werden kann.
 */
export function moveEnemy(
  enemy: Enemy,
  polygon: Point[],
  dt: number,
  rng: () => number = Math.random,
): void {
  const step = enemy.speed * dt;
  const advanced = (dir: Vec): Point => ({
    x: enemy.position.x + dir.x * step,
    y: enemy.position.y + dir.y * step,
  });

  const straightAhead = advanced(enemy.direction);
  if (isPointInPolygon(straightAhead, polygon)) {
    enemy.position = straightAhead;
    return;
  }

  for (let i = 0; i < MAX_DIRECTION_TRIES; i++) {
    const dir = randomDirection(rng);
    const candidate = advanced(dir);
    if (isPointInPolygon(candidate, polygon)) {
      enemy.direction = dir;
      enemy.position = candidate;
      return;
    }
  }

  // Fallback: Richtung umkehren.
  enemy.direction = { x: -enemy.direction.x, y: -enemy.direction.y };
  const reversed = advanced(enemy.direction);
  if (isPointInPolygon(reversed, polygon)) enemy.position = reversed;
  // sonst: diesen Frame stehen bleiben.
}

/** Bewegt alle übergebenen Gegner für einen Frame (siehe `moveEnemy`). */
export function moveEnemies(
  enemies: readonly Enemy[],
  polygon: Point[],
  dt: number,
  rng: () => number = Math.random,
): void {
  for (const enemy of enemies) moveEnemy(enemy, polygon, dt, rng);
}
