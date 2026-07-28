export interface VadEvent { type: 'speech-start'|'speech-end'|'idle-clear'; at: number; }
export class VoiceActivityDetector {
  private aboveSince?: number; private belowSince?: number; private lastSpeechAt = 0; private speaking = false;
  constructor(private readonly startMs = 250, private readonly silenceMs = 650, private readonly idleMs = 8000) {}
  sample(active: boolean, at: number): VadEvent | undefined {
    if (active) { this.lastSpeechAt = at; this.belowSince = undefined; this.aboveSince ??= at; if (!this.speaking && at - this.aboveSince >= this.startMs) { this.speaking = true; return { type: 'speech-start', at }; } return; }
    this.aboveSince = undefined; this.belowSince ??= at;
    if (this.speaking && at - this.belowSince >= this.silenceMs) { this.speaking = false; return { type: 'speech-end', at }; }
    if (!this.speaking && this.lastSpeechAt > 0 && at - this.lastSpeechAt >= this.idleMs) { this.lastSpeechAt = at; return { type: 'idle-clear', at }; }
  }
  reset(): void { this.aboveSince = undefined; this.belowSince = undefined; this.lastSpeechAt = 0; this.speaking = false; }
}
