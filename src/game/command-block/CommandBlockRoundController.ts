import type { ArenaId } from '../arena/BattleContent';
import { getCommandWords } from './CommandBlockContent';

export interface CommandBlockRunSpec {
  seed: number;
  wordIds: string[];
  timeLimitMs: number;
}

export interface CommandBlockRunStats {
  arenaId: ArenaId;
  score: number;
  correctWords: string[];
  failedWords: string[];
  voiceCorrect: number;
  textCorrect: number;
  bestCombo: number;
  averageResponseMs: number;
  timeoutCount: number;
  wrongCount: number;
  playerSurvived: boolean;
  won: boolean;
  perfect: boolean;
  durationSeconds: number;
  rewardCoins: number;
  rewardXp: number;
}

export interface ActivationSuccess {
  wordId: string;
  score: number;
  baseScore: number;
  timeBonus: number;
  voiceBonus: number;
  multiplier: number;
  combo: number;
  responseMs: number;
}

const WINDOW_MS = 15000;
const MULTIPLIERS = [1, 1.15, 1.3, 1.5, 1.75] as const;

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function shuffleSeeded<T>(values: readonly T[], seed: number): T[] {
  const random = seededRandom(seed);
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

export function buildCommandBlockRun(arenaId: ArenaId, seed: number): CommandBlockRunSpec {
  const words = getCommandWords(arenaId);
  if (words.length !== 10) throw new Error(`Command Block arena ${arenaId} must contain exactly 10 words`);
  return {
    seed,
    wordIds: shuffleSeeded(words.map((entry) => entry.id), seed),
    timeLimitMs: WINDOW_MS,
  };
}

export function calculateActivationScore(remainingMs: number, provider: string, combo: number): ActivationSuccess {
  const baseScore = 100;
  const timeBonus = Math.max(0, Math.floor(remainingMs / 1000)) * 10;
  const voiceBonus = provider === 'mock' ? 0 : 20;
  const multiplier = MULTIPLIERS[Math.min(MULTIPLIERS.length - 1, Math.max(0, combo - 1))];
  return {
    wordId: '',
    score: Math.round((baseScore + timeBonus + voiceBonus) * multiplier),
    baseScore,
    timeBonus,
    voiceBonus,
    multiplier,
    combo,
    responseMs: 0,
  };
}

export class CommandBlockRoundController {
  readonly run: CommandBlockRunSpec;
  readonly stats: Omit<CommandBlockRunStats, 'playerSurvived' | 'won' | 'perfect' | 'durationSeconds' | 'rewardCoins' | 'rewardXp'>;
  private readonly activated = new Set<string>();
  private startedAt = 0;
  private responses: number[] = [];
  private combo = 0;
  private comboGuard = 0;

  constructor(readonly arenaId: ArenaId, seed: number) {
    this.run = buildCommandBlockRun(arenaId, seed);
    this.stats = {
      arenaId,
      score: 0,
      correctWords: [],
      failedWords: [],
      voiceCorrect: 0,
      textCorrect: 0,
      bestCombo: 0,
      averageResponseMs: 0,
      timeoutCount: 0,
      wrongCount: 0,
    };
  }

  get totalWords(): number { return this.run.wordIds.length; }
  get activatedCount(): number { return this.activated.size; }
  get activatedWordIds(): ReadonlySet<string> { return this.activated; }
  get complete(): boolean { return this.activatedCount === this.totalWords; }
  get timeLimitMs(): number { return this.run.timeLimitMs; }

  start(now: number): void {
    this.startedAt = now;
  }

  remaining(now: number): number {
    return Math.max(0, this.timeLimitMs - (now - this.startedAt));
  }

  addTime(valueMs: number): void {
    this.startedAt += Math.max(0, valueMs);
  }

  correct(wordId: string, now: number, provider: string): ActivationSuccess | undefined {
    if (!this.run.wordIds.includes(wordId) || this.activated.has(wordId)) return;
    const definition = getCommandWords(this.arenaId).find((entry) => entry.id === wordId);
    if (!definition) return;
    const responseMs = Math.max(0, now - this.startedAt);
    this.combo += 1;
    const result = calculateActivationScore(this.remaining(now), provider, this.combo);
    result.wordId = wordId;
    result.responseMs = responseMs;
    this.activated.add(wordId);
    this.stats.score += result.score;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
    this.stats.correctWords.push(definition.word);
    if (provider === 'mock') this.stats.textCorrect += 1;
    else this.stats.voiceCorrect += 1;
    this.responses.push(responseMs);
    this.stats.averageResponseMs = Math.round(this.responses.reduce((sum, value) => sum + value, 0) / this.responses.length);
    this.startedAt = now;
    return result;
  }

  wrong(): { score: number; guarded: boolean } {
    this.stats.wrongCount += 1;
    const guarded = this.comboGuard > 0;
    if (guarded) {
      this.comboGuard -= 1;
    } else {
      this.combo = 0;
      this.stats.score = Math.max(0, this.stats.score - 25);
    }
    return { score: this.stats.score, guarded };
  }

  timeout(now: number): void {
    this.stats.timeoutCount += 1;
    this.combo = 0;
    this.startedAt = now;
  }

  grantComboGuard(count = 1): void {
    this.comboGuard += Math.max(0, Math.round(count));
  }

  addScore(value: number): void {
    this.stats.score += Math.max(0, value);
  }

  finish(playerSurvived: boolean, durationMs: number): CommandBlockRunStats {
    const definitions = getCommandWords(this.arenaId);
    this.stats.failedWords = this.run.wordIds
      .filter((id) => !this.activated.has(id))
      .map((id) => definitions.find((entry) => entry.id === id)?.word ?? id);
    const won = this.complete && playerSurvived;
    const perfect = won && this.stats.wrongCount === 0 && this.stats.timeoutCount === 0 && this.stats.textCorrect === 0;
    if (perfect) this.stats.score += 500;
    const correct = this.stats.correctWords.length;
    return {
      ...this.stats,
      playerSurvived,
      won,
      perfect,
      durationSeconds: Math.max(1, Math.round(durationMs / 1000)),
      rewardCoins: won ? 35 + correct * 7 + (perfect ? 30 : 0) : 8 + correct * 3,
      rewardXp: this.stats.voiceCorrect * 12 + this.stats.textCorrect * 4 + (perfect ? 35 : 0),
    };
  }
}
