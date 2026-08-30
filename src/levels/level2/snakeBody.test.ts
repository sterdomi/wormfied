import { describe, it, expect } from 'vitest';
import { createEnemy } from '../../game/enemy';
import { createRectangularField } from '../../game/field';
import { advanceSnakeBody, bodySegmentDistance, createSnakeBodyState } from './snakeBody';

// Bewusst riesig, damit der Kopf in keinem Test die Wand erreicht und der
// Geradeauslauf wirklich geradeaus bleibt.
const FIELD = createRectangularField(100_000, 100_000);
const DT = 1 / 60;
// rng ≡ 0.5 → kein Abbiege-Ausschlag: der Kopf fährt exakt geradeaus.
const STRAIGHT = (): number => 0.5;

const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

function makeSnake(miniCount = 3) {
  const head = createEnemy({ x: 200, y: 50_000 }, { speed: 300, size: 130 });
  head.direction = { x: 1, y: 0 };
  const minis = Array.from({ length: miniCount }, () =>
    createEnemy({ x: 0, y: 0 }, { speed: 0, size: 98 }),
  );
  return { head, body: createSnakeBodyState(head), minis };
}

describe('Schlangen-Körperkette (Kopf + Mini-Gegner)', () => {
  it('erstes Frame: Körperglieder hinter dem Kopf, nicht bei (0,0)', () => {
    const { head, body, minis } = makeSnake();

    advanceSnakeBody(head, body, minis, FIELD, DT, STRAIGHT);

    minis.forEach((m) => {
      expect(dist(m.position, { x: 0, y: 0 })).toBeGreaterThan(150);
      // Kopf fährt nach +x → Glieder liegen dahinter (kleineres x), auf Höhe.
      expect(m.position.x).toBeLessThan(head.position.x);
      expect(Math.abs(m.position.y - head.position.y)).toBeLessThan(1);
    });
  });

  it('Glieder sitzen auf ihren Weglängen-Abständen hinter dem Kopf', () => {
    const { head, body, minis } = makeSnake();
    for (let i = 0; i < 120; i++) advanceSnakeBody(head, body, minis, FIELD, DT, STRAIGHT);

    minis.forEach((m, i) => {
      expect(dist(m.position, head.position)).toBeCloseTo(bodySegmentDistance(head.size, i), 1);
    });
    // Staffelung: jedes Glied weiter hinten als das vorige.
    const d = minis.map((m) => dist(m.position, head.position));
    expect(d[0]).toBeLessThan(d[1]);
    expect(d[1]).toBeLessThan(d[2]);
  });

  it('weniger Glieder (eines besiegt) = kürzere Kette, Kopf läuft weiter', () => {
    const { head, body, minis } = makeSnake();
    for (let i = 0; i < 120; i++) advanceSnakeBody(head, body, minis, FIELD, DT, STRAIGHT);

    const shortened = minis.slice(0, 2);
    const headBefore = { ...head.position };
    for (let i = 0; i < 30; i++) advanceSnakeBody(head, body, shortened, FIELD, DT, STRAIGHT);

    expect(head.position.x).toBeGreaterThan(headBefore.x);
    shortened.forEach((m, i) => {
      expect(dist(m.position, head.position)).toBeCloseTo(bodySegmentDistance(head.size, i), 1);
    });
  });

  it('ohne Glieder läuft der Kopf trotzdem (kein Absturz)', () => {
    const { head, body } = makeSnake(0);
    expect(() => {
      for (let i = 0; i < 20; i++) advanceSnakeBody(head, body, [], FIELD, DT, STRAIGHT);
    }).not.toThrow();
  });

  it('kappt den Trail (wächst nicht unbegrenzt)', () => {
    const { head, body, minis } = makeSnake();

    for (let i = 0; i < 120; i++) advanceSnakeBody(head, body, minis, FIELD, DT, STRAIGHT);
    const lengthEarly = body.trail.length;

    for (let i = 0; i < 600; i++) advanceSnakeBody(head, body, minis, FIELD, DT, STRAIGHT);
    expect(body.trail.length).toBeLessThanOrEqual(lengthEarly + 2);
  });
});
