import Phaser from 'phaser';
import type { FighterStats } from '../combat/CombatSystem';
import { StickFigureRig } from './StickFigureRig';

export abstract class Fighter extends Phaser.Physics.Arcade.Sprite {
  readonly stats: FighterStats;
  facing: 1 | -1 = 1;
  attackReadyAt = 0;
  invulnerableUntil = 0;
  defeated = false;
  protected moveSpeed = 250;
  protected jumpSpeed = 590;
  readonly rig: StickFigureRig;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, maxHealth: number) {
    super(scene, x, y, texture);
    this.stats = { health: maxHealth, maxHealth, stamina: 100, maxStamina: 100, blocking: false };
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true).setDragX(1500).setMaxVelocity(420, 850);
    this.body!.setSize(46, 112).setOffset(25, 12);
    this.setAlpha(.001);
    this.rig = new StickFigureRig(scene, texture === 'fighter-player' ? 0x63f0d4 : 0xff647f);
  }

  setMovement(direction: -1 | 0 | 1): void {
    if (this.defeated || this.stats.blocking) { this.setVelocityX(0); return; }
    this.setVelocityX(direction * this.moveSpeed);
    if (direction !== 0) { this.facing = direction; this.setFlipX(direction < 0); }
  }

  jump(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!this.defeated && body.blocked.down) this.setVelocityY(-this.jumpSpeed);
  }

  setBlocking(active: boolean): void {
    this.stats.blocking = active && !this.defeated && this.stats.stamina > 0;
    this.setTint(this.stats.blocking ? 0x86cfff : 0xffffff);
  }

  canAttack(now: number): boolean { return !this.defeated && !this.stats.blocking && now >= this.attackReadyAt; }
  beginAttack(now: number, cooldown = 430, variant = 0): void {
    this.attackReadyAt = now + cooldown;
    this.rig.playAttack(now, variant);
  }
  animate(now:number,delta:number):void{const body=this.body as Phaser.Physics.Arcade.Body;this.rig.update(this.x,this.y,this.facing,body.velocity.x,body.velocity.y,this.stats.blocking,body.blocked.down,now,delta);}
  playHit(now:number):void{this.rig.playHit(now);} playCast(now:number):void{this.rig.playCast(now);}
  defeat(): void { this.defeated = true; this.stats.blocking = false; this.setVelocity(0, 0); this.rig.playDefeat(); }
  destroy(fromScene?:boolean):void{this.rig?.destroy();super.destroy(fromScene);}
}
