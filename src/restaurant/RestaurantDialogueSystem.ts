import { TranscriptNormalizer } from '../language/TranscriptNormalizer';

export interface MenuItem { id: string; name: string; price: number; hungerRestore: number; thirstRestore: number; type: 'food' | 'drink'; }
export interface DialogueResponse { message: string; action: 'prompt_food' | 'prompt_drink' | 'quote' | 'ready' | 'cancel' | 'unknown' | 'wrong_item'; itemId?: string; }

export const restaurantMenu: MenuItem[] = [
  { id: 'sandwich', name: 'Sandwich', price: 10, hungerRestore: 30, thirstRestore: 0, type: 'food' }, { id: 'hamburger', name: 'Hamburger', price: 14, hungerRestore: 38, thirstRestore: 0, type: 'food' },
  { id: 'bread', name: 'Bread', price: 7, hungerRestore: 20, thirstRestore: 0, type: 'food' }, { id: 'salad', name: 'Salad', price: 11, hungerRestore: 25, thirstRestore: 3, type: 'food' },
  { id: 'water', name: 'Water', price: 4, hungerRestore: 0, thirstRestore: 30, type: 'drink' }, { id: 'juice', name: 'Juice', price: 8, hungerRestore: 2, thirstRestore: 25, type: 'drink' },
  { id: 'coffee', name: 'Coffee', price: 9, hungerRestore: 0, thirstRestore: 18, type: 'drink' }, { id: 'tea', name: 'Tea', price: 6, hungerRestore: 0, thirstRestore: 22, type: 'drink' },
];

export class RestaurantDialogueSystem {
  private readonly normalizer = new TranscriptNormalizer();
  selected: string[] = [];
  respond(transcript: string): DialogueResponse {
    const text = this.normalizer.normalize(transcript);
    if (!text) return { message: "I couldn't understand that. Try again.", action: 'unknown' };
    if (text.includes('desert')) return { message: 'Did you order a desert? Here is a plate of sand! Try: dessert.', action: 'wrong_item', itemId: 'desert' };
    if (text.includes('cancel') || text.includes('never mind')) { this.selected = []; return { message: 'Order cancelled. No problem!', action: 'cancel' }; }
    if (text.includes('how much') || text.includes('price')) { const price = this.total; return { message: price ? `Your order is ${price} coins.` : 'Please choose something first.', action: 'quote' }; }
    if (text.includes('hungry')) return { message: 'What would you like to eat?', action: 'prompt_food' };
    if (text.includes('thirsty')) return { message: 'What would you like to drink?', action: 'prompt_drink' };
    const item = restaurantMenu.find((entry) => new RegExp(`\\b${entry.id}\\b`).test(text));
    if (item) { if (!this.selected.includes(item.id)) this.selected.push(item.id); const needsDrink = item.type === 'food' && !this.selected.some((id) => restaurantMenu.find((entry) => entry.id === id)?.type === 'drink'); return { message: needsDrink ? `One ${item.name}. Would you like anything to drink?` : `${item.name} added. Say “That's all, thank you” to confirm.`, action: needsDrink ? 'prompt_drink' : 'ready', itemId: item.id }; }
    if (text.includes('that is all') || text.includes('that s all') || text.includes('thank you')) return this.selected.length ? { message: `Order ready. Total: ${this.total} coins.`, action: 'ready' } : { message: 'What would you like to order?', action: 'prompt_food' };
    return { message: "I couldn't understand that. Try: I'd like a sandwich.", action: 'unknown' };
  }
  get total(): number { return this.selected.reduce((sum, id) => sum + (restaurantMenu.find((item) => item.id === id)?.price ?? 0), 0); }
  clear(): void { this.selected = []; }
}
