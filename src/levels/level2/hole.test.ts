import { describe, it, expect, vi } from 'vitest';
import { createEnemy, type Enemy } from '../../game/enemy';
import { createRectangularField } from '../../game/field';
import type { Point } from '../../game/field';
import {
  createHoleState,
  HOLE_MAX_CHAIN_LENGTH,
  HOLE_SPAWN_INTERVAL_SECONDS,
  updateHole,
} from './hole';
import { isChainSegment } from './mouthSpit';

const FIELD = createRectangularField(960, 540);

const makeMini = (p: Point): Enemy => createEnemy(p, { speed: 250, size: 98 });

function chainMinis(n: number): Enemy[] {
  return Array.from({ length: n }, () => makeMini({ x: 100, y: 100 }));
}

describe('updateHole', () => {
  it('das Loch liegt im Startfeld, aber nicht in der Feldmitte (dort startet der Kopf)', () => {
    const s = createHoleState(FIELD);
    expect(s.position.x).toBeGreaterThan(0);
    expect(s.position.x).toBeLessThan(960);
    expect(s.position.y).toBeGreaterThan(0);
    expect(s.position.y).toBeLessThan(540);
    expect(Math.hypot(s.position.x - 480, s.position.y - 270)).toBeGreaterThan(50);
  });

  it('spawnt nach dem Intervall genau ein Glied am Loch – als zurückkehrendes, nicht als Ketten-Segment', () => {
    const s = createHoleState(FIELD);
    const spawned: Enemy[] = [];
    const spawn = vi.fn((p: Point) => {
      const e = makeMini(p);
      spawned.push(e);
      return e;
    });

    updateHole(s, FIELD, [], HOLE_SPAWN_INTERVAL_SECONDS, spawn);

    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn.mock.calls[0][0]).toEqual(s.position);
    expect(isChainSegment(spawned[0])).toBe(false);
  });

  it('spawnt nicht vor Ablauf des Intervalls', () => {
    const s = createHoleState(FIELD);
    const spawn = vi.fn(makeMini);
    updateHole(s, FIELD, [], HOLE_SPAWN_INTERVAL_SECONDS - 1, spawn);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('spawnt nicht über den Deckel hinaus, setzt den Timer aber trotzdem zurück', () => {
    const s = createHoleState(FIELD);
    const spawn = vi.fn(makeMini);
    updateHole(s, FIELD, chainMinis(HOLE_MAX_CHAIN_LENGTH), HOLE_SPAWN_INTERVAL_SECONDS, spawn);
    expect(spawn).not.toHaveBeenCalled();
    expect(s.secondsUntilNextSpawn).toBeCloseTo(HOLE_SPAWN_INTERVAL_SECONDS);
  });

  it('versiegelt sich, wenn das Loch nicht mehr im Feld liegt – und spawnt dann nie wieder', () => {
    const s = createHoleState(FIELD);
    // Kleines Feld in der Ecke, das die Lochposition (~Feldmitte) nicht enthält.
    const awayField: Point[] = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ];
    const spawn = vi.fn(makeMini);

    updateHole(s, awayField, [], HOLE_SPAWN_INTERVAL_SECONDS, spawn);
    expect(s.sealed).toBe(true);
    expect(spawn).not.toHaveBeenCalled();

    // Auch mit wieder passendem Feld und viel Zeit: bleibt versiegelt.
    updateHole(s, FIELD, [], 999, spawn);
    expect(spawn).not.toHaveBeenCalled();
  });
});
