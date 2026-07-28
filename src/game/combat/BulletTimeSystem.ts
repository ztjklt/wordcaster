import Phaser from 'phaser';

export class BulletTimeSystem {
  private active = false;
  constructor(private readonly scene: Phaser.Scene) {}
  enter(): void { if (this.active) return; this.active = true; this.scene.physics.world.timeScale = 2; this.scene.tweens.timeScale = 0.5; }
  exit(): void { if (!this.active) return; this.active = false; this.scene.physics.world.timeScale = 1; this.scene.tweens.timeScale = 1; }
  destroy(): void { this.exit(); }
}
