import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { ARENAS } from '../src/game/arena/BattleContent';
import { COMMAND_BLOCK_WORDS, getCommandWords } from '../src/game/command-block/CommandBlockContent';
import { SUPPORTED_COMMAND_EFFECT_TYPES } from '../src/game/command-block/CommandBlockEffectSystem';
import {
  buildCommandBlockRun,
  calculateActivationScore,
  CommandBlockRoundController,
} from '../src/game/command-block/CommandBlockRoundController';
import { resolveSpokenWord } from '../src/game/command-block/SpokenWordResolver';
import { hasOverlappingWordPlacements, planWordBlockLayout } from '../src/game/command-block/WordBlockLayout';

describe('command block content', () => {
  it('ships ten contextual nouns for every arena', () => {
    expect(COMMAND_BLOCK_WORDS).toHaveLength(60);
    for (const arena of ARENAS) {
      const entries = getCommandWords(arena.id);
      expect(entries).toHaveLength(10);
      expect(new Set(entries.map((entry) => entry.word)).size).toBe(10);
      expect(entries.every((entry) => entry.emoji && entry.pronunciation && entry.effectLabel)).toBe(true);
    }
  });

  it('gives every word a unique effect and cast identity', () => {
    expect(new Set(COMMAND_BLOCK_WORDS.map((entry) => entry.effectId)).size).toBe(60);
    expect(new Set(COMMAND_BLOCK_WORDS.map((entry) => entry.visual.cast)).size).toBe(60);
    expect(new Set(COMMAND_BLOCK_WORDS.map((entry) => entry.effect.preset)).size).toBe(60);
    expect(COMMAND_BLOCK_WORDS.every((entry) => SUPPORTED_COMMAND_EFFECT_TYPES.has(entry.effect.type))).toBe(true);
  });

  it('adds two bespoke words to every original arena pool', () => {
    const expected: Record<string, string[]> = {
      'neon-shrine': ['fan', 'drum'],
      'moon-bamboo': ['firefly', 'boat'],
      'cyber-market': ['sign', 'steam'],
      'sunrise-kitchen': ['knife', 'cake'],
      'cozy-study': ['pencil', 'globe'],
      'metro-commute': ['signal', 'stairs'],
    };
    Object.entries(expected).forEach(([arenaId, words]) => {
      const arenaWords = getCommandWords(arenaId as Parameters<typeof getCommandWords>[0]).map((entry) => entry.word);
      expect(arenaWords).toEqual(expect.arrayContaining(words));
    });
  });
});

describe('visible whole-word resolver', () => {
  const words = getCommandWords('sunrise-kitchen');

  it('accepts a standalone word and a phrase containing one visible word', () => {
    expect(resolveSpokenWord('apple', words)).toMatchObject({ matched: true, mode: 'word' });
    expect(resolveSpokenWord('I need an apple, please.', words)).toMatchObject({ matched: true, mode: 'phrase' });
  });

  it('rejects letter spelling, substrings and multiple visible targets', () => {
    expect(resolveSpokenWord('A P P L E', words).mode).toBe('spelling');
    expect(resolveSpokenWord('A-P-P-L-E', words).mode).toBe('spelling');
    expect(resolveSpokenWord('pineapple', words).mode).toBe('none');
    expect(resolveSpokenWord('apple and spoon', words).mode).toBe('ambiguous');
  });

  it('does not re-trigger activated words and highlights one stable partial candidate', () => {
    const apple = words.find((entry) => entry.word === 'apple')!;
    expect(resolveSpokenWord('apple', words, new Set([apple.id])).mode).toBe('activated');
    expect(resolveSpokenWord('app', words, new Set(), false)).toMatchObject({
      matched: false,
      candidateWordId: apple.id,
      mode: 'partial',
    });
  });
});

describe('ten-word run and scoring', () => {
  it('is deterministic and includes all ten words without decoys', () => {
    const first = buildCommandBlockRun('sunrise-kitchen', 20260728);
    const second = buildCommandBlockRun('sunrise-kitchen', 20260728);
    expect(first).toEqual(second);
    expect(first.wordIds).toHaveLength(10);
    expect(new Set(first.wordIds).size).toBe(10);
    expect(first.timeLimitMs).toBe(15000);
  });

  it('keeps typed input out of the voice bonus and applies combo multipliers', () => {
    expect(calculateActivationScore(12600, 'mock', 1)).toMatchObject({ score: 220, voiceBonus: 0, multiplier: 1 });
    expect(calculateActivationScore(12600, 'openai-realtime', 2)).toMatchObject({ score: 276, voiceBonus: 20, multiplier: 1.15 });
  });

  it('allows each word once and requires all ten for victory', () => {
    const run = new CommandBlockRoundController('neon-shrine', 44);
    run.start(0);
    run.run.wordIds.forEach((wordId, index) => {
      expect(run.correct(wordId, (index + 1) * 1000, 'browser')).toBeDefined();
      expect(run.correct(wordId, (index + 1) * 1000 + 10, 'browser')).toBeUndefined();
    });
    const result = run.finish(true, 30000);
    expect(result.won).toBe(true);
    expect(result.perfect).toBe(true);
    expect(result.correctWords).toHaveLength(10);
    expect(result.failedWords).toHaveLength(0);
  });

  it('tracks timeouts, text activation and combo protection without granting perfect', () => {
    const run = new CommandBlockRoundController('moon-bamboo', 55);
    run.start(0);
    run.grantComboGuard();
    expect(run.wrong().guarded).toBe(true);
    run.timeout(15000);
    run.run.wordIds.forEach((wordId, index) => run.correct(wordId, 16000 + index * 500, index === 0 ? 'mock' : 'browser'));
    const result = run.finish(true, 45000);
    expect(result.won).toBe(true);
    expect(result.perfect).toBe(false);
    expect(result.textCorrect).toBe(1);
    expect(result.timeoutCount).toBe(1);
    expect(result.wrongCount).toBe(1);
  });
});

describe('ten-platform layout', () => {
  it('uses a stable reachable 4 + 3 + 3 arrangement without overlap', () => {
    const placements = planWordBlockLayout(getCommandWords('cozy-study'), 912);
    expect(placements).toHaveLength(10);
    expect(hasOverlappingWordPlacements(placements)).toBe(false);
    expect(placements.filter((entry) => entry.tier === 0)).toHaveLength(4);
    expect(placements.filter((entry) => entry.tier === 1)).toHaveLength(3);
    expect(placements.filter((entry) => entry.tier === 2)).toHaveLength(3);
    expect(Math.min(...placements.map((entry) => entry.y))).toBeGreaterThanOrEqual(300);
    expect(Math.max(...placements.map((entry) => entry.y))).toBeLessThanOrEqual(510);
    expect(Math.min(...placements.map((entry) => entry.x - entry.width / 2))).toBeGreaterThanOrEqual(70);
    expect(Math.max(...placements.map((entry) => entry.x + entry.width / 2))).toBeLessThanOrEqual(1210);
  });
});
