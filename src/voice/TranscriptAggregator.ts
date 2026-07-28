import type { VoiceUtterance } from './VoiceTypes';

export class TranscriptAggregator {
  private readonly utterances = new Map<string, VoiceUtterance>();
  applyDelta(itemId: string, delta: string): VoiceUtterance {
    const current = this.utterances.get(itemId) ?? { utteranceId: itemId, partialText: '', status: 'transcribing' as const, provider: 'openai-realtime' as const };
    if (!current.finalRawText) current.partialText += delta;
    this.utterances.set(itemId, current); return { ...current };
  }
  complete(itemId: string, transcript: string): VoiceUtterance {
    const current = this.utterances.get(itemId) ?? { utteranceId: itemId, partialText: '', status: 'transcribing' as const, provider: 'openai-realtime' as const };
    if (!current.finalRawText) { current.finalRawText = transcript.trim() || current.partialText.trim(); current.partialText = ''; current.status = 'interpreting'; }
    this.utterances.set(itemId, current); return { ...current };
  }
  clear(): void { this.utterances.clear(); }
}
