export type IncantationSoundProfile =
  | 'metal'
  | 'mystic'
  | 'nature'
  | 'water'
  | 'electric'
  | 'food'
  | 'paper'
  | 'transit';

export interface IncantationWord {
  id: string;
  word: string;
  aliases?: readonly string[];
  color?: string;
  soundProfile?: IncantationSoundProfile;
}

export type IncantationProvider = 'browser' | 'text';

export type IncantationFailureReason =
  | 'unknown'
  | 'ambiguous'
  | 'spelling'
  | 'permission'
  | 'unsupported'
  | 'no-speech'
  | 'network'
  | 'audio-capture'
  | 'stopped'
  | string;

export type IncantationChannelState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'transcribing'
  | 'processing'
  | 'reconnecting'
  | 'fallback'
  | 'destroyed';

export interface IncantationMatchResult {
  utteranceId: string;
  word: IncantationWord;
  transcript: string;
  normalizedTranscript: string;
  confidence: number | null;
  provider: IncantationProvider;
}

export interface IncantationNoMatchResult {
  utteranceId: string;
  transcript: string;
  normalizedTranscript: string;
  confidence: number | null;
  provider: IncantationProvider;
  reason: IncantationFailureReason;
  candidateWordIds: readonly string[];
}

export interface IncantationCandidateResult {
  transcript: string;
  normalizedTranscript: string;
  word?: IncantationWord;
}

export interface IncantationStateChange {
  state: IncantationChannelState;
  provider: IncantationProvider;
  message: string;
}

export interface IncantationVoiceOptions {
  target: HTMLElement | string;
  words: readonly IncantationWord[];
  language?: string;
  continuous?: boolean;
  volume?: number;
  accentColor?: string;
  reducedMotion?: boolean | 'system';
  haptics?: boolean;
  feedbackMode?: 'auto' | 'manual';
  shortcuts?: boolean;
  onMatch?: (result: IncantationMatchResult) => void;
  onNoMatch?: (result: IncantationNoMatchResult) => void;
  onCandidate?: (result: IncantationCandidateResult) => void;
  onStateChange?: (state: IncantationStateChange) => void;
}

export interface WordFlashOptions {
  color?: string;
  durationMs?: number;
  reducedMotion?: boolean | 'system';
}

export interface IncantationVoiceInstance {
  readonly browserSupported: boolean;
  readonly isListening: boolean;
  start(): void;
  stop(): void;
  destroy(): void;
  submitText(transcript: string): void;
  setWords(words: readonly IncantationWord[]): void;
  setVolume(volume: number): void;
  playSuccess(result?: IncantationMatchResult | string): void;
  playFailure(reason?: IncantationFailureReason): void;
}
