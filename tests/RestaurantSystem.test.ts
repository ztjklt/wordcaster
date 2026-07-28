import { describe, expect, it } from 'vitest';
import { RestaurantDialogueSystem } from '../src/restaurant/RestaurantDialogueSystem';
import { PlayerNeedsSystem } from '../src/home/PlayerNeedsSystem';
import { createDefaultHomeState } from '../src/home/HomeSave';
import type { GameSave } from '../src/storage/SaveManager';

const save = (): GameSave => ({ saveVersion: 6, player: { level: 1, coins: 50, englishXp: 0, hunger: 50, thirst: 50, maxHealth: 100, maxStamina: 100, skillSlots: 3 }, vocabularyMastery: {}, sentenceMastery: {}, unlockedSkills: ['shield'], equippedSkills: ['shield'], commandBlock: { bestScore: 0, bestCombo: 0, clearedArenas: [], perfectArenas: [] }, home: createDefaultHomeState(), settings: { musicVolume: 1, soundVolume: 1, language: 'zh-CN', tutorialSeen: false } });
describe('restaurant and needs', () => {
  it('prompts after a state description', () => expect(new RestaurantDialogueSystem().respond("I'm hungry.").action).toBe('prompt_food'));
  it('accepts flexible item ordering', () => { const dialogue = new RestaurantDialogueSystem(); expect(dialogue.respond("Could I have a sandwich, please?").itemId).toBe('sandwich'); expect(dialogue.selected).toEqual(['sandwich']); });
  it('quotes the selected order', () => { const dialogue = new RestaurantDialogueSystem(); dialogue.respond("I'd like a sandwich."); expect(dialogue.respond('How much is it?').message).toContain('10'); });
  it('returns a comedic desert mistake', () => expect(new RestaurantDialogueSystem().respond("I'd like a desert.").action).toBe('wrong_item'));
  it('caps restored needs and applies battle cost', () => { const data = save(); const needs = new PlayerNeedsSystem(); needs.consume(data, 80, 90); expect(data.player.hunger).toBe(100); needs.afterBattle(data, false); expect(data.player.hunger).toBe(86); });
});
