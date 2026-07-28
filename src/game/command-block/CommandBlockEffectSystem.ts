import Phaser from 'phaser';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { CommandEffectType, CommandWordDefinition } from './CommandBlockContent';

export const SUPPORTED_COMMAND_EFFECT_TYPES: ReadonlySet<CommandEffectType> = new Set([
  'damage', 'heal', 'shield', 'stun', 'time', 'platform', 'teleport', 'hint',
  'score', 'projectile', 'shockwave', 'moving-platform', 'mist', 'regen', 'path', 'special',
]);

export interface CommandBlockEffectHooks {
  addTime(valueMs: number): void;
  addScore(value: number): void;
  showHints(durationMs: number): void;
  createPlatform(durationMs: number, preset: string): void;
  createMovingPlatform(durationMs: number, preset: string): void;
  createPath(durationMs: number, preset: string): void;
  clearProjectiles(): void;
  reflectProjectiles(): void;
  freezeProjectiles(durationMs: number): void;
  highlightRoute(durationMs: number): void;
  grantComboGuard(count: number): void;
}

export class CommandBlockEffectSystem {
  shieldHits = 0;
  enemyDisabledUntil = 0;
  projectileSlowUntil = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly enemy: Enemy,
    private readonly hooks: CommandBlockEffectHooks,
  ) {}

  apply(definition: CommandWordDefinition, now: number): void {
    const effect = definition.effect;
    this.signature(definition);

    if (effect.type === 'damage') {
      const damage = effect.value ?? 20;
      this.enemy.stats.health = Math.max(5, this.enemy.stats.health - damage);
      this.enemy.playHit(now);
      this.enemy.setVelocityX(effect.preset === 'train-rush' ? 320 : effect.preset === 'knife-flurry' ? 80 : 150);
      this.damageVisual(definition, damage);
    } else if (effect.type === 'heal') {
      this.player.stats.health = Math.min(this.player.stats.maxHealth, this.player.stats.health + (effect.value ?? 18));
      if (effect.preset === 'frog-hop') this.player.setVelocityY(-330);
      this.pulse(this.player.x, this.player.y - 50, definition.visual.color);
    } else if (effect.type === 'shield') {
      this.shieldHits += effect.hits ?? 1;
      if (effect.durationMs) this.player.invulnerableUntil = Math.max(this.player.invulnerableUntil, now + Math.min(900, effect.durationMs / 7));
      this.pulse(this.player.x, this.player.y - 50, definition.visual.color);
    } else if (effect.type === 'stun') {
      this.enemyDisabledUntil = Math.max(this.enemyDisabledUntil, now + (effect.durationMs ?? 3000));
      this.enemy.setVelocity(0, effect.preset === 'fridge-freeze' ? -60 : 0);
      this.pulse(this.enemy.x, this.enemy.y - 54, definition.visual.color);
    } else if (effect.type === 'time') {
      this.hooks.addTime(effect.value ?? 3000);
      this.clockPulse(definition.visual.color);
    } else if (effect.type === 'platform') {
      this.hooks.createPlatform(effect.durationMs ?? 8000, effect.preset);
    } else if (effect.type === 'moving-platform') {
      this.hooks.createMovingPlatform(effect.durationMs ?? 8000, effect.preset);
    } else if (effect.type === 'teleport') {
      const targetX = this.player.x < 640 ? 1050 : 230;
      this.player.setPosition(targetX, 430).setVelocity(0, -100);
      this.pulse(targetX, 430, definition.visual.color);
    } else if (effect.type === 'hint') {
      this.hooks.showHints(effect.durationMs ?? 4500);
      if (effect.value) this.hooks.addTime(effect.value);
    } else if (effect.type === 'score') {
      this.hooks.addScore(effect.value ?? 100);
      this.coinSpiral(definition.visual.color);
    } else if (effect.type === 'projectile') {
      this.applyProjectileEffect(effect.preset, effect.durationMs ?? 3500, now);
    } else if (effect.type === 'shockwave') {
      this.enemy.stats.health = Math.max(5, this.enemy.stats.health - (effect.value ?? 20));
      this.enemyDisabledUntil = Math.max(this.enemyDisabledUntil, now + (effect.durationMs ?? 2500));
      this.enemy.setVelocity(300, -180);
      this.shockwave(definition.visual.color);
    } else if (effect.type === 'mist') {
      this.player.invulnerableUntil = Math.max(this.player.invulnerableUntil, now + (effect.durationMs ?? 5000));
      this.hooks.clearProjectiles();
      this.mist(definition.visual.color, effect.durationMs ?? 5000);
    } else if (effect.type === 'regen') {
      this.regenerate(effect.value ?? 4, effect.durationMs ?? 5000, definition.visual.color);
      if (effect.preset === 'cake-combo-guard') this.hooks.grantComboGuard(1);
    } else if (effect.type === 'path') {
      if (effect.preset === 'safe-route') this.hooks.highlightRoute(effect.durationMs ?? 6500);
      else this.hooks.createPath(effect.durationMs ?? 8500, effect.preset);
    } else {
      this.applySpecial(effect.preset, now, definition.visual.color);
    }
  }

  absorbProjectile(): boolean {
    if (this.shieldHits <= 0) return false;
    this.shieldHits -= 1;
    this.pulse(this.player.x, this.player.y - 48, 0x72ddff);
    return true;
  }

  projectileSpeedScale(now: number): number {
    return now < this.projectileSlowUntil ? .48 : 1;
  }

  private applyProjectileEffect(preset: string, durationMs: number, now: number): void {
    if (preset === 'moon-slow') {
      this.projectileSlowUntil = Math.max(this.projectileSlowUntil, now + durationMs);
    } else if (preset === 'fan-reflect' || preset === 'globe-orbit') {
      this.hooks.reflectProjectiles();
      if (preset === 'globe-orbit') this.enemy.stats.health = Math.max(5, this.enemy.stats.health - 12);
    } else if (preset === 'signal-freeze') {
      this.hooks.freezeProjectiles(durationMs);
    } else if (preset === 'basket-catch') {
      this.hooks.clearProjectiles();
      this.hooks.addScore(80);
    } else {
      this.hooks.clearProjectiles();
    }
  }

  private applySpecial(preset: string, now: number, color: number): void {
    if (preset === 'fox-decoy') {
      this.hooks.clearProjectiles();
      this.enemyDisabledUntil = Math.max(this.enemyDisabledUntil, now + 2600);
    } else if (preset === 'wild-box') {
      const option = Math.floor(now / 100) % 3;
      if (option === 0) this.player.stats.health = Math.min(this.player.stats.maxHealth, this.player.stats.health + 18);
      else if (option === 1) this.shieldHits += 1;
      else this.hooks.addTime(2800);
    } else if (preset === 'supply-cabinet') {
      this.player.stats.health = Math.min(this.player.stats.maxHealth, this.player.stats.health + 12);
      this.shieldHits += 1;
    } else if (preset === 'market-mystery-box') {
      this.hooks.addScore(90);
      this.hooks.clearProjectiles();
    } else if (preset === 'fish-slip') {
      this.enemyDisabledUntil = Math.max(this.enemyDisabledUntil, now + 3000);
      this.enemy.setVelocity(-230, -260);
    } else if (preset === 'plate-combo') {
      this.hooks.addScore(120);
      this.hooks.grantComboGuard(1);
    }
    this.pulse(this.player.x, this.player.y - 50, color);
  }

  private regenerate(value: number, durationMs: number, color: number): void {
    const ticks = Math.max(2, Math.round(durationMs / 1000));
    for (let index = 0; index < ticks; index += 1) {
      this.scene.time.delayedCall(index * 1000, () => {
        if (!this.player.active) return;
        this.player.stats.health = Math.min(this.player.stats.maxHealth, this.player.stats.health + value);
        this.pulse(this.player.x, this.player.y - 46, color, 7);
      });
    }
  }

  private signature(definition: CommandWordDefinition): void {
    const originX = this.player.x + this.player.facing * 42;
    const originY = this.player.y - 58;
    const hash = [...definition.effectId].reduce((sum, value) => sum + value.charCodeAt(0), 0);
    const count = 8 + hash % 8;
    for (let index = 0; index < count; index += 1) {
      const angle = Math.PI * 2 * index / count + hash * .01;
      const glyph = this.scene.add.text(originX, originY, index % 3 === 0 ? '✦' : '·', {
        fontFamily: 'Arial',
        fontSize: index % 3 === 0 ? '15px' : '20px',
        color: index % 4 === 0 ? '#ffffff' : `#${definition.visual.color.toString(16).padStart(6, '0')}`,
      }).setOrigin(.5).setDepth(36).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: glyph,
        x: originX + Math.cos(angle) * (42 + hash % 35),
        y: originY + Math.sin(angle) * (32 + index % 4 * 8),
        rotation: angle + Math.PI,
        alpha: 0,
        scale: .2,
        duration: 360 + hash % 260,
        onComplete: () => glyph.destroy(),
      });
    }
  }

  private damageVisual(definition: CommandWordDefinition, damage: number): void {
    const x1 = this.player.x;
    const y1 = this.player.y - 52;
    const x2 = this.enemy.x;
    const y2 = this.enemy.y - 52;
    const strikes = definition.effect.preset === 'knife-flurry' ? 3 : definition.effect.preset === 'neon-chain' ? 2 : 1;
    for (let index = 0; index < strikes; index += 1) {
      this.scene.time.delayedCall(index * 90, () => this.flashBetween(
        x1,
        y1 + (index - 1) * 18,
        x2,
        y2 - (index - 1) * 18,
        definition.visual.color,
        definition.effect.preset === 'train-rush' ? 13 : Math.max(4, damage / 7),
      ));
    }
  }

  private clockPulse(color: number): void {
    for (let index = 0; index < 3; index += 1) {
      const ring = this.scene.add.circle(640, 92, 12, color, .02)
        .setStrokeStyle(2, color, .8)
        .setDepth(35)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: ring,
        scale: 2.5 + index,
        alpha: 0,
        duration: 520,
        delay: index * 100,
        onComplete: () => ring.destroy(),
      });
    }
  }

  private coinSpiral(color: number): void {
    for (let index = 0; index < 12; index += 1) {
      const coin = this.scene.add.circle(640, 260, 4, color, .9).setDepth(36);
      const angle = index / 12 * Math.PI * 2;
      this.scene.tweens.add({
        targets: coin,
        x: 640 + Math.cos(angle) * 90,
        y: 180 + Math.sin(angle) * 38,
        alpha: 0,
        duration: 620,
        onComplete: () => coin.destroy(),
      });
    }
  }

  private mist(color: number, durationMs: number): void {
    for (let index = 0; index < 18; index += 1) {
      const cloud = this.scene.add.ellipse(
        this.player.x - 75 + index % 6 * 30,
        this.player.y - 20 - Math.floor(index / 6) * 25,
        70,
        32,
        color,
        .12,
      ).setDepth(24).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: cloud,
        x: cloud.x + 45,
        alpha: 0,
        duration: durationMs,
        delay: index * 35,
        onComplete: () => cloud.destroy(),
      });
    }
  }

  private shockwave(color: number): void {
    const ring = this.scene.add.circle(this.player.x, this.player.y - 40, 24, color, .03)
      .setStrokeStyle(5, color, .9)
      .setDepth(35)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: ring, scale: 12, alpha: 0, duration: 520, onComplete: () => ring.destroy() });
    this.scene.cameras.main.shake(180, .008);
  }

  private pulse(x: number, y: number, color: number, count = 14): void {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.PI * 2 * index / count;
      const particle = this.scene.add.circle(x, y, index % 3 === 0 ? 4 : 2, color, .9)
        .setDepth(35)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * (48 + index % 4 * 12),
        y: y + Math.sin(angle) * (48 + index % 4 * 12),
        alpha: 0,
        scale: .2,
        duration: 430,
        onComplete: () => particle.destroy(),
      });
    }
  }

  private flashBetween(x1: number, y1: number, x2: number, y2: number, color: number, thickness: number): void {
    const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
    const slash = this.scene.add.rectangle((x1 + x2) / 2, (y1 + y2) / 2, distance, thickness, color, .92)
      .setRotation(angle)
      .setDepth(35)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: slash, alpha: 0, scaleY: 3, duration: 210, onComplete: () => slash.destroy() });
  }
}
