import type { ListenOptions, SpeechProvider, SpeechResult } from './SpeechProvider';

interface BrowserRecognitionAlternative { transcript: string; confidence: number; }
interface BrowserRecognitionResult { readonly length: number; readonly isFinal?: boolean; [index: number]: BrowserRecognitionAlternative; }
interface BrowserRecognitionEvent extends Event { readonly resultIndex?: number; readonly results: { readonly length: number; [index: number]: BrowserRecognitionResult }; }
interface BrowserSpeechRecognition {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((event: BrowserRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
interface RecognitionConstructor { new(): BrowserSpeechRecognition; }
type SpeechWindow = Window & typeof globalThis & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };

export class BrowserSpeechProvider implements SpeechProvider {
  private recognition?: BrowserSpeechRecognition;
  private resultPromise?: Promise<SpeechResult>;
  private resolveResult?: (result: SpeechResult) => void;
  private rejectResult?: (error: Error) => void;
  private startedAt = 0;
  private language = 'en-US';
  private settled = false;
  private onPartial?: (text: string) => void;

  isSupported(): boolean { return typeof window !== 'undefined' && Boolean(this.getConstructor()); }

  async requestPermission(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) return this.isSupported();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch { return false; }
  }

  async startListening(options: ListenOptions = {}): Promise<void> {
    const Recognition = this.getConstructor();
    if (!Recognition) throw new Error('当前浏览器不支持语音识别，请使用文本模式');
    if (this.recognition) throw new Error('语音识别已经开始');
    this.language = options.language ?? 'en-US';
    this.onPartial = options.onPartial;
    this.startedAt = performance.now(); this.settled = false;
    this.recognition = new Recognition();
    Object.assign(this.recognition, { lang: this.language, continuous: false, interimResults: true, maxAlternatives: 3 });
    this.resultPromise = new Promise((resolve, reject) => { this.resolveResult = resolve; this.rejectResult = reject; });
    this.recognition.onresult = (event) => this.handleResult(event);
    this.recognition.onerror = (event) => this.finishError(this.toReadableError(event.error));
    this.recognition.onend = () => { if (!this.settled) this.finishError('没有识别到语音，请再试一次'); };
    try { this.recognition.start(); } catch (error) { this.cleanup(); throw error; }
  }

  async stopListening(): Promise<SpeechResult> {
    if (!this.resultPromise) throw new Error('语音识别尚未开始');
    this.recognition?.stop();
    try { return await this.resultPromise; }
    finally { this.resultPromise = undefined; this.resolveResult = undefined; this.rejectResult = undefined; }
  }

  waitForEnd(): Promise<void> { return this.resultPromise?.then(() => undefined, () => undefined) ?? Promise.resolve(); }

  cancel(): void { if (!this.recognition) return; this.recognition.abort(); this.finishError('语音识别已取消'); }

  private handleResult(event: BrowserRecognitionEvent): void {
    const first = event.results[event.resultIndex ?? 0];
    const alternatives = Array.from({ length: first?.length ?? 0 }, (_, index) => first[index]).filter(Boolean);
    const best = alternatives[0];
    if (!best?.transcript.trim()) return;
    if (first.isFinal === false) { this.onPartial?.(best.transcript.trim()); return; }
    this.settled = true;
    this.resolveResult?.({ transcript: best.transcript.trim(), alternatives: alternatives.slice(1).map((item) => item.transcript.trim()), confidence: Number.isFinite(best.confidence) ? best.confidence : null, language: this.language, durationMs: Math.round(performance.now() - this.startedAt), provider: 'browser' });
    this.cleanup();
  }

  private finishError(message: string): void { if (this.settled) return; this.settled = true; this.rejectResult?.(new Error(message)); this.cleanup(); }
  private cleanup(): void { if (this.recognition) { this.recognition.onresult = null; this.recognition.onerror = null; this.recognition.onend = null; } this.recognition = undefined; this.onPartial = undefined; }
  private getConstructor(): RecognitionConstructor | undefined { if (typeof window === 'undefined') return undefined; const speechWindow = window as SpeechWindow; return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition; }
  private toReadableError(code?: string): string {
    if (code === 'not-allowed' || code === 'service-not-allowed') return '麦克风权限被拒绝，请在浏览器设置中允许访问';
    if (code === 'no-speech') return '没有检测到语音，请再试一次';
    if (code === 'audio-capture') return '无法访问麦克风，请检查设备';
    if (code === 'network') return '语音服务网络异常，请使用文本模式';
    return '语音识别失败，请再试一次';
  }
}
