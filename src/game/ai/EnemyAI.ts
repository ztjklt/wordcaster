import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';

export type EnemyDecision = 'approach' | 'retreat' | 'attack' | 'block' | 'idle';

export class EnemyAI {
  private nextDecisionAt = 0;
  private decision: EnemyDecision = 'approach';
  constructor(private readonly enemy: Enemy, private readonly player: Player) {}

  update(now: number): EnemyDecision {
    if (this.enemy.defeated || this.player.defeated) { this.enemy.setMovement(0); return 'idle'; }
    const distance = this.player.x - this.enemy.x;
    const absoluteDistance = Math.abs(distance);
    if (now >= this.nextDecisionAt) {
      if (absoluteDistance > 180) this.decision = 'approach';
      else if (this.enemy.stats.health < 30 && Math.random() < 0.35) this.decision = 'retreat';
      else if (Math.random() < 0.2) this.decision = 'block';
      else this.decision = 'attack';
      this.nextDecisionAt = now + Phaser.Math.Between(260, 620);
    }
    this.enemy.setBlocking(this.decision === 'block');
    if (this.decision === 'approach') this.enemy.setMovement(distance > 0 ? 1 : -1);
    else if (this.decision === 'retreat') this.enemy.setMovement(distance > 0 ? -1 : 1);
    else this.enemy.setMovement(0);
    return this.decision;
  }
}
