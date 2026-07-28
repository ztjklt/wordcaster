import { describe, expect, it } from 'vitest';
import { buildLessonChallengePrompts, LanguageChallengeAI } from '../src/game/ai/LanguageChallengeAI';
import { getArena } from '../src/game/arena/BattleContent';
import type { GameplayCommand } from '../src/language/GameplayCommand';

const command = (itemId: string, intent: GameplayCommand['intent'] = 'SUMMON_EQUIPMENT'): GameplayCommand => ({ intent, itemId, rawTranscript: '', normalizedTranscript: '', confidence: 1, languageScore: 90 });
describe('LanguageChallengeAI', () => {
  it('starts, accepts shield, and schedules next challenge', () => { const ai = new LanguageChallengeAI(100, 1000, 500); expect(ai.update(100)).toBe('started'); expect(ai.answer(command('shield'), 200)).toBe('correct'); expect(ai.state.active).toBe(false); expect(ai.update(1199)).toBe('idle'); expect(ai.update(1200)).toBe('started'); });
  it('rejects a wrong answer', () => { const ai = new LanguageChallengeAI(0); ai.update(0); expect(ai.answer(command('sword'), 20)).toBe('wrong'); });
  it('expires safely', () => { const ai = new LanguageChallengeAI(0, 1000, 500); ai.update(0); expect(ai.update(500)).toBe('expired'); expect(ai.state.active).toBe(false); });
  it('rotates only through the selected arena lesson', () => {
    const lesson = getArena('sunrise-kitchen').lesson;
    const prompts = buildLessonChallengePrompts(lesson);
    const ai = new LanguageChallengeAI(0, 1000, 500, prompts);
    expect(prompts).toHaveLength(8);
    expect(prompts.every((prompt) => lesson.words.some((word) => word.itemId === prompt.expectedItem))).toBe(true);
    expect(ai.update(0)).toBe('started');
    expect(ai.state.question).toContain('Use the cup.');
    expect(ai.answer(command('cup', 'USE_OBJECT'), 50)).toBe('correct');
  });
});
