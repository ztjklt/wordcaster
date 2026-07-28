import { describe, expect, it } from 'vitest';
import { TranscriptNormalizer } from '../src/language/TranscriptNormalizer';
import { IntentResolver } from '../src/language/IntentResolver';
import { HintSystem } from '../src/language/HintSystem';
import type { SpeechResult } from '../src/voice/SpeechProvider';

const speech = (transcript: string): SpeechResult => ({ transcript, alternatives: [], confidence: 0.92, language: 'en-US', durationMs: 100, provider: 'mock' });
describe('language pipeline', () => {
  it('normalizes punctuation and contractions', () => expect(new TranscriptNormalizer().normalize("I'd  like a SHIELD!" )).toBe('i would like a shield'));
  it('accepts synonymous protection expression', () => expect(new IntentResolver().resolve(speech('I need some protection.'))).toMatchObject({ intent: 'SUMMON_EQUIPMENT', itemId: 'shield' }));
  it('accepts flexible healing expression', () => expect(new IntentResolver().resolve(speech("I'm hurt."))).toMatchObject({ intent: 'CAST_SKILL', itemId: 'heal' }));
  it('reduces score when hints are used', () => { const resolver = new IntentResolver(); expect(resolver.resolve(speech('I need a shield.'), 3).languageScore).toBeLessThan(resolver.resolve(speech('I need a shield.'), 0).languageScore); });
  it('cycles through layered hints', () => { const hints = new HintSystem(); expect(hints.next().text).toBe('保护自己'); expect(hints.next().text).toContain('shield'); });
  it.each([
    ['use the lantern', 'USE_OBJECT', 'lantern'],
    ['ring the bell', 'USE_OBJECT', 'bell'],
    ['open the gate', 'OPEN_OBJECT', 'gate'],
    ['use the charm', 'USE_OBJECT', 'charm'],
    ['check the bamboo', 'USE_OBJECT', 'bamboo'],
    ['use the leaf', 'USE_OBJECT', 'leaf'],
    ['pick up the umbrella', 'MOVE_OBJECT', 'umbrella'],
    ['check the bridge', 'USE_OBJECT', 'bridge'],
    ['cook the noodles', 'USE_OBJECT', 'noodles'],
    ['use the coin', 'USE_OBJECT', 'coin'],
    ['move the basket', 'MOVE_OBJECT', 'basket'],
    ['use the cup', 'USE_OBJECT', 'cup'],
    ['set the plate', 'USE_OBJECT', 'plate'],
    ['use the spoon', 'USE_OBJECT', 'spoon'],
    ['heat the pan', 'USE_OBJECT', 'pan'],
    ['boil the kettle', 'USE_OBJECT', 'kettle'],
    ['open the fridge', 'OPEN_OBJECT', 'fridge'],
    ['eat the apple', 'USE_OBJECT', 'apple'],
    ['check the table', 'USE_OBJECT', 'table'],
    ['read the book', 'USE_OBJECT', 'book'],
    ['turn on the lamp', 'USE_OBJECT', 'lamp'],
    ['turn on the computer', 'USE_OBJECT', 'computer'],
    ['check the phone', 'USE_OBJECT', 'phone'],
    ['check the clock', 'USE_OBJECT', 'clock'],
    ['open the window', 'OPEN_OBJECT', 'window'],
    ['check the desk', 'USE_OBJECT', 'desk'],
    ['check the ticket', 'USE_OBJECT', 'ticket'],
    ['start the train', 'USE_OBJECT', 'train'],
    ['open the door', 'OPEN_OBJECT', 'door'],
    ['sit on the seat', 'USE_OBJECT', 'seat'],
    ['check the bag', 'USE_OBJECT', 'bag'],
    ['show me the map', 'USE_OBJECT', 'map'],
  ] as const)('resolves daily object phrase "%s"', (transcript, intent, itemId) => {
    expect(new IntentResolver().resolve(speech(transcript))).toMatchObject({ intent, itemId });
  });
});
