export interface LanguageEvaluation { score: number; completeSentence: boolean; independent: boolean; feedback: string; }

export class LanguageEvaluator {
  evaluate(normalized: string, keywords: string[], hintLevel = 0): LanguageEvaluation {
    const tokens = normalized.split(' ');
    const keywordRatio = keywords.filter((word) => tokens.includes(word)).length / Math.max(1, keywords.length);
    const hasSubjectVerb = /\b(i (need|want|would like|am)|give me|bring me|move the|throw the|turn off|open the|stay away|heal me|help me|could i|can i)\b/.test(normalized);
    const completeSentence = hasSubjectVerb && tokens.length >= 3;
    const base = keywordRatio * 60 + (completeSentence ? 35 : tokens.length > 1 ? 15 : 5);
    const score = Math.max(0, Math.min(100, Math.round(base - hintLevel * 8)));
    return { score, completeSentence, independent: hintLevel === 0, feedback: score >= 85 ? '表达完整自然' : score >= 60 ? '表达有效，可以更完整' : '关键词已识别' };
  }
}
