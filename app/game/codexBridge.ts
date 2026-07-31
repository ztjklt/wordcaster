export const WORD_CASTER_CODEX = {
  ready: "WORD_CASTER_CODEX_READY",
  state: "WORD_CASTER_CODEX_STATE",
  learnRequest: "WORD_CASTER_CODEX_LEARN_REQUEST",
  learnResult: "WORD_CASTER_CODEX_LEARN_RESULT",
  quickAccessRequest: "WORD_CASTER_CODEX_QUICK_ACCESS_REQUEST",
  quickAccessResult: "WORD_CASTER_CODEX_QUICK_ACCESS_RESULT",
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

export interface CodexQuickAccessRequest {
  type: typeof WORD_CASTER_CODEX.quickAccessRequest;
  requestId: string;
}

export interface CodexQuickAccessResult {
  type: typeof WORD_CASTER_CODEX.quickAccessResult;
  requestId: string;
  accepted: boolean;
  enabled: boolean;
  reason?: string;
}

function rememberResult<Result>(
  completed: Map<string, Result>,
  requestId: string,
  handler: () => Result,
): Result {
  const cached = completed.get(requestId);
  if (cached) return cached;
  const result = handler();
  completed.set(requestId, result);
  if (completed.size > 256) {
    const first = completed.keys().next().value;
    if (first) completed.delete(first);
  }
  return result;
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
    return rememberResult(this.completed, request.requestId, () => ({
      type: WORD_CASTER_CODEX.learnResult,
      requestId: request.requestId,
      english: request.english,
      ...handler(),
    }));
  }

  clear(): void {
    this.completed.clear();
  }
}

/**
 * Quick-access requests only unlock voice recognition for the current run.
 * Keeping them idempotent prevents duplicate bridge side effects when an
 * iframe restores and redelivers its last message.
 */
export class CodexQuickAccessTransactions {
  private readonly completed = new Map<string, CodexQuickAccessResult>();

  process(
    request: CodexQuickAccessRequest,
    handler: () => Omit<
      CodexQuickAccessResult,
      "type" | "requestId"
    >,
  ): CodexQuickAccessResult {
    return rememberResult(this.completed, request.requestId, () => ({
      type: WORD_CASTER_CODEX.quickAccessResult,
      requestId: request.requestId,
      ...handler(),
    }));
  }

  clear(): void {
    this.completed.clear();
  }
}
