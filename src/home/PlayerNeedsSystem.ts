import type { GameSave } from '../storage/SaveManager';

export class PlayerNeedsSystem {
  afterBattle(save: GameSave, won: boolean): GameSave { save.player.hunger = Math.max(0, save.player.hunger - (won ? 10 : 14)); save.player.thirst = Math.max(0, save.player.thirst - (won ? 13 : 17)); return save; }
  sleep(save: GameSave): GameSave { save.player.hunger = Math.max(0, save.player.hunger - 5); save.player.thirst = Math.max(0, save.player.thirst - 4); return save; }
  consume(save: GameSave, hunger: number, thirst: number): GameSave { save.player.hunger = Math.min(100, save.player.hunger + hunger); save.player.thirst = Math.min(100, save.player.thirst + thirst); return save; }
}
