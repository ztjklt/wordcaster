import type { IncantationWord } from './types';

export type SpokenWordMatchMode =
  | 'word'
  | 'phrase'
  | 'partial'
  | 'ambiguous'
  | 'spelling'
  | 'none';

export interface SpokenWordMatch {
  matched: boolean;
  wordId?: string;
  candidateWordId?: string;
  candidateWordIds: readonly string[];
  normalizedInput: string;
  mode: SpokenWordMatchMode;
}

export function tokenizeSpokenInput(input: string): string[] {
  return input
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/[\s'-]+/)
    .filter(Boolean);
}

export function normalizeSpokenInput(input: string): string {
  return tokenizeSpokenInput(input).join(' ');
}

function termTokens(word: IncantationWord): string[][] {
  return [word.word, ...(word.aliases ?? [])]
    .map(tokenizeSpokenInput)
    .filter((tokens) => tokens.length > 0);
}

function containsSequence(input: readonly string[], expected: readonly string[]): boolean {
  if (!expected.length || expected.length > input.length) return false;
  for (let start = 0; start <= input.length - expected.length; start += 1) {
    if (expected.every((token, offset) => input[start + offset] === token)) return true;
  }
  return false;
}

function isLetterSpelling(tokens: readonly string[], expected: readonly string[]): boolean {
  return expected.length === 1
    && tokens.length > 1
    && tokens.every((token) => token.length === 1)
    && tokens.join('') === expected[0];
}

export function assertValidWords(words: readonly IncantationWord[]): void {
  const ids = new Set<string>();
  words.forEach((word, index) => {
    if (!word.id.trim()) throw new Error(`words[${index}].id 不能为空`);
    if (ids.has(word.id)) throw new Error(`重复的言灵 ID: ${word.id}`);
    if (!tokenizeSpokenInput(word.word).length) throw new Error(`言灵 ${word.id} 缺少有效英文单词`);
    ids.add(word.id);
  });
}

export function resolveSpokenWord(
  input: string,
  words: readonly IncantationWord[],
  final = true,
): SpokenWordMatch {
  const tokens = tokenizeSpokenInput(input);
  const normalizedInput = tokens.join(' ');
  if (!tokens.length) {
    return { matched: false, normalizedInput, mode: 'none', candidateWordIds: [] };
  }

  const exactMatches = words.filter((word) =>
    termTokens(word).some((term) => containsSequence(tokens, term)));
  if (exactMatches.length > 1) {
    return {
      matched: false,
      normalizedInput,
      mode: 'ambiguous',
      candidateWordIds: exactMatches.map((word) => word.id),
    };
  }
  if (exactMatches.length === 1) {
    const word = exactMatches[0];
    return {
      matched: final,
      wordId: word.id,
      candidateWordId: word.id,
      candidateWordIds: [word.id],
      normalizedInput,
      mode: tokens.length === 1 ? 'word' : 'phrase',
    };
  }

  const spelled = words.find((word) =>
    termTokens(word).some((term) => isLetterSpelling(tokens, term)));
  if (spelled) {
    return {
      matched: false,
      wordId: spelled.id,
      candidateWordId: spelled.id,
      candidateWordIds: [spelled.id],
      normalizedInput,
      mode: 'spelling',
    };
  }

  if (!final) {
    const lastToken = tokens.at(-1) ?? '';
    const candidates = words.filter((word) =>
      lastToken.length >= 2
      && termTokens(word).some((term) => term.some((token) => token.startsWith(lastToken))));
    const candidateIds = [...new Set(candidates.map((word) => word.id))];
    if (candidateIds.length === 1) {
      return {
        matched: false,
        candidateWordId: candidateIds[0],
        candidateWordIds: candidateIds,
        normalizedInput,
        mode: 'partial',
      };
    }
    if (candidateIds.length > 1) {
      return {
        matched: false,
        candidateWordIds: candidateIds,
        normalizedInput,
        mode: 'ambiguous',
      };
    }
  }

  return { matched: false, normalizedInput, mode: 'none', candidateWordIds: [] };
}

export function resolveSpeechAlternatives(
  transcript: string,
  alternatives: readonly string[],
  words: readonly IncantationWord[],
): SpokenWordMatch {
  const primary = resolveSpokenWord(transcript, words, true);
  if (primary.matched || primary.mode === 'ambiguous' || primary.mode === 'spelling') return primary;
  for (const alternative of alternatives) {
    const match = resolveSpokenWord(alternative, words, true);
    if (match.matched) return { ...match, normalizedInput: normalizeSpokenInput(transcript) };
  }
  return primary;
}
