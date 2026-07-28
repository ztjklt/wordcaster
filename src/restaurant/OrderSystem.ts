import { PlayerNeedsSystem } from '../home/PlayerNeedsSystem';
import { SaveManager } from '../storage/SaveManager';
import { restaurantMenu } from './RestaurantDialogueSystem';

export interface OrderResult { success: boolean; message: string; }
export class OrderSystem {
  complete(itemIds: string[]): OrderResult {
    const save = SaveManager.load(); const items = itemIds.map((id) => restaurantMenu.find((item) => item.id === id)).filter((item) => item !== undefined);
    const total = items.reduce((sum, item) => sum + item.price, 0);
    if (!items.length) return { success: false, message: '请先选择餐点。' };
    if (save.player.coins < total) return { success: false, message: `金币不足，需要 ${total} 金币。` };
    save.player.coins -= total;
    new PlayerNeedsSystem().consume(save, items.reduce((sum, item) => sum + item.hungerRestore, 0), items.reduce((sum, item) => sum + item.thirstRestore, 0));
    SaveManager.save(save); return { success: true, message: `Enjoy your meal! 花费 ${total} 金币。` };
  }
}
