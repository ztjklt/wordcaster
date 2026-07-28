import { SaveManager } from '../storage/SaveManager';

export class VocabularyProgress {
  recordVocabulary(id: string, score: number, independent: boolean): number {
    const save = SaveManager.load(); const current = save.vocabularyMastery[id] ?? 0;
    const gain = score >= 85 ? (independent ? 8 : 4) : score >= 60 ? 3 : 1;
    const next = Math.min(100, current + gain); save.vocabularyMastery[id] = next; SaveManager.save(save); return next;
  }
  recordSentence(id: string, score: number): number {
    const save = SaveManager.load(); const next = Math.min(100, (save.sentenceMastery[id] ?? 0) + (score >= 85 ? 6 : 2)); save.sentenceMastery[id] = next; SaveManager.save(save); return next;
  }
}
