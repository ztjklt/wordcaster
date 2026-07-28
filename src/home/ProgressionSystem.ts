import { SaveManager } from '../storage/SaveManager';

export type UpgradeId = 'health' | 'stamina' | 'skillSlot';
export class ProgressionSystem {
  upgrade(id: UpgradeId): { success: boolean; message: string } {
    const save = SaveManager.load(); const cost = id === 'skillSlot' ? 80 : 30 + (save.player.level - 1) * 10;
    if (save.player.coins < cost) return { success: false, message: `金币不足，需要 ${cost}` };
    if (id === 'skillSlot' && save.player.skillSlots >= 5) return { success: false, message: '技能槽已达上限' };
    save.player.coins -= cost; save.player.level += 1;
    if (id === 'health') save.player.maxHealth += 10; if (id === 'stamina') save.player.maxStamina += 10; if (id === 'skillSlot') save.player.skillSlots += 1;
    SaveManager.save(save); return { success: true, message: `升级成功，花费 ${cost} 金币` };
  }
}
