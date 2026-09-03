import { describe, expect, it } from 'vitest';
import { createEnemy, type Enemy } from '../../game/enemy';
import { classifyLevel3Minis, EEL_BODY_COUNT, isEelBodySegment, ROAMER_COUNT } from './enemySet';

function minis(n: number): Enemy[] {
  return Array.from({ length: n }, (_, i) =>
    createEnemy({ x: i * 10, y: 0 }, { speed: 100, size: 40 }),
  );
}

describe('classifyLevel3Minis', () => {
  it('teilt die Liste in die ersten EEL_BODY_COUNT Aal-Segmente und den Rest als Plasma-Minis', () => {
    const all = minis(EEL_BODY_COUNT + ROAMER_COUNT);
    const { body, roamers } = classifyLevel3Minis(all);

    expect(body).toEqual(all.slice(0, EEL_BODY_COUNT));
    expect(roamers).toEqual(all.slice(EEL_BODY_COUNT));
    expect(body.every(isEelBodySegment)).toBe(true);
    expect(roamers.some(isEelBodySegment)).toBe(false);
  });

  it('hält die Zuordnung stabil, wenn Gegner entfernt werden (Einkesseln/Kanone)', () => {
    const all = minis(EEL_BODY_COUNT + ROAMER_COUNT);
    classifyLevel3Minis(all);

    // Ein Aal-Segment und eine Plasma-Mini "besiegt" → aus der Liste raus.
    const removedBody = all[2];
    const removedRoamer = all[EEL_BODY_COUNT + 1];
    const remaining = all.filter((m) => m !== removedBody && m !== removedRoamer);

    const { body, roamers } = classifyLevel3Minis(remaining);
    expect(body).toHaveLength(EEL_BODY_COUNT - 1);
    expect(roamers).toHaveLength(ROAMER_COUNT - 1);
    expect(body).not.toContain(removedBody);
    expect(roamers).not.toContain(removedRoamer);
    // Verbliebene behalten ihre Gruppe.
    expect(body).toContain(all[0]);
    expect(roamers).toContain(all[EEL_BODY_COUNT]);
  });
});
