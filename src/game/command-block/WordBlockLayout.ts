import type { CommandWordDefinition } from './CommandBlockContent';
import { shuffleSeeded } from './CommandBlockRoundController';

export interface WordBlockPlacement {
  blockId: string;
  wordId: string;
  word: string;
  x: number;
  y: number;
  width: number;
  tier: 0 | 1 | 2;
}

const SLOTS = [
  { x: 180, y: 505, tier: 0 }, { x: 485, y: 505, tier: 0 },
  { x: 795, y: 505, tier: 0 }, { x: 1100, y: 505, tier: 0 },
  { x: 270, y: 405, tier: 1 }, { x: 640, y: 405, tier: 1 }, { x: 1010, y: 405, tier: 1 },
  { x: 200, y: 305, tier: 2 }, { x: 640, y: 305, tier: 2 }, { x: 1080, y: 305, tier: 2 },
] as const;

export function wordBlockWidth(word: string): number {
  return Math.max(142, Math.min(214, 104 + word.length * 13));
}

export function planWordBlockLayout(words: readonly CommandWordDefinition[], seed: number): WordBlockPlacement[] {
  const shuffledWords = shuffleSeeded(words, seed);
  return SLOTS.slice(0, shuffledWords.length).map((slot, index) => ({
    blockId: `word-block-${index}`,
    wordId: shuffledWords[index].id,
    word: shuffledWords[index].word,
    x: slot.x,
    y: slot.y,
    width: wordBlockWidth(shuffledWords[index].word),
    tier: slot.tier,
  }));
}

export function hasOverlappingWordPlacements(placements: readonly WordBlockPlacement[]): boolean {
  return placements.some((placement, index) => placements.slice(index + 1).some((other) => (
    Math.abs(placement.x - other.x) < (placement.width + other.width) / 2 + 18
    && Math.abs(placement.y - other.y) < 52
  )));
}
