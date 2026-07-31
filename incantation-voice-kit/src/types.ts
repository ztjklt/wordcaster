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

export type IncantationProvider = 'browser' | 'volcengine' | 'text';

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

export interface IncantationTranscriptResult {
  transcript: string;
  alternatives: readonly string[];
  confidence: number | null;
  provider: IncantationProvider;
}

export interface IncantationRecognitionFinal {
  transcript: string;
  alternatives: readonly string[];
  confidence: number | null;
}

export interface IncantationRecognizerCallbacks {
  onPartial: (transcript: string) => void;
  onFinal: (result: IncantationRecognitionFinal) => void;
  onFailure: (
    reason: IncantationFailureReason,
    message: string,
    fatal: boolean,
  ) => void;
  onState: (state: IncantationChannelState, message: string) => void;
}

export interface IncantationRecognizer {
  readonly provider: Exclude<IncantationProvider, 'text'>;
  readonly supported: boolean;
  readonly listening: boolean;
  readonly requestingPermission: boolean;
  start(): boolean;
  finish(): void;
  cancel(): void;
  stop(): void;
  destroy(): void;
}

export type IncantationRecognizerFactory = (
  language: string,
  continuous: boolean,
  callbacks: IncantationRecognizerCallbacks,
) => IncantationRecognizer;

export interface IncantationFeedback {
  wordId?: string;
  label?: string;
  color?: string;
  soundProfile?: IncantationSoundProfile;
}

export interface IncantationVoiceOptions {
  target: HTMLElement | string;
  words: readonly IncantationWord[];
  language?: string;
  continuous?: boolean;
  /** Overrides the default Douyin-bridge/browser recognizer. */
  recognizerFactory?: IncantationRecognizerFactory;
  volume?: number;
  accentColor?: string;
  reducedMotion?: boolean | 'system';
  haptics?: boolean;
  feedbackMode?: 'auto' | 'manual';
  shortcuts?: boolean;
  /** Keep the kit's audio, recognition, rings and sparks without its own panel. */
  renderUI?: boolean;
  /** Lets the host game apply its own joined/tolerant/full-sentence resolver. */
  onFinalTranscript?: (result: IncantationTranscriptResult) => void;
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
  readonly isRequestingPermission: boolean;
  beginHold(): void;
  finishHold(): void;
  cancel(): void;
  start(): void;
  stop(): void;
  destroy(): void;
  submitText(transcript: string): void;
  setWords(words: readonly IncantationWord[]): void;
  setVolume(volume: number): void;
  playSuccess(result?: IncantationMatchResult | IncantationFeedback | string): void;
  playFailure(reason?: IncantationFailureReason): void;
}
