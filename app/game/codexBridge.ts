export const WORD_CASTER_CODEX = {
  ready: "WORD_CASTER_CODEX_READY",
  state: "WORD_CASTER_CODEX_STATE",
  learnRequest: "WORD_CASTER_CODEX_LEARN_REQUEST",
  learnResult: "WORD_CASTER_CODEX_LEARN_RESULT",
  close: "WORD_CASTER_CODEX_CLOSE",
  reset: "WORD_CASTER_CODEX_RESET",
} as const;

export interface CodexLearnRequest {
  type: typeof WORD_CASTER_CODEX.learnRequest;
  requestId: string;
  english: string;
  stars: number;
  newlyLearned: boolean;
}

export interface CodexLearnResult {
  type: typeof WORD_CASTER_CODEX.learnResult;
  requestId: string;
  english: string;
  accepted: boolean;
  reason?: string;
  dailyLessonsLearned: number;
  dailyLessonLimit: number;
}

/**
 * Keeps postMessage learning requests idempotent. Browsers can redeliver a
 * message while an iframe is restoring; the same request must never consume
 * two daily lesson slots.
 */
export class CodexLearningTransactions {
  private readonly completed = new Map<string, CodexLearnResult>();

  process(
    request: CodexLearnRequest,
    handler: () => Omit<CodexLearnResult, "type" | "requestId" | "english">,
  ): CodexLearnResult {
    const cached = this.completed.get(request.requestId);
    if (cached) return cached;
    const result: CodexLearnResult = {
      type: WORD_CASTER_CODEX.learnResult,
      requestId: request.requestId,
      english: request.english,
      ...handler(),
    };
    this.completed.set(request.requestId, result);
    if (this.completed.size > 256) {
      const first = this.completed.keys().next().value;
      if (first) this.completed.delete(first);
    }
    return result;
  }

  clear(): void {
    this.completed.clear();
  }
}
