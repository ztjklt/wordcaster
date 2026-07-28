import Phaser from 'phaser';

type Quality = 'high' | 'low';

export class CombatVfxDirector {
  private readonly active = new Set<Phaser.GameObjects.GameObject>();
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly quality: Quality,
    private readonly reducedMotion: boolean,
  ) {}

  attackArc(
    x: number,
    y: number,
    facing: 1 | -1,
    color: number,
    variant = 0,
  ): void {
    if (this.destroyed) return;
    const tier = Phaser.Math.Clamp(variant, 0, 2);
    if (this.quality === 'high' && this.scene.textures.exists('vfx-anime-slash-v1')) {
      const widths = [188, 226, 318];
      const heights = [106, 132, 184];
      const rotations = [-.03, -.68, .14];
      const slash = this.track(
        this.scene.add.image(x + facing * (tier === 2 ? 54 : 40), y - 22, 'vfx-anime-slash-v1')
          .setDisplaySize(widths[tier], heights[tier])
          .setFlipX(facing < 0)
          .setRotation(rotations[tier] * facing)
          .setTint(tier === 2 ? 0xffffff : color)
          .setAlpha(tier === 2 ? .92 : .72)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(24),
      );
      const targetScaleX = slash.scaleX;
      const targetScaleY = slash.scaleY;
      slash.setScale(targetScaleX * .42, targetScaleY * .42);
      const endScale = tier === 2 ? 1.24 : 1;
      this.scene.tweens.add({
        targets: slash,
        x: slash.x + facing * (tier === 2 ? 50 : 28),
        scaleX: targetScaleX * endScale,
        scaleY: targetScaleY * endScale,
        rotation: slash.rotation + facing * (tier === 1 ? .18 : .08),
        alpha: 0,
        duration: this.reducedMotion ? 100 : [180, 225, 320][tier],
        ease: 'Cubic.out',
        onComplete: () => this.dispose(slash),
      });
      return;
    }

    const arc = this.track(
      this.scene.add.arc(
        x + facing * 30,
        y,
        tier === 2 ? 74 : 54,
        facing > 0 ? -76 : 104,
        facing > 0 ? 46 : 226,
        false,
        color,
        0,
      )
        .setStrokeStyle(tier === 2 ? 7 : 4, color, .78)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(24),
    );
    this.scene.tweens.add({
      targets: arc,
      alpha: 0,
      scale: tier === 2 ? 1.55 : 1.3,
      duration: this.reducedMotion ? 90 : 190 + tier * 45,
      ease: 'Cubic.out',
      onComplete: () => this.dispose(arc),
    });
  }

  impact(x: number, y: number, color: number, intensity = 1): void {
    if (this.destroyed) return;
    const tier = Phaser.Math.Clamp(intensity, 0, 2);
    if (this.quality === 'high' && this.scene.textures.exists('vfx-anime-impact-v1')) {
      const size = [126, 174, 244][tier];
      const burst = this.track(
        this.scene.add.image(x, y, 'vfx-anime-impact-v1')
          .setDisplaySize(size, size)
          .setTint(tier === 2 ? 0xffffff : color)
          .setRotation(Phaser.Math.FloatBetween(-.45, .45))
          .setAlpha(.94)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(28),
      );
      const targetScaleX = burst.scaleX;
      const targetScaleY = burst.scaleY;
      burst.setScale(targetScaleX * .18, targetScaleY * .18);
      const endScale = tier === 2 ? 1.18 : .95;
      this.scene.tweens.add({
        targets: burst,
        scaleX: targetScaleX * endScale,
        scaleY: targetScaleY * endScale,
        alpha: 0,
        rotation: burst.rotation + Phaser.Math.FloatBetween(-.12, .12),
        duration: this.reducedMotion ? 90 : 135 + tier * 55,
        ease: 'Expo.out',
        onComplete: () => this.dispose(burst),
      });
    }

    const ring = this.track(
      this.scene.add.circle(x, y, 22 + tier * 8, color, 0)
        .setStrokeStyle(tier === 2 ? 5 : 3, tier === 2 ? 0xffffff : color, .88)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(27)
        .setScale(.35),
    );
    this.scene.tweens.add({
      targets: ring,
      scale: 1.65 + tier * .35,
      alpha: 0,
      duration: this.reducedMotion ? 85 : 150 + tier * 50,
      ease: 'Cubic.out',
      onComplete: () => this.dispose(ring),
    });
  }

  dashDust(x: number, y: number, facing: 1 | -1, color: number): void {
    if (this.destroyed || this.reducedMotion) return;
    const count = this.quality === 'high' ? 5 : 2;
    for (let index = 0; index < count; index += 1) {
      const streak = this.track(
        this.scene.add.rectangle(
          x - facing * Phaser.Math.Between(10, 30),
          y + Phaser.Math.Between(52, 68),
          Phaser.Math.Between(14, 34),
          Phaser.Math.Between(1, 3),
          index % 3 === 0 ? 0xffffff : color,
          Phaser.Math.FloatBetween(.22, .56),
        )
          .setOrigin(facing > 0 ? 1 : 0, .5)
          .setRotation(Phaser.Math.FloatBetween(-.15, .15))
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(10),
      );
      this.scene.tweens.add({
        targets: streak,
        x: streak.x - facing * Phaser.Math.Between(36, 82),
        y: streak.y - Phaser.Math.Between(0, 16),
        scaleX: .08,
        alpha: 0,
        duration: Phaser.Math.Between(150, 260),
        ease: 'Cubic.out',
        onComplete: () => this.dispose(streak),
      });
    }
  }

  castBurst(x: number, y: number, color: number): void {
    if (this.destroyed) return;
    const halo = this.track(
      this.scene.add.circle(x, y, 38, color, .035)
        .setStrokeStyle(3, color, .72)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(23)
        .setScale(.4),
    );
    this.scene.tweens.add({
      targets: halo,
      scale: this.quality === 'high' ? 2.2 : 1.65,
      alpha: 0,
      duration: this.reducedMotion ? 110 : 330,
      ease: 'Cubic.out',
      onComplete: () => this.dispose(halo),
    });

    if (this.quality !== 'high' || !this.scene.textures.exists('vfx-anime-impact-v1')) return;
    const star = this.track(
      this.scene.add.image(x, y, 'vfx-anime-impact-v1')
        .setDisplaySize(142, 142)
        .setTint(color)
        .setAlpha(.4)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(22),
    );
    const targetScaleX = star.scaleX;
    const targetScaleY = star.scaleY;
    star.setScale(targetScaleX * .25, targetScaleY * .25);
    this.scene.tweens.add({
      targets: star,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      alpha: 0,
      angle: 16,
      duration: this.reducedMotion ? 100 : 300,
      ease: 'Cubic.out',
      onComplete: () => this.dispose(star),
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.active.forEach((object) => {
      this.scene.tweens.killTweensOf(object);
      object.destroy();
    });
    this.active.clear();
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.active.add(object);
    return object;
  }

  private dispose(object: Phaser.GameObjects.GameObject): void {
    if (!this.active.delete(object)) return;
    object.destroy();
  }
}
