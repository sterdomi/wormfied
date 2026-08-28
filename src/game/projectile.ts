import type { Enemy, Vec } from './enemy';
import type { Point } from './field';
import type { CannonBoostConfig } from '../levels/types';

export interface Projectile {
  position: Point;
  /**
   * Geschwindigkeitsvektor in Pixel/Sekunde (Richtung × Speed). Wird nach dem
   * Abschuss NICHT mehr angepasst – das Projektil fliegt geradlinig weiter.
   */
  velocity: Vec;
  /** Rendergrösse (Durchmesser) in Pixel. */
  size: number;
}

/** Die für die Feuerlogik relevanten Felder von `ShootingConfig`. */
export interface ShootingSpec {
  enabled: boolean;
  cooldownSeconds: number;
  projectileSpeed: number;
  projectileSize: number;
}

/**
 * Erzeugt ein Projektil an `from`, gezielt auf `target`: Richtung `target - from`
 * normalisiert, mal `speed`. Danach fliegt es ohne Nachjustieren geradeaus.
 */
export function createProjectile(
  from: Point,
  target: Point,
  speed: number,
  size: number,
): Projectile {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    position: { x: from.x, y: from.y },
    velocity: { x: (dx / len) * speed, y: (dy / len) * speed },
    size,
  };
}

/**
 * Erzeugt ein Projektil an `from`, das direkt in `direction` fliegt (wird
 * intern normiert) – im Gegensatz zu `createProjectile` also NICHT auf einen
 * Zielpunkt ausgerichtet. Für den Spieler-Kanone-Bonus (Instruktion 14):
 * Schussrichtung ist die aktuelle Bewegungs-/Blickrichtung (`Player.facing`),
 * kein Ziel.
 */
export function createDirectionalProjectile(
  from: Point,
  direction: Vec,
  speed: number,
  size: number,
): Projectile {
  const len = Math.hypot(direction.x, direction.y) || 1;
  return {
    position: { x: from.x, y: from.y },
    velocity: { x: (direction.x / len) * speed, y: (direction.y / len) * speed },
    size,
  };
}

/** Ein Frame Projektil-Bewegung (Delta-Time-basiert). Mutiert das Projektil. */
export function advanceProjectile(p: Projectile, dt: number): void {
  p.position.x += p.velocity.x * dt;
  p.position.y += p.velocity.y * dt;
}

/**
 * Liegt `p` deutlich ausserhalb des Bereichs [0,0]–[width,height]
 * (mit Toleranzrand `margin`) und sollte aufgeräumt werden?
 */
export function isProjectileOutOfBounds(
  p: Projectile,
  width: number,
  height: number,
  margin = 48,
): boolean {
  return (
    p.position.x < -margin ||
    p.position.y < -margin ||
    p.position.x > width + margin ||
    p.position.y > height + margin
  );
}

/**
 * Aktualisiert den Schuss-Timer eines Gegners und liefert – sobald der Cooldown
 * erreicht ist – GENAU EIN neues Projektil (Timer wird dann auf 0 gesetzt, ein
 * Überschuss bei grossem `dt` verfällt bewusst). Sonst `null`
 * (kein/deaktiviertes `shooting` oder Cooldown noch nicht abgelaufen).
 */
export function tickEnemyShooting(
  enemy: Enemy,
  shooting: ShootingSpec | undefined,
  playerPos: Point,
  dt: number,
): Projectile | null {
  if (!shooting?.enabled) return null;

  enemy.timeSinceLastShot += dt;
  if (enemy.timeSinceLastShot < shooting.cooldownSeconds) return null;

  enemy.timeSinceLastShot = 0;
  return createProjectile(
    enemy.position,
    playerPos,
    shooting.projectileSpeed,
    shooting.projectileSize,
  );
}

/** Die für `tickPlayerShooting` relevanten Felder von `PlayerState`. */
export interface PlayerShootingState {
  cannonRemainingSeconds: number;
  timeSinceLastPlayerShot: number;
}

/**
 * Kanone-Feuer, solange der Bonus aktiv ist: Tap-to-Fire statt Dauerfeuer
 * (Instruktion 15, Punkt 8 – löst die automatische Dauerfeuer-Lösung aus
 * Instruktion 14 ab). `fireRequested` ist der EDGE-getriggerte Tastendruck
 * (`InputState.drawJustPressed`, nur wahr im Frame des Drucks) – nicht
 * "Taste gehalten". `cannon.fireIntervalSeconds` wird dabei zur MINIMALEN
 * Abklingzeit zwischen zwei Tap-Schüssen uminterpretiert (statt komplett
 * entfernt zu werden): ein einzelner Tastendruck löst zwar direkt einen
 * Schuss aus, ohne diese Untergrenze liesse sich durch sehr schnelles
 * Tippen aber trotzdem praktisch dauerfeuern – die Konfiguration bleibt so
 * weiterhin die "Feuerrate", jetzt eben als Obergrenze statt als fixes
 * Intervall. Schussrichtung = aktuelle Blickrichtung (`facing`), kein Ziel.
 *
 * Kein Modus-Check hier: die Kanone feuert sowohl im `drawing`- als auch im
 * `onEdge`-Modus (dort geschützt vom Rand aus, ohne loszufahren – der
 * Aufrufer entscheidet nicht anhand des Modus, ob `fireRequested` gesetzt
 * wird).
 *
 * Der Cooldown läuft unabhängig vom Tastendruck im Hintergrund weiter
 * (`timeSinceLastPlayerShot` wird IMMER erhöht, nicht erst bei
 * `fireRequested`), damit er zwischen zwei Taps schon vorlaufen kann.
 */
export function tickPlayerShooting(
  state: PlayerShootingState,
  fireRequested: boolean,
  facing: Vec,
  playerPos: Point,
  cannon: CannonBoostConfig,
  dt: number,
): Projectile | null {
  state.timeSinceLastPlayerShot += dt;

  if (state.cannonRemainingSeconds <= 0 || !fireRequested) return null;
  if (state.timeSinceLastPlayerShot < cannon.fireIntervalSeconds) return null;

  state.timeSinceLastPlayerShot = 0;
  return createDirectionalProjectile(
    playerPos,
    facing,
    cannon.projectileSpeed,
    cannon.projectileSize,
  );
}
