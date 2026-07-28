import Phaser from 'phaser';
import { SaveManager } from '../../storage/SaveManager';
import { Player } from '../entities/Player';

export class EquipmentSystem {
  private shield?: Phaser.GameObjects.Container;
  private sword?: Phaser.GameObjects.Container;
  private readonly highEffects: boolean;
  damageMultiplier = 1;

  constructor(private readonly scene: Phaser.Scene, private readonly player: Player) {
    this.highEffects = SaveManager.load().settings.effectsQuality !== 'low';
  }

  equip(itemId: string): string {
    if (itemId === 'shield') {
      this.equipShield();
      return 'Shield equipped · 盾牌已装备';
    }
    if (itemId === 'sword') {
      this.equipSword();
      return 'Sword equipped · 攻击强化';
    }
    return '未知装备';
  }

  update(): void {
    const direction = this.player.facing;
    const now = this.scene.time.now;
    if (this.shield) {
      const blocking = this.player.stats.blocking;
      const breathe = Math.sin(now * 0.006) * 2;
      this.shield
        .setPosition(
          this.player.x + direction * (blocking ? 53 : 45),
          this.player.y - (blocking ? 4 : 0) + breathe,
        )
        .setScale(direction * (blocking ? 1.08 : 0.94), blocking ? 1.08 : 0.94)
        .setAlpha(blocking ? 1 : 0.78)
        .setRotation(direction * Math.sin(now * 0.004) * 0.025);
    }
    if (this.sword) {
      const remaining = this.player.attackReadyAt - now;
      const attacking = remaining > 100 && remaining <= 430;
      const progress = attacking ? Phaser.Math.Clamp((430 - remaining) / 330, 0, 1) : 0;
      const sweep = attacking ? Math.sin(progress * Math.PI) : 0;
      const angle = direction > 0
        ? Phaser.Math.Linear(-0.7, 0.26, sweep)
        : Phaser.Math.Linear(0.7, -0.26, sweep);
      this.sword
        .setPosition(
          this.player.x + direction * (30 + sweep * 28),
          this.player.y - 30 - sweep * 15,
        )
        .setScale(direction, 1)
        .setRotation(angle)
        .setAlpha(this.player.defeated ? 0.25 : 1);
    }
  }

  destroy(): void {
    this.shield?.destroy();
    this.sword?.destroy();
  }

  private equipShield(): void {
    this.shield?.destroy();
    const aura = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    aura.fillStyle(0x4de6c8, 0.09).fillCircle(0, 0, 46);
    aura.lineStyle(9, 0x4de6c8, 0.08).strokeCircle(0, 0, 40);

    const plate = this.scene.add.graphics();
    plate.fillStyle(0x02070e, 0.92)
      .beginPath()
      .moveTo(0, -39)
      .lineTo(30, -27)
      .lineTo(34, 8)
      .lineTo(20, 31)
      .lineTo(0, 43)
      .lineTo(-20, 31)
      .lineTo(-34, 8)
      .lineTo(-30, -27)
      .closePath()
      .fillPath();
    plate.lineStyle(5, 0x0f3340, 1)
      .beginPath()
      .moveTo(0, -39)
      .lineTo(30, -27)
      .lineTo(34, 8)
      .lineTo(20, 31)
      .lineTo(0, 43)
      .lineTo(-20, 31)
      .lineTo(-34, 8)
      .lineTo(-30, -27)
      .closePath()
      .strokePath();
    plate.fillStyle(0x0a2430, 0.95)
      .beginPath()
      .moveTo(0, -31)
      .lineTo(23, -21)
      .lineTo(26, 6)
      .lineTo(15, 25)
      .lineTo(0, 34)
      .lineTo(-15, 25)
      .lineTo(-26, 6)
      .lineTo(-23, -21)
      .closePath()
      .fillPath();
    plate.lineStyle(3, 0xa7fff0, 0.92)
      .beginPath()
      .moveTo(0, -34)
      .lineTo(27, -23)
      .lineTo(29, 7)
      .lineTo(17, 28)
      .lineTo(0, 38)
      .lineTo(-17, 28)
      .lineTo(-29, 7)
      .lineTo(-27, -23)
      .closePath()
      .strokePath();
    plate.lineStyle(2, 0x4de6c8, 0.72)
      .lineBetween(0, -29, 0, 31)
      .lineBetween(-23, -18, 20, 22)
      .lineBetween(23, -18, -20, 22);
    plate.lineStyle(1, 0xffd66d, 0.62)
      .beginPath().arc(0, 1, 16, -Math.PI / 2, Math.PI * 1.5).strokePath();
    plate.fillStyle(0x02070e, 1).fillCircle(0, 1, 7);
    plate.lineStyle(3, 0xffd66d, 0.95).strokeCircle(0, 1, 6);
    plate.fillStyle(0xf7fff8, 0.96).fillCircle(0, 1, 2.5);

    const runes = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    for (let index = 0; index < 6; index += 1) {
      const angle = index * Math.PI / 3;
      const x = Math.cos(angle) * 23;
      const y = Math.sin(angle) * 23;
      runes.fillStyle(index % 2 ? 0xffd66d : 0x63f0d4, 0.7)
        .fillTriangle(x, y - 2, x + 3, y + 3, x - 3, y + 3);
    }

    const shield = this.scene.add
      .container(this.player.x, this.player.y, [aura, plate, runes])
      .setDepth(11)
      .setScale(0.35)
      .setAlpha(0);
    this.shield = shield;
    this.scene.tweens.add({
      targets: shield,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 190,
      ease: 'Back.Out',
    });
    this.scene.tweens.add({
      targets: aura,
      alpha: 0.38,
      scale: 1.12,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.scene.tweens.add({
      targets: runes,
      rotation: Math.PI * 2,
      duration: 5400,
      repeat: -1,
      ease: 'Linear',
    });
    this.equipmentBurst(this.player.x, this.player.y, 0x63f0d4);
    this.player.stats.stamina = this.player.stats.maxStamina;
    this.scene.time.delayedCall(12000, () => {
      if (this.shield !== shield) return;
      this.scene.tweens.add({
        targets: shield,
        alpha: 0,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 180,
        onComplete: () => shield.destroy(),
      });
      this.shield = undefined;
    });
  }

  private equipSword(): void {
    this.sword?.destroy();
    this.damageMultiplier = 1.55;
    const blade = this.scene.add.graphics();
    blade.fillStyle(0x02050c, 1).fillRoundedRect(-9, -8, 33, 16, 4);
    blade.fillStyle(0x6b3f1f, 1).fillRoundedRect(-7, -5, 24, 10, 3);
    blade.lineStyle(2, 0xf2bc64, 0.92).strokeRoundedRect(-7, -5, 24, 10, 3);
    blade.fillStyle(0xc9933d, 1).fillRoundedRect(14, -12, 7, 24, 3);
    blade.fillStyle(0x061018, 1)
      .beginPath()
      .moveTo(21, -9)
      .lineTo(88, -7)
      .lineTo(105, 0)
      .lineTo(88, 7)
      .lineTo(21, 9)
      .closePath()
      .fillPath();
    blade.fillStyle(0x3ce4d3, 0.86)
      .beginPath()
      .moveTo(25, -6)
      .lineTo(88, -4)
      .lineTo(101, 0)
      .lineTo(88, 4)
      .lineTo(25, 6)
      .closePath()
      .fillPath();
    blade.fillStyle(0xeaffff, 0.9)
      .beginPath()
      .moveTo(30, -4)
      .lineTo(88, -2)
      .lineTo(99, 0)
      .lineTo(32, 0)
      .closePath()
      .fillPath();
    blade.lineStyle(2, 0xffd66d, 0.82).lineBetween(24, 7, 88, 5);
    blade.fillStyle(0xffd66d, 1).fillCircle(19, 0, 4);

    const glow = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    glow.fillStyle(0x63f0d4, 0.08)
      .beginPath()
      .moveTo(18, -13)
      .lineTo(91, -10)
      .lineTo(111, 0)
      .lineTo(91, 10)
      .lineTo(18, 13)
      .closePath()
      .fillPath();
    glow.lineStyle(8, 0x63f0d4, 0.08).lineBetween(25, 0, 103, 0);

    const sword = this.scene.add
      .container(this.player.x, this.player.y, [glow, blade])
      .setDepth(11)
      .setScale(0.45)
      .setAlpha(0);
    this.sword = sword;
    this.scene.tweens.add({
      targets: sword,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 210,
      ease: 'Back.Out',
    });
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.7,
      duration: 430,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.equipmentBurst(this.player.x, this.player.y - 24, 0xffd66d);
    this.scene.time.delayedCall(12000, () => {
      if (this.sword !== sword) return;
      this.scene.tweens.add({
        targets: sword,
        alpha: 0,
        duration: 160,
        onComplete: () => sword.destroy(),
      });
      this.sword = undefined;
      this.damageMultiplier = 1;
    });
  }

  private equipmentBurst(x: number, y: number, color: number): void {
    const burst = this.scene.add.graphics().setPosition(x, y).setDepth(10).setBlendMode(Phaser.BlendModes.ADD);
    burst.lineStyle(3, color, 0.8).strokeCircle(0, 0, 28);
    if (this.highEffects) {
      for (let index = 0; index < 8; index += 1) {
        const angle = index * Math.PI / 4;
        burst.lineStyle(2, index % 2 ? 0xffffff : color, 0.72)
          .lineBetween(
            Math.cos(angle) * 32,
            Math.sin(angle) * 32,
            Math.cos(angle) * 48,
            Math.sin(angle) * 48,
          );
      }
    }
    this.scene.tweens.add({
      targets: burst,
      scale: 1.7,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.Out',
      onComplete: () => burst.destroy(),
    });
  }
}
