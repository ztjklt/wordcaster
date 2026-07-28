import type { SpeechResult } from '../voice/SpeechProvider';
import { DAILY_OBJECT_IDS, type GameplayCommand, type GameplayIntent } from './GameplayCommand';
import { LanguageEvaluator } from './LanguageEvaluator';
import { TranscriptNormalizer } from './TranscriptNormalizer';

interface IntentRule { intent: GameplayIntent; itemId: string; keywordGroups: string[][]; }
const mistakes: Record<string, string> = { ship: 'ship', word: 'dictionary', bed: 'bed', heel: 'heel', eyes: 'eyes', desert: 'desert' };
const rules: IntentRule[] = [
  { intent: 'SUMMON_EQUIPMENT', itemId: 'shield', keywordGroups: [['shield'], ['protection'], ['protect', 'myself']] },
  { intent: 'SUMMON_EQUIPMENT', itemId: 'sword', keywordGroups: [['sword'], ['weapon']] },
  { intent: 'MOVE_OBJECT', itemId: 'chair', keywordGroups: [['bring', 'chair'], ['chair', 'me']] },
  { intent: 'THROW_OBJECT', itemId: 'bottle', keywordGroups: [['throw', 'bottle'], ['send', 'bottle']] },
  { intent: 'MOVE_OBJECT', itemId: 'box', keywordGroups: [['move', 'box'], ['put', 'box']] },
  { intent: 'OPEN_OBJECT', itemId: 'cabinet', keywordGroups: [['open', 'cabinet']] },
  { intent: 'TURN_LIGHT_OFF', itemId: 'light', keywordGroups: [['turn', 'off', 'light'], ['lights', 'off']] },
  { intent: 'CAST_SKILL', itemId: 'help', keywordGroups: [['help', 'me'], ['need', 'help']] },
  { intent: 'CAST_SKILL', itemId: 'heal', keywordGroups: [['heal', 'me'], ['need', 'medicine'], ['am', 'hurt']] },
  { intent: 'CAST_SKILL', itemId: 'push', keywordGroups: [['stay', 'away'], ['move', 'back'], ['stop', 'attacking']] },
];
const sceneObjectIds = ['chair', 'bottle', 'box', 'cabinet', ...DAILY_OBJECT_IDS] as const;
const openableIds = new Set(['cabinet', 'gate', 'fridge', 'window', 'door']);
const useVerbGroups = [
  ['ring'], ['use'], ['read'], ['check'], ['start'], ['boil'], ['cook'], ['show'],
  ['look'], ['sit'], ['eat'], ['drink'], ['set'], ['heat'], ['turn', 'on'],
] as const;
const moveVerbGroups = [
  ['move'], ['bring'], ['take'], ['carry'], ['get'], ['need'], ['want'], ['grab'], ['pick', 'up'],
] as const;

export class IntentResolver {
  private readonly normalizer = new TranscriptNormalizer();
  private readonly evaluator = new LanguageEvaluator();
  resolve(result: SpeechResult, hintLevel = 0): GameplayCommand {
    const normalized = this.normalizer.normalize(result.transcript);
    const tokens = new Set(normalized.split(' ').filter(Boolean));
    for (const [word, itemId] of Object.entries(mistakes)) if (tokens.has(word)) return this.make(result, normalized, 'SUMMON_WRONG_ITEM', itemId, 20, word);
    for (const rule of rules) {
      const matched = rule.keywordGroups.find((group) => group.every((word) => tokens.has(word)));
      if (matched) return this.make(result, normalized, rule.intent, rule.itemId, this.evaluator.evaluate(normalized, matched, hintLevel).score);
    }
    const objectId = sceneObjectIds.find((id) => tokens.has(id));
    if (objectId) {
      const throwWords = ['throw', 'toss'].filter((word) => tokens.has(word));
      if (throwWords.length) return this.make(result, normalized, 'THROW_OBJECT', objectId, this.evaluator.evaluate(normalized, [throwWords[0], objectId], hintLevel).score);
      if (tokens.has('open') && openableIds.has(objectId)) return this.make(result, normalized, 'OPEN_OBJECT', objectId, this.evaluator.evaluate(normalized, ['open', objectId], hintLevel).score);
      const useWords = useVerbGroups.find((group) => group.every((word) => tokens.has(word)));
      if (useWords) return this.make(result, normalized, 'USE_OBJECT', objectId, this.evaluator.evaluate(normalized, [...useWords, objectId], hintLevel).score);
      const moveWords = moveVerbGroups.find((group) => group.every((word) => tokens.has(word)));
      if (moveWords) return this.make(result, normalized, 'MOVE_OBJECT', objectId, this.evaluator.evaluate(normalized, [...moveWords, objectId], hintLevel).score);
    }
    return this.make(result, normalized, 'UNKNOWN', undefined, 0);
  }
  private make(result: SpeechResult, normalized: string, intent: GameplayIntent, itemId: string | undefined, languageScore: number, mistakenWord?: string): GameplayCommand {
    return { intent, itemId, rawTranscript: result.transcript, normalizedTranscript: normalized, confidence: result.confidence ?? 0.5, languageScore, ...(mistakenWord ? { mistakeType: 'CONFUSABLE_WORD' as const, mistakenWord } : {}) };
  }
}
