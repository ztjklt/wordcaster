import Phaser from 'phaser';
import type { HomeVector } from '../HomeTypes';

export class HomeCameraController {
  private lookAhead: HomeVector = { x: 0, y: 0 };
  private readonly worldWidth: number;
  private readonly worldHeight: number;

  constructor(
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    worldWidth: number,
    worldHeight: number,
  ) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    camera.setBounds(0, 0, worldWidth, worldHeight);
    camera.setRoundPixels(false);
  }

  snapTo(position: HomeVector): void {
    this.camera.centerOn(position.x, position.y);
  }

  update(position: HomeVector, velocity: HomeVector, facing: HomeVector, deltaMs: number): void {
    const speed = Math.hypot(velocity.x, velocity.y);
    const aheadStrength = Phaser.Math.Clamp(speed / 265, 0, 1) * 92;
    const desiredAhead = { x: facing.x * aheadStrength, y: facing.y * aheadStrength * .65 };
    const aheadBlend = 1 - Math.exp(-Math.max(0, deltaMs) / 210);
    this.lookAhead.x = Phaser.Math.Linear(this.lookAhead.x, desiredAhead.x, aheadBlend);
    this.lookAhead.y = Phaser.Math.Linear(this.lookAhead.y, desiredAhead.y, aheadBlend);
    const targetX = position.x + this.lookAhead.x - this.camera.width / 2;
    const targetY = position.y + this.lookAhead.y - this.camera.height / 2;
    const followBlend = 1 - Math.exp(-Math.max(0, deltaMs) / 125);
    const nextX = Phaser.Math.Clamp(
      Phaser.Math.Linear(this.camera.scrollX, targetX, followBlend),
      0,
      Math.max(0, this.worldWidth - this.camera.width),
    );
    const nextY = Phaser.Math.Clamp(
      Phaser.Math.Linear(this.camera.scrollY, targetY, followBlend),
      0,
      Math.max(0, this.worldHeight - this.camera.height),
    );
    this.camera.setScroll(nextX, nextY);
  }
}
