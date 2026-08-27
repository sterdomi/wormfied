import { describe, it, expect } from 'vitest';
import {
  anyUnshieldedEnemyHit,
  checkLineCollision,
  checkUnshieldedPlayerCollision,
  enemyTouchingLine,
  ENEMY_TOUCH_RADIUS,
  projectileIndexHittingUnshieldedPlayer,
  projectileIndexTouchingLine,
} from './collision';
import { createEnemy, type EnemySpec } from './enemy';
import type { DrawnLine } from './line';
import { createProjectile } from './projectile';

const SPEC: EnemySpec = { speed: 90, size: 30 };

const line: DrawnLine = {
  points: [
    { x: 100, y: 100 },
    { x: 100, y: 300 },
    { x: 260, y: 300 },
  ],
};

describe('checkLineCollision', () => {
  it('erkennt einen Gegner exakt auf der Linie', () => {
    expect(checkLineCollision({ x: 100, y: 200 }, line)).toBe(true); // Mitte des 1. Segments
    expect(checkLineCollision({ x: 180, y: 300 }, line)).toBe(true); // auf dem 2. Segment
  });

  it('erkennt einen Gegner knapp neben der Linie (innerhalb des Radius)', () => {
    expect(checkLineCollision({ x: 100 + ENEMY_TOUCH_RADIUS - 1, y: 200 }, line)).toBe(true);
  });

  it('meldet keine Kollision für einen weit entfernten Gegner', () => {
    expect(checkLineCollision({ x: 400, y: 50 }, line)).toBe(false);
    expect(checkLineCollision({ x: 100 + ENEMY_TOUCH_RADIUS + 2, y: 200 }, line)).toBe(false);
  });

  it('berücksichtigt den optionalen Kopf-Punkt (Spielerposition)', () => {
    expect(checkLineCollision({ x: 300, y: 300 }, line)).toBe(false);
    expect(
      checkLineCollision({ x: 300, y: 300 }, line, ENEMY_TOUCH_RADIUS, { x: 340, y: 300 }),
    ).toBe(true);
  });

  it('behandelt eine Ein-Punkt-Linie (gerade gestartet)', () => {
    const dot: DrawnLine = { points: [{ x: 50, y: 50 }] };
    expect(checkLineCollision({ x: 52, y: 50 }, dot)).toBe(true);
    expect(checkLineCollision({ x: 200, y: 200 }, dot)).toBe(false);
  });
});

describe('checkUnshieldedPlayerCollision', () => {
  const player = { x: 200, y: 200 };
  const near = { x: 203, y: 200 }; // < ENEMY_TOUCH_RADIUS entfernt
  const far = { x: 400, y: 200 };

  it('löst nur bei aufgebrauchtem Schild aus', () => {
    expect(checkUnshieldedPlayerCollision(near, player, 50)).toBe(false); // Schild noch da
    expect(checkUnshieldedPlayerCollision(near, player, 0)).toBe(true);
  });

  it('braucht auch bei leerem Schild einen nahen Gegner', () => {
    expect(checkUnshieldedPlayerCollision(far, player, 0)).toBe(false);
  });

  it('behandelt Grenzfälle des Schilds', () => {
    expect(checkUnshieldedPlayerCollision(near, player, 0.1)).toBe(false);
    expect(checkUnshieldedPlayerCollision(near, player, -5)).toBe(true);
  });
});

describe('Kollision über alle Gegner (Haupt- + Mini-Gegner)', () => {
  const mainFar = createEnemy({ x: 700, y: 500 }, SPEC);
  const miniOnLine = createEnemy({ x: 100, y: 200 }, SPEC); // exakt auf dem 1. Segment

  it('enemyTouchingLine: ein Mini-Gegner an der Linie löst dieselbe Kollision aus wie der Hauptgegner', () => {
    expect(enemyTouchingLine([mainFar], line)).toBeNull();
    const hit = enemyTouchingLine([mainFar, miniOnLine], line);
    expect(hit).toBe(miniOnLine); // liefert den berührenden Gegner
  });

  it('anyUnshieldedEnemyHit: auch ein Mini-Gegner am ungeschützten Spieler zählt', () => {
    const player = { x: 200, y: 200 };
    const miniNear = createEnemy({ x: 204, y: 200 }, SPEC);
    expect(anyUnshieldedEnemyHit([mainFar], player, 0)).toBe(false);
    expect(anyUnshieldedEnemyHit([mainFar, miniNear], player, 0)).toBe(true);
    expect(anyUnshieldedEnemyHit([mainFar, miniNear], player, 30)).toBe(false); // Schild schützt
  });
});

describe('Projektil-Kollisionen (gleiche Regeln wie Gegner-Berührung)', () => {
  // createProjectile normalisiert die Richtung; danach Position gezielt setzen.
  const projAt = (x: number, y: number) => {
    const p = createProjectile({ x: 0, y: 0 }, { x: 1, y: 0 }, 1, 16);
    p.position = { x, y };
    return p;
  };

  it('Projektil auf der aktiven Linie: gleiche Erkennung wie eine Gegner-Linien-Kollision', () => {
    const onLine = projAt(100, 200); // auf dem 1. Segment (100,100)–(100,300)
    const off = projAt(500, 50);

    expect(projectileIndexTouchingLine([off], line)).toBe(-1);
    expect(projectileIndexTouchingLine([off, onLine], line)).toBe(1);
  });

  it('Projektil trifft ungeschildeten Spieler → gleicher Ablauf wie direkte Gegner-Berührung', () => {
    const player = { x: 200, y: 200 };
    expect(projectileIndexHittingUnshieldedPlayer([projAt(204, 200)], player, 0)).toBe(0);
  });

  it('Projektil trifft GESCHILDETEN Spieler → keine Konsequenz (Schild schützt weiter)', () => {
    const player = { x: 200, y: 200 };
    expect(projectileIndexHittingUnshieldedPlayer([projAt(204, 200)], player, 40)).toBe(-1);
  });

  it('weit entferntes Projektil trifft nicht', () => {
    expect(projectileIndexHittingUnshieldedPlayer([projAt(700, 500)], { x: 200, y: 200 }, 0)).toBe(
      -1,
    );
  });
});
