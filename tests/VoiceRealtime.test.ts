import { describe, expect, it } from 'vitest';
import { TranscriptAggregator } from '../src/voice/TranscriptAggregator';
import { VoiceActivityDetector } from '../src/voice/VoiceActivityDetector';
import { validateInterpretation } from '../src/voice/InterpretationClient';

describe('TranscriptAggregator', () => {
  it('keeps interleaved item deltas isolated and freezes completed text', () => {
    const aggregator = new TranscriptAggregator();
    aggregator.applyDelta('a', 'I need '); aggregator.applyDelta('b', 'Move '); aggregator.applyDelta('a', 'a shield');
    expect(aggregator.complete('a', 'I need a shield').finalRawText).toBe('I need a shield');
    expect(aggregator.applyDelta('a', ' ignored').partialText).toBe('');
    expect(aggregator.complete('b', 'Move the box').finalRawText).toBe('Move the box');
  });
});

describe('VoiceActivityDetector', () => {
  it('ignores short noise and commits after sustained speech plus silence', () => {
    const vad = new VoiceActivityDetector(250, 650, 8000);
    expect(vad.sample(true, 0)).toBeUndefined(); expect(vad.sample(false, 100)).toBeUndefined();
    vad.sample(true, 1000); expect(vad.sample(true, 1250)?.type).toBe('speech-start');
    vad.sample(false, 1400); expect(vad.sample(false, 2050)?.type).toBe('speech-end');
  });
});

describe('AI interpretation allowlist', () => {
  const sceneObjectIds = [
    'lantern','bell','gate','charm','bamboo','leaf','umbrella','bridge','noodles',
    'coin','basket','cup','plate','spoon','pan','kettle','fridge','apple','table',
    'book','lamp','computer','phone','clock','window','desk','ticket','train','door',
    'seat','bag','map',
  ];

  it('rejects stale ids and arbitrary items', () => {
    expect(validateInterpretation({ utteranceId: 'old', naturalText: 'x', intent: 'UNKNOWN', confidence: 1 }, 'new')).toBeUndefined();
    expect(validateInterpretation({ utteranceId: 'new', naturalText: 'hack', intent: 'SUMMON_EQUIPMENT', itemId: 'nuke', confidence: 1 }, 'new')).toBeUndefined();
  });
  it('accepts a bounded result', () => expect(validateInterpretation({ utteranceId: 'u1', naturalText: '召唤盾牌', intent: 'SUMMON_EQUIPMENT', itemId: 'shield', confidence: .9 }, 'u1')?.itemId).toBe('shield'));
  it.each(sceneObjectIds)('accepts USE_OBJECT for the bounded scene object %s', (itemId) => {
    const result = validateInterpretation({ utteranceId: 'u2', naturalText: `使用 ${itemId}`, intent: 'USE_OBJECT', itemId, targetEntityId: itemId, confidence: .91 }, 'u2');
    expect(result?.itemId).toBe(itemId);
    expect(result?.targetEntityId).toBe(itemId);
  });
  it('requires USE_OBJECT to have an allowed itemId', () => {
    expect(validateInterpretation({ utteranceId: 'u3', naturalText: '使用目标', intent: 'USE_OBJECT', targetEntityId: 'lantern', confidence: .8 }, 'u3')).toBeUndefined();
    expect(validateInterpretation({ utteranceId: 'u3', naturalText: '使用核弹', intent: 'USE_OBJECT', itemId: 'nuke', confidence: .8 }, 'u3')).toBeUndefined();
  });
  it('rejects arbitrary targets, fields, and malformed learning feedback', () => {
    expect(validateInterpretation({ utteranceId: 'u4', naturalText: '移动', intent: 'MOVE_OBJECT', itemId: 'box', targetEntityId: 'admin', confidence: .8 }, 'u4')).toBeUndefined();
    expect(validateInterpretation({ utteranceId: 'u4', naturalText: '移动', intent: 'MOVE_OBJECT', itemId: 'box', confidence: .8, execute: 'anything' }, 'u4')).toBeUndefined();
    expect(validateInterpretation({ utteranceId: 'u4', naturalText: '移动', intent: 'MOVE_OBJECT', itemId: 'box', confidence: .8, detectedMistake: { targetWord: 'box', spokenWord: 'fox', type: 'arbitrary' } }, 'u4')).toBeUndefined();
  });
});
