import type { CommandWordDefinition } from './CommandBlockContent';

export type SpokenWordMatchMode = 'word' | 'phrase' | 'partial' | 'activated' | 'ambiguous' | 'spelling' | 'none';

export interface SpokenWordMatch {
  matched: boolean;
  wordId?: string;
  candidateWordId?: string;
  normalizedInput: string;
  mode: SpokenWordMatchMode;
}

const tokenize = (input: string): string[] => input
  .toLowerCase()
  .replace(/[^a-z\s'-]/g, ' ')
  .split(/[\s'-]+/)
  .filter(Boolean);

export function normalizeSpokenInput(input: string): string {
  return tokenize(input).join(' ');
}

function isLetterSpelling(tokens: readonly string[], word: string): boolean {
  return tokens.length > 1 && tokens.every((token) => token.length === 1) && tokens.join('') === word;
}

export function resolveSpokenWord(
  input: string,
  visibleWords: readonly CommandWordDefinition[],
  activatedWordIds: ReadonlySet<string> = new Set(),
  final = true,
): SpokenWordMatch {
  const tokens = tokenize(input);
  const normalizedInput = tokens.join(' ');
  if (!tokens.length) return { matched: false, normalizedInput, mode: 'none' };

  const exactMatches = visibleWords.filter((definition) => tokens.includes(definition.word.toLowerCase()));
  if (exactMatches.length > 1) {
    return { matched: false, normalizedInput, mode: 'ambiguous' };
  }
  if (exactMatches.length === 1) {
    const definition = exactMatches[0];
    if (isLetterSpelling(tokens, definition.word.toLowerCase())) {
      return { matched: false, wordId: definition.id, normalizedInput, mode: 'spelling' };
    }
    if (activatedWordIds.has(definition.id)) {
      return { matched: false, wordId: definition.id, normalizedInput, mode: 'activated' };
    }
    return {
      matched: final,
      wordId: definition.id,
      candidateWordId: definition.id,
      normalizedInput,
      mode: tokens.length === 1 ? 'word' : 'phrase',
    };
  }

  if (!final) {
    const lastToken = tokens[tokens.length - 1];
    const candidates = visibleWords.filter((definition) => (
      !activatedWordIds.has(definition.id)
      && lastToken.length >= 2
      && definition.word.toLowerCase().startsWith(lastToken)
    ));
    if (candidates.length === 1) {
      return {
        matched: false,
        candidateWordId: candidates[0].id,
        normalizedInput,
        mode: 'partial',
      };
    }
  }

  const compact = tokens.join('');
  const spelled = visibleWords.find((definition) => (
    isLetterSpelling(tokens, definition.word.toLowerCase()) || compact === definition.word.toLowerCase() && tokens.length > 1
  ));
  if (spelled) return { matched: false, wordId: spelled.id, normalizedInput, mode: 'spelling' };
  return { matched: false, normalizedInput, mode: 'none' };
}
