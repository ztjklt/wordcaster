import { Fighter } from './Fighter';

export class Player extends Fighter {
  constructor(scene: Phaser.Scene, x: number, y: number, maxHealth = 100, maxStamina = 100) { super(scene, x, y, 'fighter-player', maxHealth); this.stats.maxStamina = maxStamina; this.stats.stamina = maxStamina; }
}
