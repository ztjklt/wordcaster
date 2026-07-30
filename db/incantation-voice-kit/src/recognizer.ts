import type {
  IncantationChannelState,
  IncantationFailureReason,
} from './types';

interface BrowserRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface BrowserRecognitionResult {
  readonly length: number;
  readonly isFinal?: boolean;
  [index: number]: BrowserRecognitionAlternative;
}

interface BrowserRecognitionEvent extends Event {
  readonly resultIndex?: number;
  readonly results: {
    readonly length: number;
    [index: number]: BrowserRecognitionResult;
  };
}

interface BrowserRecognitionErrorEvent extends Event {
  readonly error?: string;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: BrowserRecognitionEvent) => void) | null;
  onerror: ((event: BrowserRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface RecognitionConstructor {
  new(): BrowserSpeechRecognition;
}

type SpeechWindow = Window & typeof globalThis & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

interface FinalRecognition {
  transcript: string;
  alternatives: readonly string[];
  confidence: number | null;
}

interface BrowserRecognizerCallbacks {
  onPartial: (transcript: string) => void;
  onFinal: (result: FinalRecognition) => void;
  onFailure: (reason: IncantationFailureReason, message: string, fatal: boolean) => void;
  onState: (state: IncantationChannelState, message: string) => void;
}

const failureMessage = (reason: string): string => {
  if (reason === 'not-allowed' || reason === 'service-not-allowed') return '麦克风权限被拒绝 · 已切换念写';
  if (reason === 'audio-capture') return '无法访问麦克风 · 已切换念写';
  if (reason === 'network') return '浏览器语音服务网络异常';
  if (reason === 'no-speech') return '没有检测到语音';
  return '语音识别暂时不可用';
};

const publicReason = (reason: string): IncantationFailureReason => {
  if (reason === 'not-allowed' || reason === 'service-not-allowed') return 'permission';
  if (reason === 'audio-capture') return 'audio-capture';
  if (reason === 'network') return 'network';
  if (reason === 'no-speech') return 'no-speech';
  return 'unknown';
};

export class BrowserWordRecognizer {
  private recognition?: BrowserSpeechRecognition;
  private restartId?: number;
  private shouldListen = false;
  private failures = 0;
  private destroyed = false;
  private lastFinalTranscript = '';
  private lastFinalAt = 0;

  constructor(
    private readonly language: string,
    private readonly continuous: boolean,
    private readonly callbacks: BrowserRecognizerCallbacks,
  ) {}

  get supported(): boolean {
    return Boolean(this.constructorForBrowser());
  }

  get listening(): boolean {
    return this.shouldListen;
  }

  start(): boolean {
    if (this.destroyed || this.shouldListen) return this.supported;
    if (!this.supported) {
      this.callbacks.onFailure('unsupported', '当前浏览器不支持语音识别 · 请使用念写', true);
      this.callbacks.onState('fallback', '浏览器不支持语音识别 · 念写仍可使用');
      return false;
    }
    this.shouldListen = true;
    this.failures = 0;
    this.begin();
    return true;
  }

  stop(): void {
    this.shouldListen = false;
    if (this.restartId !== undefined) window.clearTimeout(this.restartId);
    this.restartId = undefined;
    const recognition = this.recognition;
    this.recognition = undefined;
    if (recognition) {
      this.detach(recognition);
      try {
        recognition.abort();
      } catch {
        // Some engines throw when abort is called between recognition sessions.
      }
    }
    if (!this.destroyed) this.callbacks.onState('idle', '言灵已收束');
  }

  destroy(): void {
    this.destroyed = true;
    this.stop();
  }

  private begin(): void {
    if (!this.shouldListen || this.recognition || this.destroyed) return;
    const Recognition = this.constructorForBrowser();
    if (!Recognition) {
      this.shouldListen = false;
      this.callbacks.onFailure('unsupported', '当前浏览器不支持语音识别 · 请使用念写', true);
      this.callbacks.onState('fallback', '浏览器不支持语音识别 · 念写仍可使用');
      return;
    }

    const recognition = new Recognition();
    this.recognition = recognition;
    recognition.lang = this.language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.onstart = () => this.callbacks.onState('listening', 'Browser 持续聆听中');
    recognition.onresult = (event) => this.handleResult(event);
    recognition.onerror = (event) => this.handleError(event.error ?? 'unknown');
    recognition.onend = () => this.handleEnd(recognition);
    this.callbacks.onState('connecting', '正在连接浏览器语音识别');
    try {
      recognition.start();
    } catch {
      this.handleError('unknown');
      this.handleEnd(recognition);
    }
  }

  private handleResult(event: BrowserRecognitionEvent): void {
    for (let index = event.resultIndex ?? 0; index < event.results.length; index += 1) {
      const recognitionResult = event.results[index];
      const alternatives = Array.from(
        { length: recognitionResult?.length ?? 0 },
        (_, alternativeIndex) => recognitionResult[alternativeIndex],
      ).filter(Boolean);
      const best = alternatives[0];
      const transcript = best?.transcript.trim() ?? '';
      if (!transcript) continue;
      if (recognitionResult.isFinal === false) {
        this.callbacks.onPartial(transcript);
        continue;
      }

      const now = performance.now();
      if (transcript === this.lastFinalTranscript && now - this.lastFinalAt < 800) continue;
      this.lastFinalTranscript = transcript;
      this.lastFinalAt = now;
      this.failures = 0;
      this.callbacks.onFinal({
        transcript,
        alternatives: alternatives.slice(1).map((item) => item.transcript.trim()).filter(Boolean),
        confidence: Number.isFinite(best.confidence) ? best.confidence : null,
      });
      if (!this.continuous) {
        this.shouldListen = false;
        try {
          this.recognition?.stop();
        } catch {
          // The final result may already have closed the browser session.
        }
      }
    }
  }

  private handleError(reason: string): void {
    if (reason === 'aborted' && !this.shouldListen) return;
    const fatal = ['not-allowed', 'service-not-allowed', 'audio-capture'].includes(reason);
    if (fatal) this.shouldListen = false;
    else this.failures += 1;
    if (this.failures >= 3) this.shouldListen = false;
    this.callbacks.onFailure(publicReason(reason), failureMessage(reason), fatal || this.failures >= 3);
    if (!this.shouldListen) {
      this.callbacks.onState('fallback', `${failureMessage(reason)} · 念写仍可使用`);
    } else {
      this.callbacks.onState('reconnecting', `未听清 · ${this.failures}/3 次重试`);
    }
  }

  private handleEnd(recognition: BrowserSpeechRecognition): void {
    if (this.recognition !== recognition) return;
    this.detach(recognition);
    this.recognition = undefined;
    if (!this.shouldListen || this.destroyed) {
      if (!this.destroyed && this.failures === 0) this.callbacks.onState('idle', '言灵待命');
      return;
    }
    const delay = Math.min(4_000, this.failures > 0 ? 500 * 2 ** (this.failures - 1) : 350);
    this.restartId = window.setTimeout(() => {
      this.restartId = undefined;
      this.begin();
    }, delay);
  }

  private detach(recognition: BrowserSpeechRecognition): void {
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
  }

  private constructorForBrowser(): RecognitionConstructor | undefined {
    if (typeof window === 'undefined') return undefined;
    const speechWindow = window as SpeechWindow;
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  }
}
