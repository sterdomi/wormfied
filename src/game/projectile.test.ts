import { describe, it, expect } from 'vitest';
import { createEnemy } from './enemy';
import {
  advanceProjectile,
  createDirectionalProjectile,
  createProjectile,
  isProjectileOutOfBounds,
  tickEnemyShooting,
  tickPlayerShooting,
  type PlayerShootingState,
  type ShootingSpec,
} from './projectile';
import type { CannonBoostConfig } from '../levels/types';

const SHOOTING: ShootingSpec = {
  enabled: true,
  cooldownSeconds: 2,
  projectileSpeed: 100,
  projectileSize: 16,
};

const CANNON: CannonBoostConfig = {
  assetSrc: 'cannon.svg',
  effectDurationSeconds: 6,
  fireIntervalSeconds: 0.35,
  projectileSpeed: 260,
  projectileSize: 14,
  projectileAssetSrc: 'bullet.svg',
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

describe('createDirectionalProjectile', () => {
  it('fliegt in die übergebene (normierte) Richtung, unabhängig von jedem Ziel', () => {
    const p = createDirectionalProjectile({ x: 5, y: 5 }, { x: 0, y: -1 }, 100, 14);
    expect(p.position).toEqual({ x: 5, y: 5 });
    expect(p.velocity).toEqual({ x: 0, y: -100 });
    expect(p.size).toBe(14);
  });

  it('normiert einen nicht normierten Richtungsvektor selbst', () => {
    const p = createDirectionalProjectile({ x: 0, y: 0 }, { x: 3, y: 4 }, 100, 14);
    expect(p.velocity.x).toBeCloseTo(60);
    expect(p.velocity.y).toBeCloseTo(80);
  });
});

describe('tickPlayerShooting – Tap-to-Fire (Instruktion 15, löst das Dauerfeuer aus Instruktion 14 ab)', () => {
  // `timeSinceLastPlayerShot` startet hier bereits bei `fireIntervalSeconds`
  // ("Abklingzeit schon abgelaufen") – isoliert die Tap-vs-Halten-Semantik in
  // den Tests unten von der (separat unten getesteten) Cooldown-Mechanik.
  const freshState = (): PlayerShootingState => ({
    cannonRemainingSeconds: CANNON.effectDurationSeconds,
    timeSinceLastPlayerShot: CANNON.fireIntervalSeconds,
  });

  it('schiesst nicht, solange die Kanone inaktiv ist – selbst bei fireRequested', () => {
    const state: PlayerShootingState = { cannonRemainingSeconds: 0, timeSinceLastPlayerShot: 1 };
    expect(tickPlayerShooting(state, true, { x: 1, y: 0 }, { x: 0, y: 0 }, CANNON, 0)).toBeNull();
  });

  it('schiesst nicht ohne fireRequested (kein frischer Tastendruck), auch bei aktiver Kanone', () => {
    const state = freshState();
    expect(tickPlayerShooting(state, false, { x: 1, y: 0 }, { x: 0, y: 0 }, CANNON, 1)).toBeNull();
  });

  it('ein einzelner Tap löst sofort einen Schuss in die Blickrichtung aus', () => {
    const state = freshState();
    const shot = tickPlayerShooting(state, true, { x: 1, y: 0 }, { x: 0, y: 0 }, CANNON, 0)!;
    expect(shot).not.toBeNull();
    expect(shot.velocity.x).toBeCloseTo(CANNON.projectileSpeed);
    expect(shot.velocity.y).toBeCloseTo(0);
    expect(shot.size).toBe(CANNON.projectileSize);
    expect(state.timeSinceLastPlayerShot).toBe(0);
  });

  it('kein Dauerfeuer: ohne erneuten Tap bleibt es über mehrere Frames hinweg beim einen Schuss', () => {
    const state = freshState();
    expect(tickPlayerShooting(state, true, { x: 1, y: 0 }, { x: 0, y: 0 }, CANNON, 0)).not.toBeNull();

    // Taste losgelassen: kein Schuss mehr, auch wenn die Kanone weiter aktiv bleibt.
    expect(tickPlayerShooting(state, false, { x: 1, y: 0 }, { x: 0, y: 0 }, CANNON, 1)).toBeNull();
    expect(tickPlayerShooting(state, false, { x: 1, y: 0 }, { x: 0, y: 0 }, CANNON, 1)).toBeNull();
  });

  it('fireIntervalSeconds wirkt als minimale Abklingzeit zwischen zwei Tap-Schüssen (Spam-Schutz)', () => {
    const state = freshState();
    expect(tickPlayerShooting(state, true, { x: 1, y: 0 }, { x: 0, y: 0 }, CANNON, 0)).not.toBeNull();

    // Sofortiger zweiter Tap, bevor die Abklingzeit erreicht ist: kein Schuss.
    expect(
      tickPlayerShooting(
        state,
        true,
        { x: 1, y: 0 },
        { x: 0, y: 0 },
        CANNON,
        CANNON.fireIntervalSeconds - 0.01,
      ),
    ).toBeNull();

    // Nach Ablauf der Abklingzeit löst ein erneuter Tap wieder aus.
    expect(tickPlayerShooting(state, true, { x: 1, y: 0 }, { x: 0, y: 0 }, CANNON, 0.02)).not.toBeNull();
  });
});
