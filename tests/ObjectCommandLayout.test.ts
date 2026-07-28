import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { ARENAS } from '../src/game/arena/BattleContent';
import { planObjectLayout } from '../src/game/objects/ObjectCommandSystem';

const expectedObjectCounts: Record<string, number> = {
  'neon-shrine': 5,
  'moon-bamboo': 6,
  'cyber-market': 7,
  'sunrise-kitchen': 8,
  'cozy-study': 8,
  'metro-commute': 8,
};

describe('battle object layout', () => {
  it.each(ARENAS)('uses only lesson objects in $id', (arena) => {
    const lessonIds = arena.lesson.words.flatMap((word) => word.itemId ? [word.itemId] : []);
    const placements = planObjectLayout(lessonIds);
    expect(placements).toHaveLength(expectedObjectCounts[arena.id]);
    expect(placements.every((placement) => lessonIds.includes(placement.id))).toBe(true);
    expect(new Set(placements.map((placement) => placement.id)).size).toBe(placements.length);
  });

  it('does not leak former profile extras into another lesson', () => {
    const layouts = Object.fromEntries(ARENAS.map((arena) => [
      arena.id,
      planObjectLayout(arena.lesson.words.flatMap((word) => word.itemId ? [word.itemId] : []))
        .map((placement) => placement.id),
    ]));
    expect(layouts['neon-shrine']).not.toContain('bridge');
    expect(layouts['moon-bamboo']).not.toContain('basket');
    expect(layouts['cyber-market']).not.toContain('cup');
    expect(layouts['cyber-market']).not.toContain('kettle');
  });

  it.each(ARENAS)('keeps $id central combat lane free of solid clutter', (arena) => {
    const placements = planObjectLayout(
      arena.lesson.words.flatMap((word) => word.itemId ? [word.itemId] : []),
    );
    const solid = placements.filter((placement) => placement.solid);
    expect(solid.length).toBeLessThanOrEqual(2);
    expect(solid.every((placement) => placement.x <= 110 || placement.x >= 1170)).toBe(true);
    expect(solid.every((placement) => Math.abs(placement.x - 250) >= 150)).toBe(true);
    expect(solid.every((placement) => Math.abs(placement.x - 1000) >= 190)).toBe(true);
  });

  it.each(ARENAS)('distributes $id display objects across safe visual tiers', (arena) => {
    const display = planObjectLayout(
      arena.lesson.words.flatMap((word) => word.itemId ? [word.itemId] : []),
    ).filter((placement) => !placement.solid);
    expect(display.every((placement) => placement.scale === .82)).toBe(true);
    for (let left = 0; left < display.length; left += 1) {
      for (let right = left + 1; right < display.length; right += 1) {
        if (display[left].surface !== display[right].surface) continue;
        expect(Math.abs(display[left].x - display[right].x)).toBeGreaterThanOrEqual(110);
      }
    }
  });

  it('caps pathological input at eight unique supported objects and two solids', () => {
    const placements = planObjectLayout([
      'gate', 'bridge', 'fridge', 'table', 'window', 'desk', 'door', 'cabinet',
      'bamboo', 'lantern', 'gate', 'unknown-object',
    ]);
    expect(placements).toHaveLength(8);
    expect(placements.filter((placement) => placement.solid)).toHaveLength(2);
  });
});
