import { Fighter } from './Fighter';

export class Enemy extends Fighter {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'fighter-enemy', 100);
    this.moveSpeed = 205;
    this.facing = -1;
    this.setFlipX(true);
  }
}
