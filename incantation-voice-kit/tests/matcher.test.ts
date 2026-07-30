import { describe, expect, it } from 'vitest';
import {
  assertValidWords,
  normalizeSpokenInput,
  resolveSpeechAlternatives,
  resolveSpokenWord,
} from '../src/matcher';
import type { IncantationWord } from '../src/types';

const words: readonly IncantationWord[] = [
  { id: 'apple', word: 'apple', color: '#ff6b7b', soundProfile: 'food' },
  { id: 'stone', word: 'stone', aliases: ['rock'], color: '#b7b9c3', soundProfile: 'nature' },
  { id: 'shield', word: 'shield', color: '#73cfff', soundProfile: 'metal' },
];

describe('incantation matcher', () => {
  it('normalizes case, punctuation and repeated whitespace', () => {
    expect(normalizeSpokenInput('  APPLE!!!  ')).toBe('apple');
    expect(resolveSpokenWord('  APPLE!!!  ', words)).toMatchObject({
      matched: true,
      wordId: 'apple',
      mode: 'word',
    });
  });

  it('matches one configured word inside a natural phrase', () => {
    expect(resolveSpokenWord('Please give me the shield.', words)).toMatchObject({
      matched: true,
      wordId: 'shield',
      mode: 'phrase',
    });
  });

  it('matches aliases as the same word id', () => {
    expect(resolveSpokenWord('rock', words)).toMatchObject({
      matched: true,
      wordId: 'stone',
    });
  });

  it('returns a unique partial candidate without executing it', () => {
    expect(resolveSpokenWord('app', words, false)).toMatchObject({
      matched: false,
      candidateWordId: 'apple',
      mode: 'partial',
    });
  });

  it('rejects a phrase containing more than one configured word', () => {
    expect(resolveSpokenWord('apple and stone', words)).toMatchObject({
      matched: false,
      mode: 'ambiguous',
      candidateWordIds: ['apple', 'stone'],
    });
  });

  it('rejects letter-by-letter spelling', () => {
    expect(resolveSpokenWord('a p p l e', words)).toMatchObject({
      matched: false,
      wordId: 'apple',
      mode: 'spelling',
    });
  });

  it('uses a browser alternative when the primary transcript is unknown', () => {
    expect(resolveSpeechAlternatives('a pull', ['apple'], words)).toMatchObject({
      matched: true,
      wordId: 'apple',
      normalizedInput: 'a pull',
    });
  });

  it('returns none for empty or unrelated input', () => {
    expect(resolveSpokenWord('', words).mode).toBe('none');
    expect(resolveSpokenWord('banana', words).mode).toBe('none');
  });

  it('rejects duplicate ids and empty words', () => {
    expect(() => assertValidWords([
      { id: 'same', word: 'apple' },
      { id: 'same', word: 'stone' },
    ])).toThrow('重复的言灵 ID');
    expect(() => assertValidWords([{ id: 'blank', word: '!!!' }])).toThrow('缺少有效英文单词');
  });
});
