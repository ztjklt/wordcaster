import type { ArenaId } from '../game/arena/BattleContent';
import { createDefaultHomeState, migrateHomeState, type HomeSaveState } from '../home/HomeSave';

export interface GameSave {
  saveVersion: 2 | 3 | 4 | 5 | 6;
  player: { level: number; coins: number; englishXp: number; hunger: number; thirst: number; maxHealth: number; maxStamina: number; skillSlots: number; };
  vocabularyMastery: Record<string, number>;
  sentenceMastery: Record<string, number>;
  unlockedSkills: string[];
  equippedSkills: string[];
  selectedArenaId?: ArenaId;
  commandBlock: {
    bestScore: number;
    bestCombo: number;
    clearedArenas: ArenaId[];
    perfectArenas: ArenaId[];
  };
  home: HomeSaveState;
  settings: { musicVolume: number; soundVolume: number; language: string; tutorialSeen: boolean; hapticsEnabled?: boolean; effectsQuality?: 'high' | 'low'; };
}

const SAVE_KEY = 'speak-to-fight:save';
const defaultSave = (): GameSave => ({ saveVersion: 6, player: { level: 1, coins: 50, englishXp: 0, hunger: 82, thirst: 74, maxHealth: 100, maxStamina: 100, skillSlots: 3 }, vocabularyMastery: {}, sentenceMastery: {}, unlockedSkills: ['shield', 'sword', 'heal', 'push', 'help'], equippedSkills: ['shield', 'sword', 'heal'], selectedArenaId: 'neon-shrine', commandBlock: { bestScore: 0, bestCombo: 0, clearedArenas: [], perfectArenas: [] }, home: createDefaultHomeState(), settings: { musicVolume: 0.7, soundVolume: 0.8, language: 'zh-CN', tutorialSeen: false, hapticsEnabled: true, effectsQuality: 'high' } });

export class SaveManager {
  static load(): GameSave {
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return defaultSave();
      const parsed: unknown = JSON.parse(raw); if (!parsed || typeof parsed !== 'object') throw new Error('存档格式无效');
      return this.migrate(parsed as Record<string, unknown>);
    } catch (error) { console.warn('读取存档失败，已使用默认存档。', error); return defaultSave(); }
  }
  static save(data: GameSave): boolean { try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch (error) { console.error('保存游戏失败。', error); return false; } }
  static reset(): GameSave { const save = defaultSave(); this.save(save); return save; }
  private static migrate(value: Record<string, unknown>): GameSave {
    const defaults = defaultSave(); const player = value.player && typeof value.player === 'object' ? value.player as Record<string, unknown> : {};
    const arenaIds: readonly ArenaId[] = ['neon-shrine', 'moon-bamboo', 'cyber-market', 'sunrise-kitchen', 'cozy-study', 'metro-commute'];
    const selectedArenaId = typeof value.selectedArenaId === 'string' && arenaIds.includes(value.selectedArenaId as ArenaId)
      ? value.selectedArenaId as ArenaId
      : 'neon-shrine';
    const storedUnlocked = Array.isArray(value.unlockedSkills)
      ? value.unlockedSkills.filter((item): item is string => typeof item === 'string')
      : defaults.unlockedSkills;
    const unlockedSkills = [...new Set([...storedUnlocked, 'help'])];
    const storedCommandBlock = value.commandBlock && typeof value.commandBlock === 'object'
      ? value.commandBlock as Record<string, unknown>
      : {};
    const validArenaList = (candidate: unknown): ArenaId[] => Array.isArray(candidate)
      ? [...new Set(candidate.filter((item): item is ArenaId => typeof item === 'string' && arenaIds.includes(item as ArenaId)))]
      : [];
    const commandBlock = {
      bestScore: typeof storedCommandBlock.bestScore === 'number' ? Math.max(0, Math.round(storedCommandBlock.bestScore)) : 0,
      bestCombo: typeof storedCommandBlock.bestCombo === 'number' ? Math.max(0, Math.round(storedCommandBlock.bestCombo)) : 0,
      clearedArenas: validArenaList(storedCommandBlock.clearedArenas),
      perfectArenas: validArenaList(storedCommandBlock.perfectArenas),
    };
    return { ...defaults, ...value, saveVersion: 6, selectedArenaId, player: { ...defaults.player, ...player }, vocabularyMastery: this.record(value.vocabularyMastery), sentenceMastery: this.record(value.sentenceMastery), unlockedSkills, equippedSkills: Array.isArray(value.equippedSkills) ? value.equippedSkills.filter((item): item is string => typeof item === 'string') : defaults.equippedSkills, commandBlock, home: migrateHomeState(value.home), settings: { ...defaults.settings, ...(value.settings && typeof value.settings === 'object' ? value.settings : {}) } };
  }
  private static record(value: unknown): Record<string, number> { if (!value || typeof value !== 'object') return {}; return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number')); }
}
