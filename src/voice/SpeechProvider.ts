export interface ListenOptions { language?: string; timeoutMs?: number; onPartial?: (text: string) => void; }

export interface SpeechResult {
  utteranceId?: string;
  transcript: string;
  alternatives: string[];
  confidence: number | null;
  language: string;
  durationMs: number;
  provider: string;
  error?: string;
}

export interface SpeechProvider {
  isSupported(): boolean;
  requestPermission(): Promise<boolean>;
  startListening(options: ListenOptions): Promise<void>;
  stopListening(): Promise<SpeechResult>;
  cancel(): void;
}
