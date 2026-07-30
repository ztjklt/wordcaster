import assert from "node:assert/strict";
import test from "node:test";

import {
  CodexLearningTransactions,
  WORD_CASTER_CODEX,
  type CodexLearnRequest,
} from "../app/game/codexBridge.ts";
import {
  DAILY_LESSON_LIMIT,
  recordDailyLesson,
  type LearningDayState,
} from "../app/game/core.ts";

function request(
  index: number,
  english: string,
  newlyLearned = true,
): CodexLearnRequest {
  return {
    type: WORD_CASTER_CODEX.learnRequest,
    requestId: `lesson-${index}`,
    english,
    stars: 3,
    newlyLearned,
  };
}

test("codex learning requests are idempotent and never form a sync loop", () => {
  const transactions = new CodexLearningTransactions();
  let calls = 0;
  const first = request(1, "Tower");
  const apply = () => {
    calls += 1;
    return {
      accepted: true,
      dailyLessonsLearned: 1,
      dailyLessonLimit: DAILY_LESSON_LIMIT,
    };
  };
  const initial = transactions.process(first, apply);
  const duplicate = transactions.process(first, apply);
  assert.deepEqual(duplicate, initial);
  assert.equal(calls, 1);
  assert.equal(initial.type, WORD_CASTER_CODEX.learnResult);
});

test("transactional courses accept two in a row, the eighth, reviews, and reject the ninth", () => {
  const transactions = new CodexLearningTransactions();
  let day: LearningDayState = {
    dayIndex: 0,
    learnedWordKeys: [],
    limit: DAILY_LESSON_LIMIT,
  };
  const learn = (entry: CodexLearnRequest) =>
    transactions.process(entry, () => {
      const result = recordDailyLesson(
        day,
        entry.english,
        entry.newlyLearned,
      );
      if (result.accepted) day = result.state;
      return {
        accepted: result.accepted,
        reason: result.accepted ? undefined : "今日8个新词已经学满",
        dailyLessonsLearned: day.learnedWordKeys.length,
        dailyLessonLimit: DAILY_LESSON_LIMIT,
      };
    });

  for (let index = 1; index <= 8; index += 1) {
    const result = learn(request(index, `Word ${index}`));
    assert.equal(result.accepted, true, `lesson ${index}`);
  }
  assert.equal(day.learnedWordKeys.length, 8);
  assert.equal(learn(request(9, "Word 9")).accepted, false);
  assert.equal(learn(request(10, "Word 1", false)).accepted, true);
  assert.equal(day.learnedWordKeys.length, 8);
});
