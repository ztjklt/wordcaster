import type { GameplayCommand, GameplayIntent } from '../../language/GameplayCommand';
import type { BattleLesson, LessonWord } from '../arena/BattleContent';

export interface LanguageChallengePrompt {
  question: string;
  expectedIntent: GameplayIntent;
  expectedItem: string;
}

export interface ChallengeState {
  active: boolean;
  question: string;
  expectedIntent: GameplayIntent;
  expectedItem: string;
  remainingMs: number;
}
export type ChallengeAnswer = 'correct' | 'wrong' | 'none';

const DEFAULT_PROMPTS: readonly LanguageChallengePrompt[] = [{
  question: 'SAY IT / “I need a shield.”',
  expectedIntent: 'SUMMON_EQUIPMENT',
  expectedItem: 'shield',
}];

const NATURAL_CHALLENGE_LINES: Readonly<Record<string, string>> = {
  shield: 'I need a shield.',
  sword: 'Bring me a sword.',
  lantern: 'Use the lantern.',
  bell: 'Ring the bell.',
  gate: 'Open the gate.',
  charm: 'Use the charm.',
  light: 'Turn off the light.',
  help: 'Please help me.',
  heal: 'Please heal me.',
  push: 'Stay away from me.',
  bamboo: 'Check the bamboo.',
  leaf: 'Use the leaf.',
  umbrella: 'Pick up the umbrella.',
  bridge: 'Check the bridge.',
  chair: 'Move the chair.',
  box: 'Move the box.',
  bottle: 'Throw the bottle.',
  cabinet: 'Open the cabinet.',
  noodles: 'Cook the noodles.',
  coin: 'Use the coin.',
  basket: 'Bring me the basket.',
  cup: 'Use the cup.',
  plate: 'Set the plate.',
  spoon: 'Use the spoon.',
  pan: 'Heat the pan.',
  kettle: 'Boil the kettle.',
  fridge: 'Open the fridge.',
  apple: 'Use the apple.',
  table: 'Check the table.',
  book: 'Read the book.',
  lamp: 'Turn on the lamp.',
  computer: 'Turn on the computer.',
  phone: 'Check the phone.',
  clock: 'Check the clock.',
  window: 'Open the window.',
  desk: 'Check the desk.',
  ticket: 'Check the ticket.',
  train: 'Start the train.',
  door: 'Open the door.',
  seat: 'Sit on the seat.',
  bag: 'Check the bag.',
  map: 'Show me the map.',
};

function fallbackLine(word: LessonWord): string {
  if (word.intent === 'SUMMON_EQUIPMENT') return `I need a ${word.english}.`;
  if (word.intent === 'MOVE_OBJECT') return `Move the ${word.english}.`;
  if (word.intent === 'THROW_OBJECT') return `Throw the ${word.english}.`;
  if (word.intent === 'OPEN_OBJECT') return `Open the ${word.english}.`;
  if (word.intent === 'TURN_LIGHT_OFF') return `Turn off the ${word.english}.`;
  return `Use the ${word.english}.`;
}

export function buildLessonChallengePrompts(lesson: BattleLesson): LanguageChallengePrompt[] {
  return lesson.words
    .filter((word): word is LessonWord & { itemId: string } => Boolean(word.itemId))
    .map((word) => ({
      question: `SAY IT / “${NATURAL_CHALLENGE_LINES[word.itemId] ?? fallbackLine(word)}”`,
      expectedIntent: word.intent,
      expectedItem: word.itemId,
    }));
}

export class LanguageChallengeAI {
  private nextAt: number;
  private expiresAt = 0;
  private promptIndex = 0;
  readonly state: ChallengeState = {
    active: false,
    question: '',
    expectedIntent: 'UNKNOWN',
    expectedItem: '',
    remainingMs: 0,
  };
  constructor(
    startAt = 9000,
    private readonly intervalMs = 18000,
    private readonly durationMs = 6500,
    private readonly prompts: readonly LanguageChallengePrompt[] = DEFAULT_PROMPTS,
  ) {
    this.nextAt = startAt;
  }

  update(now: number): 'started' | 'expired' | 'idle' {
    if (!this.state.active && now >= this.nextAt) {
      const source = this.prompts.length ? this.prompts : DEFAULT_PROMPTS;
      const prompt = source[this.promptIndex % source.length];
      this.promptIndex += 1;
      Object.assign(this.state, {
        active: true,
        question: prompt.question,
        expectedIntent: prompt.expectedIntent,
        expectedItem: prompt.expectedItem,
        remainingMs: this.durationMs,
      });
      this.expiresAt = now + this.durationMs; return 'started';
    }
    if (this.state.active) {
      this.state.remainingMs = Math.max(0, this.expiresAt - now);
      if (now >= this.expiresAt) { this.finish(now); return 'expired'; }
    }
    return 'idle';
  }

  answer(command: GameplayCommand, now: number): ChallengeAnswer {
    if (!this.state.active) return 'none';
    const correct = command.intent === this.state.expectedIntent && command.itemId === this.state.expectedItem;
    this.finish(now); return correct ? 'correct' : 'wrong';
  }

  private finish(now: number): void { this.state.active = false; this.state.remainingMs = 0; this.nextAt = now + this.intervalMs; }
}
