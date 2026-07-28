import type { ListenOptions, SpeechProvider, SpeechResult } from './SpeechProvider';

export interface MockSpeechOptions { transcript?: string; confidence?: number; latencyMs?: number; permissionGranted?: boolean; }

export class MockSpeechProvider implements SpeechProvider {
  private listening = false;
  private startedAt = 0;
  private language = 'en-US';
  private options: Required<MockSpeechOptions>;

  constructor(options: MockSpeechOptions = {}) {
    this.options = { transcript: options.transcript ?? '', confidence: options.confidence ?? 0.95, latencyMs: options.latencyMs ?? 350, permissionGranted: options.permissionGranted ?? true };
  }
  isSupported(): boolean { return true; }
  async requestPermission(): Promise<boolean> { return this.options.permissionGranted; }
  async startListening(options: ListenOptions = {}): Promise<void> {
    if (this.listening) throw new Error('MockSpeechProvider 已经在监听');
    if (!this.options.permissionGranted) throw new Error('麦克风权限被模拟为拒绝');
    this.language = options.language ?? 'en-US';
    this.listening = true;
    this.startedAt = performance.now();
  }
  setTranscript(transcript: string, confidence = this.options.confidence): void { this.options.transcript = transcript; this.options.confidence = confidence; }
  async stopListening(): Promise<SpeechResult> {
    if (!this.listening) throw new Error('MockSpeechProvider 尚未开始监听');
    await new Promise((resolve) => globalThis.setTimeout(resolve, this.options.latencyMs));
    this.listening = false;
    const transcript = this.options.transcript.trim();
    if (!transcript) throw new Error('请输入用于模拟语音的文本');
    return { transcript, alternatives: [], confidence: this.options.confidence, language: this.language, durationMs: Math.round(performance.now() - this.startedAt), provider: 'mock' };
  }
  cancel(): void { this.listening = false; }
}
