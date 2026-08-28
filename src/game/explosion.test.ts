import { describe, it, expect } from 'vitest';
import { createExplosion, isExplosionExpired, pruneExplosions } from './explosion';

describe('createExplosion', () => {
  it('liefert plausible Default-Werte', () => {
    const before = performance.now();
    const explosion = createExplosion({ x: 40, y: 60 });
    const after = performance.now();

    expect(explosion.position).toEqual({ x: 40, y: 60 });
    expect(explosion.startTime).toBeGreaterThanOrEqual(before);
    expect(explosion.startTime).toBeLessThanOrEqual(after);
    expect(explosion.durationMs).toBeGreaterThanOrEqual(400);
    expect(explosion.durationMs).toBeLessThanOrEqual(600);
    expect(explosion.maxRadius).toBeGreaterThan(0);
  });

  it('kopiert die Position (kein geteiltes Objekt mit dem Aufrufer)', () => {
    const position = { x: 10, y: 10 };
    const explosion = createExplosion(position);
    position.x = 999;
    expect(explosion.position.x).toBe(10);
  });
});

describe('isExplosionExpired / pruneExplosions', () => {
  it('gilt vor Ablauf der durationMs nicht als abgelaufen', () => {
    const explosion = createExplosion({ x: 0, y: 0 });
    expect(isExplosionExpired(explosion, explosion.startTime + explosion.durationMs - 1)).toBe(
      false,
    );
  });

  it('gilt nach Ablauf der durationMs als abgelaufen', () => {
    const explosion = createExplosion({ x: 0, y: 0 });
    expect(isExplosionExpired(explosion, explosion.startTime + explosion.durationMs)).toBe(true);
    expect(isExplosionExpired(explosion, explosion.startTime + explosion.durationMs + 500)).toBe(
      true,
    );
  });

  it('entfernt nur abgelaufene Explosionen aus der Liste', () => {
    const fresh = createExplosion({ x: 0, y: 0 });
    const old = createExplosion({ x: 1, y: 1 });
    old.startTime -= old.durationMs + 1000; // simuliert eine längst abgelaufene Explosion
    const now = performance.now();

    const result = pruneExplosions([fresh, old], now);

    expect(result).toContain(fresh);
    expect(result).not.toContain(old);
    expect(result).toHaveLength(1);
  });
});
