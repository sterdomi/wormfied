import type { Enemy, Vec } from './enemy';
import type { Point } from './field';

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
