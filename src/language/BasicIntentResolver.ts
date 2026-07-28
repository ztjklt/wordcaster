import type { SpeechResult } from '../voice/SpeechProvider';
import { DAILY_OBJECT_IDS, type GameplayCommand, type GameplayIntent } from './GameplayCommand';

const wrongWords: Record<string, string> = { ship: 'ship', word: 'dictionary', bed: 'bed', heel: 'heel', eyes: 'eyes' };
const rules: Array<{ words: string[]; intent: GameplayIntent; itemId?: string }> = [
  { words: ['shield'], intent: 'SUMMON_EQUIPMENT', itemId: 'shield' },
  { words: ['sword'], intent: 'SUMMON_EQUIPMENT', itemId: 'sword' },
  { words: ['bring', 'chair'], intent: 'MOVE_OBJECT', itemId: 'chair' },
  { words: ['throw', 'bottle'], intent: 'THROW_OBJECT', itemId: 'bottle' },
  { words: ['move', 'box'], intent: 'MOVE_OBJECT', itemId: 'box' },
  { words: ['open', 'cabinet'], intent: 'OPEN_OBJECT', itemId: 'cabinet' },
  { words: ['turn', 'off', 'light'], intent: 'TURN_LIGHT_OFF', itemId: 'light' },
  { words: ['help', 'me'], intent: 'CAST_SKILL', itemId: 'help' },
  { words: ['heal', 'me'], intent: 'CAST_SKILL', itemId: 'heal' },
  { words: ['stay', 'away'], intent: 'CAST_SKILL', itemId: 'push' },
];
const sceneObjectIds = ['chair', 'bottle', 'box', 'cabinet', ...DAILY_OBJECT_IDS] as const;
const openableIds = new Set(['cabinet', 'gate', 'fridge', 'window', 'door']);
const useVerbs = new Set(['ring', 'use', 'read', 'check', 'start', 'boil', 'cook', 'show', 'look', 'sit', 'eat', 'drink', 'set', 'heat']);
const moveVerbs = new Set(['move', 'bring', 'take', 'carry', 'get', 'need', 'want', 'grab']);

export class BasicIntentResolver {
  resolve(result: SpeechResult): GameplayCommand {
    const normalized = result.transcript.toLowerCase().replace(/[^a-z\s']/g, ' ').replace(/\s+/g, ' ').trim();
    const tokens = new Set(normalized.split(' ').filter(Boolean));
    for (const [mistakenWord, itemId] of Object.entries(wrongWords)) {
      if (tokens.has(mistakenWord)) return this.command(result, normalized, 'SUMMON_WRONG_ITEM', itemId, 20, mistakenWord);
    }
    const match = rules.find((rule) => rule.words.every((word) => tokens.has(word)));
    if (match) return this.command(result, normalized, match.intent, match.itemId, match.words.length > 1 ? 90 : 65);
    const objectId = sceneObjectIds.find((id) => tokens.has(id));
    if (!objectId) return this.command(result, normalized, 'UNKNOWN', undefined, 0);
    if (tokens.has('throw') || tokens.has('toss')) return this.command(result, normalized, 'THROW_OBJECT', objectId, 90);
    if (tokens.has('open') && openableIds.has(objectId)) return this.command(result, normalized, 'OPEN_OBJECT', objectId, 90);
    if (
      [...useVerbs].some((verb) => tokens.has(verb))
      || (tokens.has('turn') && tokens.has('on'))
    ) return this.command(result, normalized, 'USE_OBJECT', objectId, 90);
    if (
      [...moveVerbs].some((verb) => tokens.has(verb))
      || (tokens.has('pick') && tokens.has('up'))
    ) return this.command(result, normalized, 'MOVE_OBJECT', objectId, 85);
    return this.command(result, normalized, 'UNKNOWN', undefined, 0);
  }

  private command(result: SpeechResult, normalized: string, intent: GameplayIntent, itemId: string | undefined, languageScore: number, mistakenWord?: string): GameplayCommand {
    return { intent, itemId, rawTranscript: result.transcript, normalizedTranscript: normalized, confidence: result.confidence ?? 0.5, languageScore, ...(mistakenWord ? { mistakeType: 'CONFUSABLE_WORD' as const, mistakenWord } : {}) };
  }
}
