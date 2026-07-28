import Phaser from 'phaser';
import type { CommandWordDefinition } from './CommandBlockContent';

export class TransparentEmojiRenderer {
  constructor(private readonly scene: Phaser.Scene) {}

  show(definition: CommandWordDefinition, x: number, y: number, accent: number): Phaser.GameObjects.Container {
    const glow = this.scene.add.circle(0, 0, 68, accent, .09)
      .setBlendMode(Phaser.BlendModes.ADD);
    const halo = this.scene.add.circle(0, 0, 48, accent, .025)
      .setStrokeStyle(2, accent, .48)
      .setBlendMode(Phaser.BlendModes.ADD);
    const emoji = this.scene.add.text(0, 0, definition.emoji ?? '✦', {
      fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
      fontSize: '80px',
    }).setOrigin(.5).setShadow(0, 12, '#000000', 18);
    const container = this.scene.add.container(x, y, [glow, halo, emoji]).setDepth(36).setScale(.25).setAlpha(0);
    this.scene.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      y: y - 24,
      duration: 430,
      ease: 'Back.out',
    });
    this.scene.tweens.add({
      targets: [glow, halo],
      scale: 1.35,
      alpha: 0,
      duration: 880,
      ease: 'Cubic.out',
    });
    this.scene.time.delayedCall(1150, () => {
      this.scene.tweens.add({
        targets: container,
        y: y - 62,
        alpha: 0,
        duration: 360,
        onComplete: () => container.destroy(),
      });
    });
    return container;
  }
}

