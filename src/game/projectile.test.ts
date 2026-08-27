import { describe, it, expect } from 'vitest';
import { createEnemy } from './enemy';
import {
  advanceProjectile,
  createProjectile,
  isProjectileOutOfBounds,
  tickEnemyShooting,
  type ShootingSpec,
} from './projectile';

const SHOOTING: ShootingSpec = {
  enabled: true,
  cooldownSeconds: 2,
  projectileSpeed: 100,
  projectileSize: 16,
};

describe('createProjectile', () => {
  it('zielt normalisiert auf das Ziel, Betrag = speed', () => {
    const p = createProjectile({ x: 0, y: 0 }, { x: 30, y: 40 }, 100, 16);
    expect(p.position).toEqual({ x: 0, y: 0 });
    // (30,40) normalisiert = (0.6, 0.8) → × 100
    expect(p.velocity.x).toBeCloseTo(60);
    expect(p.velocity.y).toBeCloseTo(80);
    expect(Math.hypot(p.velocity.x, p.velocity.y)).toBeCloseTo(100);
  });
});

describe('advanceProjectile', () => {
  it('bewegt das Projektil delta-time-basiert entlang seines Geschwindigkeitsvektors', () => {
    const p = createProjectile({ x: 10, y: 10 }, { x: 110, y: 10 }, 100, 16); // velocity (100,0)
    advanceProjectile(p, 0.25);
    expect(p.position.x).toBeCloseTo(35);
    expect(p.position.y).toBeCloseTo(10);
  });
});

describe('isProjectileOutOfBounds', () => {
  const inside = createProjectile({ x: 400, y: 300 }, { x: 401, y: 300 }, 1, 16);
  const wayOut = createProjectile({ x: 2000, y: 300 }, { x: 2001, y: 300 }, 1, 16);
  const justOutside = createProjectile({ x: -100, y: 300 }, { x: -99, y: 300 }, 1, 16);

  it('unterscheidet innerhalb / deutlich ausserhalb', () => {
    expect(isProjectileOutOfBounds(inside, 800, 600)).toBe(false);
    expect(isProjectileOutOfBounds(wayOut, 800, 600)).toBe(true);
    expect(isProjectileOutOfBounds(justOutside, 800, 600)).toBe(true);
  });

  it('lässt einen kleinen Toleranzrand zu', () => {
    const inMargin = createProjectile({ x: -10, y: 300 }, { x: -9, y: 300 }, 1, 16);
    expect(isProjectileOutOfBounds(inMargin, 800, 600, 48)).toBe(false);
  });
});

describe('tickEnemyShooting', () => {
  it('schiesst nicht ohne / mit deaktiviertem shooting', () => {
    const e = createEnemy({ x: 0, y: 0 }, { speed: 90, size: 40 });
    expect(tickEnemyShooting(e, undefined, { x: 100, y: 0 }, 5)).toBeNull();
    expect(tickEnemyShooting(e, { ...SHOOTING, enabled: false }, { x: 100, y: 0 }, 5)).toBeNull();
  });

  it('erzeugt nach Ablauf des Cooldowns GENAU EIN Projektil und setzt den Timer zurück', () => {
    const e = createEnemy({ x: 0, y: 0 }, { speed: 90, size: 40 });

    // Vor dem Cooldown: nichts.
    expect(tickEnemyShooting(e, SHOOTING, { x: 100, y: 0 }, 1)).toBeNull();
    expect(tickEnemyShooting(e, SHOOTING, { x: 100, y: 0 }, 0.9)).toBeNull();

    // Cooldown erreicht (1 + 0.9 + 0.2 = 2.1 ≥ 2): genau ein Projektil.
    const shot = tickEnemyShooting(e, SHOOTING, { x: 100, y: 0 }, 0.2);
    expect(shot).not.toBeNull();
    expect(e.timeSinceLastShot).toBe(0);

    // Direkt danach wieder nichts.
    expect(tickEnemyShooting(e, SHOOTING, { x: 100, y: 0 }, 0.1)).toBeNull();
  });

  it('liefert bei einem grossen dt-Sprung trotzdem nur EIN Projektil', () => {
    const e = createEnemy({ x: 0, y: 0 }, { speed: 90, size: 40 });
    const shot = tickEnemyShooting(e, SHOOTING, { x: 100, y: 0 }, 100);
    expect(shot).not.toBeNull();
    expect(e.timeSinceLastShot).toBe(0);
  });

  it('zielt auf die Spielerposition zum Zeitpunkt des Abschusses', () => {
    const e = createEnemy({ x: 0, y: 0 }, { speed: 90, size: 40 });
    const shot = tickEnemyShooting(e, SHOOTING, { x: 0, y: 50 }, SHOOTING.cooldownSeconds)!;
    // Richtung (0,1) × 100
    expect(shot.velocity.x).toBeCloseTo(0);
    expect(shot.velocity.y).toBeCloseTo(SHOOTING.projectileSpeed);
    expect(shot.size).toBe(SHOOTING.projectileSize);
  });
});
