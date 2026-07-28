import { describe, expect, it } from 'vitest';
import { BasicIntentResolver } from '../src/language/BasicIntentResolver';
import type { SpeechResult } from '../src/voice/SpeechProvider';

const result = (transcript: string): SpeechResult => ({ transcript, alternatives: [], confidence: 0.9, language: 'en-US', durationMs: 100, provider: 'mock' });
describe('BasicIntentResolver', () => {
  const resolver = new BasicIntentResolver();
  it('resolves equipment and strips punctuation', () => expect(resolver.resolve(result('I need a SHIELD!')).itemId).toBe('shield'));
  it('resolves object commands', () => expect(resolver.resolve(result('Throw the bottle at him.')).intent).toBe('THROW_OBJECT'));
  it.each([
    ['Ring the bell.', 'USE_OBJECT', 'bell'],
    ['Open the gate.', 'OPEN_OBJECT', 'gate'],
    ['Pick up the umbrella.', 'MOVE_OBJECT', 'umbrella'],
    ['Set the plate.', 'USE_OBJECT', 'plate'],
    ['Heat the pan.', 'USE_OBJECT', 'pan'],
    ['Boil the kettle.', 'USE_OBJECT', 'kettle'],
    ['Turn on the computer.', 'USE_OBJECT', 'computer'],
    ['Show me the map.', 'USE_OBJECT', 'map'],
  ] as const)('fast-resolves daily phrase "%s"', (transcript, intent, itemId) => {
    expect(resolver.resolve(result(transcript))).toMatchObject({ intent, itemId });
  });
  it('prioritizes confusable wrong summons', () => expect(resolver.resolve(result('I need a ship.'))).toMatchObject({ intent: 'SUMMON_WRONG_ITEM', itemId: 'ship', mistakenWord: 'ship' }));
  it('returns unknown for unsupported speech', () => expect(resolver.resolve(result('Good morning.')).intent).toBe('UNKNOWN'));
});
