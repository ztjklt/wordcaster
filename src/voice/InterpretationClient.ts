import type { AIInterpretation } from './VoiceTypes';
import type { GameplayIntent } from '../language/GameplayCommand';

const allowedIntents = new Set<string>(['SUMMON_EQUIPMENT','MOVE_OBJECT','THROW_OBJECT','OPEN_OBJECT','TURN_LIGHT_OFF','CAST_SKILL','SUMMON_WRONG_ITEM','USE_OBJECT','UNKNOWN']);
const objectIds = [
  'shield','sword','chair','bottle','box','cabinet','light','help','heal','push',
  'ship','dictionary','bed','heel','eyes','desert','lantern','bell','gate','charm',
  'bamboo','leaf','umbrella','bridge','noodles','coin','basket','cup','plate',
  'spoon','pan','kettle','fridge','apple','table','book','lamp','computer','phone',
  'clock','window','desk','ticket','train','door','seat','bag','map',
] as const;
const allowedItems = new Set<string>(objectIds);
const allowedTargets = new Set<string>(['player','enemy', ...objectIds]);
const allowedDirections = new Set(['left','right','up','down']);
const allowedMistakeTypes = new Set(['confusable','grammar','missing_slot']);
const interpretationKeys = new Set(['utteranceId','naturalText','intent','itemId','targetEntityId','direction','confidence','detectedMistake','explanationZh']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function validateInterpretation(value: unknown, expectedId: string): AIInterpretation | undefined {
  if (!isRecord(value) || Object.keys(value).some((key) => !interpretationKeys.has(key))) return;
  if (value.utteranceId !== expectedId || typeof value.naturalText !== 'string' || value.naturalText.length > 300 || typeof value.intent !== 'string' || !allowedIntents.has(value.intent)) return;
  if (typeof value.confidence !== 'number' || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) return;
  if (value.itemId != null && (typeof value.itemId !== 'string' || !allowedItems.has(value.itemId))) return;
  if (value.targetEntityId != null && (typeof value.targetEntityId !== 'string' || !allowedTargets.has(value.targetEntityId))) return;
  if (value.direction != null && (typeof value.direction !== 'string' || !allowedDirections.has(value.direction))) return;
  if (value.explanationZh != null && (typeof value.explanationZh !== 'string' || value.explanationZh.length > 500)) return;
  if (value.detectedMistake != null) {
    if (!isRecord(value.detectedMistake) || Object.keys(value.detectedMistake).some((key) => !['targetWord','spokenWord','type'].includes(key))) return;
    if (typeof value.detectedMistake.targetWord !== 'string' || typeof value.detectedMistake.spokenWord !== 'string' || typeof value.detectedMistake.type !== 'string' || !allowedMistakeTypes.has(value.detectedMistake.type)) return;
  }
  if (value.intent === 'USE_OBJECT' && (typeof value.itemId !== 'string' || !allowedItems.has(value.itemId))) return;
  const interpretation: AIInterpretation = {
    utteranceId: expectedId,
    naturalText: value.naturalText,
    intent: value.intent as GameplayIntent,
    confidence: value.confidence,
  };
  if (typeof value.itemId === 'string') interpretation.itemId = value.itemId;
  if (typeof value.targetEntityId === 'string') interpretation.targetEntityId = value.targetEntityId;
  if (typeof value.direction === 'string') interpretation.direction = value.direction as AIInterpretation['direction'];
  if (typeof value.explanationZh === 'string') interpretation.explanationZh = value.explanationZh;
  if (isRecord(value.detectedMistake)) {
    interpretation.detectedMistake = {
      targetWord: value.detectedMistake.targetWord as string,
      spokenWord: value.detectedMistake.spokenWord as string,
      type: value.detectedMistake.type as 'confusable' | 'grammar' | 'missing_slot',
    };
  }
  return interpretation;
}
export async function interpretUtterance(utteranceId: string, text: string, context: Record<string, unknown> = {}, signal?: AbortSignal): Promise<AIInterpretation | undefined> {
  const response = await fetch('/api/voice/interpret', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ utteranceId, text: text.slice(0, 300), context }), signal });
  if (!response.ok) return;
  return validateInterpretation(await response.json(), utteranceId);
}
