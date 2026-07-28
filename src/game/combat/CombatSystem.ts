export interface FighterStats {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  blocking: boolean;
}

export interface DamageResult { damage: number; blocked: boolean; defeated: boolean; }

export class CombatSystem {
  static applyDamage(target: FighterStats, amount: number): DamageResult {
    const blocked = target.blocking && target.stamina >= 12;
    const damage = Math.max(0, Math.round(amount * (blocked ? 0.2 : 1)));
    if (blocked) target.stamina = Math.max(0, target.stamina - 12);
    target.health = Math.max(0, target.health - damage);
    return { damage, blocked, defeated: target.health === 0 };
  }

  static regenerateStamina(target: FighterStats, deltaSeconds: number): void {
    if (!target.blocking) target.stamina = Math.min(target.maxStamina, target.stamina + 18 * deltaSeconds);
  }
}
