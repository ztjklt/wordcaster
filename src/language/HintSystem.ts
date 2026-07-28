export interface HintResult { level: number; text: string; }
const shieldHints = ['保护自己', 'need / shield', 'I need…', 'I need a shield.'];
export class HintSystem {
  private level = -1;
  next(): HintResult { this.level = Math.min(this.level + 1, shieldHints.length - 1); return { level: this.level + 1, text: shieldHints[this.level] }; }
  reset(): void { this.level = -1; }
  get currentLevel(): number { return this.level + 1; }
}
