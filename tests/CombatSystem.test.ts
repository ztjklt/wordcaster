import { describe, expect, it } from 'vitest';
import { CombatSystem, type FighterStats } from '../src/game/combat/CombatSystem';

const stats = (overrides: Partial<FighterStats> = {}): FighterStats => ({ health: 100, maxHealth: 100, stamina: 100, maxStamina: 100, blocking: false, ...overrides });

describe('CombatSystem', () => {
  it('applies direct damage and reports defeat', () => {
    const target = stats({ health: 10 });
    expect(CombatSystem.applyDamage(target, 14)).toEqual({ damage: 14, blocked: false, defeated: true });
    expect(target.health).toBe(0);
  });
  it('reduces blocked damage and consumes stamina', () => {
    const target = stats({ blocking: true, stamina: 50 });
    expect(CombatSystem.applyDamage(target, 20)).toEqual({ damage: 4, blocked: true, defeated: false });
    expect(target.stamina).toBe(38);
  });
  it('regenerates stamina only while not blocking', () => {
    const target = stats({ stamina: 80 });
    CombatSystem.regenerateStamina(target, 1);
    expect(target.stamina).toBe(98);
    target.blocking = true;
    CombatSystem.regenerateStamina(target, 1);
    expect(target.stamina).toBe(98);
  });
});
