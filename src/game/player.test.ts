import { describe, it, expect } from 'vitest';
import { playerFacingAngle, spriteBaseRotationOffset, Player } from './player';

describe('spriteBaseRotationOffset', () => {
  it('ist 90° (player.svg zeigt default nach oben)', () => {
    expect(spriteBaseRotationOffset).toBeCloseTo(Math.PI / 2);
  });
});

describe('playerFacingAngle', () => {
  // Sprite-Kopf zeigt lokal nach oben (0, -1) – wie bei enemyFacingAngle.
  // Dreht man ihn um den Winkel, muss (0,-1) auf die Bewegungsrichtung fallen.
  const rotatedUp = (angle: number) => ({
    x: Math.sin(angle),
    y: -Math.cos(angle),
  });

  it('richtet den (nach oben schauenden) Sprite auf die Bewegungsrichtung aus', () => {
    for (const dir of [
      { x: 0, y: -1 }, // hoch
      { x: 1, y: 0 }, // rechts
      { x: 0, y: 1 }, // runter
      { x: -1, y: 0 }, // links
      { x: 0.6, y: 0.8 }, // diagonal
    ]) {
      const r = rotatedUp(playerFacingAngle(dir));
      expect(r.x).toBeCloseTo(dir.x);
      expect(r.y).toBeCloseTo(dir.y);
    }
  });

  it('funktioniert auch mit nicht normierten Vektoren (nur die Richtung zählt)', () => {
    expect(playerFacingAngle({ x: 5, y: 0 })).toBeCloseTo(playerFacingAngle({ x: 1, y: 0 }));
  });
});

describe('Player.facing', () => {
  it('startet mit einer definierten Default-Richtung', () => {
    const player = new Player();
    expect(Math.hypot(player.facing.x, player.facing.y)).toBeGreaterThan(0);
  });
});
