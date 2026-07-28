import { describe, expect, it, vi } from 'vitest';
import { ARENAS, getArena } from '../src/game/arena/BattleContent';
import {
  contributesToOralMastery,
  providerLabel,
  vibrateVoiceSuccess,
} from '../src/voice/VoiceFeedback';

describe('battle arena lessons', () => {
  it('ships six complete selectable lessons', () => {
    expect(ARENAS).toHaveLength(6);
    expect(ARENAS.map((arena) => arena.id)).toEqual([
      'neon-shrine',
      'moon-bamboo',
      'cyber-market',
      'sunrise-kitchen',
      'cozy-study',
      'metro-commute',
    ]);
    for (const arena of ARENAS) {
      expect(arena.lesson.arenaId).toBe(arena.id);
      expect(arena.lesson.words).toHaveLength(8);
      expect(arena.lesson.patterns).toHaveLength(6);
      expect(new Set(arena.lesson.words.map((word) => word.id)).size).toBe(8);
      expect(arena.lesson.words.every((word) => word.itemId && word.gameEffect)).toBe(true);
      expect(arena.lesson.patterns.every((pattern) => pattern.example && pattern.effect)).toBe(true);
    }
  });

  it('keeps the three daily-life arenas grounded in their setting', () => {
    expect(getArena('sunrise-kitchen').lesson.words.map((word) => word.id))
      .toEqual(expect.arrayContaining(['cup', 'kettle', 'fridge', 'apple']));
    expect(getArena('cozy-study').lesson.words.map((word) => word.id))
      .toEqual(expect.arrayContaining(['book', 'lamp', 'computer', 'desk']));
    expect(getArena('metro-commute').lesson.words.map((word) => word.id))
      .toEqual(expect.arrayContaining(['ticket', 'train', 'door', 'map']));
  });

  it('falls back to the shrine for stale saves', () => {
    expect(getArena('removed-arena').id).toBe('neon-shrine');
  });
});

describe('voice feedback policy', () => {
  it('keeps typed incantations out of oral mastery', () => {
    expect(contributesToOralMastery('mock')).toBe(false);
    expect(contributesToOralMastery('openai-realtime')).toBe(true);
  });

  it('uses bounded haptic patterns', () => {
    const vibrate = vi.fn(() => true);
    expect(vibrateVoiceSuccess({ vibrate }, true, false)).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(25);
    vibrateVoiceSuccess({ vibrate }, true, true);
    expect(vibrate).toHaveBeenLastCalledWith([20, 35, 35]);
    expect(vibrateVoiceSuccess({ vibrate }, false, true)).toBe(false);
  });

  it('renders stable provider labels', () => {
    expect(providerLabel('browser')).toBe('BROWSER');
  });
});
