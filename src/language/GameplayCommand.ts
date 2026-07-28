export type GameplayIntent = 'SUMMON_EQUIPMENT' | 'MOVE_OBJECT' | 'THROW_OBJECT' | 'OPEN_OBJECT' | 'USE_OBJECT' | 'TURN_LIGHT_OFF' | 'CAST_SKILL' | 'SUMMON_WRONG_ITEM' | 'UNKNOWN';

export const DAILY_OBJECT_IDS = [
  'lantern', 'bell', 'gate', 'charm', 'bamboo', 'leaf', 'umbrella', 'bridge',
  'noodles', 'coin', 'basket', 'cup', 'plate', 'spoon', 'pan', 'kettle',
  'fridge', 'apple', 'table', 'book', 'lamp', 'computer', 'phone', 'clock',
  'window', 'desk', 'ticket', 'train', 'door', 'seat', 'bag', 'map',
] as const;

export type DailyObjectId = typeof DAILY_OBJECT_IDS[number];

export interface GameplayCommand {
  intent: GameplayIntent;
  itemId?: string;
  rawTranscript: string;
  normalizedTranscript: string;
  confidence: number;
  languageScore: number;
  mistakeType?: 'CONFUSABLE_WORD';
  mistakenWord?: string;
}
