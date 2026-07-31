import type {
  IncantationRecognizer,
  IncantationRecognizerCallbacks,
} from './types';

const ARK_AUDIO_MODEL = 'doubao-seed-2-0-lite-260428';

interface RecorderStopResult {
  tempFilePath?: string;
}

interface RecorderError {
  errMsg?: string;
  errorCode?: number;
  errorType?: string;
}

interface DouyinRecorderManager {
  onStart(callback: () => void): void;
  onStop(callback: (result: RecorderStopResult) => void): void;
  onError(callback: (error: RecorderError) => void): void;
  start(options: { format: 'aac' }): void;
  stop(): void;
}

interface DouyinBridge {
  getRecorderManager(): DouyinRecorderManager;
  callAIChatCompletion(options: {
    type: 'audio';
    stream: false;
    model: string;
    messages: Array<{
      role: 'user';
      content: Array<
        | { type: 'text'; text: string }
        | {
            type: 'input_audio';
            input_audio: { path: string };
          }
      >;
    }>;
    success?: (result: { data?: string }) => void;
    fail?: (error: RecorderError) => void;
    complete?: () => void;
  }): void;
}

type DouyinWindow = Window & typeof globalThis & {
  tt?: DouyinBridge;
};

function bridge(): DouyinBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  const candidate = (window as DouyinWindow).tt;
  if (
    typeof candidate?.getRecorderManager !== 'function'
    || typeof candidate.callAIChatCompletion !== 'function'
  ) {
    return undefined;
  }
  return candidate;
}

function cleanTranscript(value: string): string {
  let transcript = value.trim().replace(/^```(?:text)?\s*/i, '').replace(/\s*```$/, '');
  const pairedQuotes =
    (transcript.startsWith('"') && transcript.endsWith('"'))
    || (transcript.startsWith('“') && transcript.endsWith('”'))
    || (transcript.startsWith("'") && transcript.endsWith("'"));
  if (pairedQuotes) transcript = transcript.slice(1, -1).trim();
  return transcript.replace(/\s+/g, ' ').slice(0, 240);
}

export class DouyinWordRecognizer implements IncantationRecognizer {
  readonly provider = 'volcengine' as const;
  private recorder?: DouyinRecorderManager;
  private active = false;
  private permissionPending = false;
  private shouldSubmit = false;
  private destroyed = false;
  private requestInFlight = false;
  private session = 0;

  constructor(
    private readonly language: string,
    private readonly callbacks: IncantationRecognizerCallbacks,
  ) {}

  get supported(): boolean {
    return Boolean(bridge());
  }

  get listening(): boolean {
    return this.active;
  }

  get requestingPermission(): boolean {
    return this.permissionPending;
  }

  start(): boolean {
    if (this.destroyed || this.active || this.requestInFlight) return this.supported;
    const platform = bridge();
    if (!platform) return false;

    const session = ++this.session;
    const recorder = platform.getRecorderManager();
    this.recorder = recorder;
    this.active = true;
    this.permissionPending = true;
    this.shouldSubmit = false;
    recorder.onStart(() => {
      if (!this.isCurrent(session, recorder)) return;
      this.permissionPending = false;
      this.callbacks.onState('listening', '火山语音正在聆听');
    });
    recorder.onStop((result) => {
      if (!this.isCurrent(session, recorder)) return;
      this.recorder = undefined;
      this.active = false;
      this.permissionPending = false;
      if (!this.shouldSubmit || !result.tempFilePath) {
        if (!this.destroyed) this.callbacks.onState('idle', '言灵已收束');
        return;
      }
      this.shouldSubmit = false;
      this.transcribe(platform, result.tempFilePath, session);
    });
    recorder.onError((error) => {
      if (!this.isCurrent(session, recorder)) return;
      this.recorder = undefined;
      this.active = false;
      this.permissionPending = false;
      this.shouldSubmit = false;
      this.callbacks.onFailure(
        'audio-capture',
        error.errMsg || '互动空间无法启动麦克风',
        true,
      );
      this.callbacks.onState('fallback', '麦克风不可用 · 请使用文字输入');
    });

    this.callbacks.onState('connecting', '正在启动火山语音…');
    try {
      recorder.start({ format: 'aac' });
      return true;
    } catch {
      this.recorder = undefined;
      this.active = false;
      this.permissionPending = false;
      this.callbacks.onFailure('audio-capture', '互动空间无法启动麦克风', true);
      this.callbacks.onState('fallback', '麦克风不可用 · 请使用文字输入');
      return false;
    }
  }

  finish(): void {
    if (this.destroyed || !this.active || !this.recorder) return;
    this.shouldSubmit = true;
    this.callbacks.onState('processing', '正在提交火山语音识别');
    try {
      this.recorder.stop();
    } catch {
      this.shouldSubmit = false;
      this.active = false;
      this.permissionPending = false;
      this.recorder = undefined;
      this.callbacks.onFailure('unknown', '录音没有成功结束', false);
      this.callbacks.onState('idle', '言灵待命');
    }
  }

  cancel(): void {
    this.session += 1;
    this.shouldSubmit = false;
    this.requestInFlight = false;
    this.permissionPending = false;
    const recorder = this.recorder;
    this.recorder = undefined;
    this.active = false;
    try {
      recorder?.stop();
    } catch {
      // The host may already have closed the recorder.
    }
    if (!this.destroyed) this.callbacks.onState('idle', '言灵已收束');
  }

  stop(): void {
    this.cancel();
  }

  destroy(): void {
    this.destroyed = true;
    this.cancel();
  }

  private transcribe(
    platform: DouyinBridge,
    tempFilePath: string,
    session: number,
  ): void {
    this.requestInFlight = true;
    this.callbacks.onState('transcribing', '火山模型正在辨认言灵…');
    platform.callAIChatCompletion({
      type: 'audio',
      stream: false,
      model: ARK_AUDIO_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `Transcribe only the English words spoken in this ${this.language} audio. `
                + 'Return the exact transcript only, with no explanation, labels, or markdown.',
            },
            {
              type: 'input_audio',
              input_audio: { path: tempFilePath },
            },
          ],
        },
      ],
      success: (result) => {
        if (this.destroyed || session !== this.session) return;
        const transcript = cleanTranscript(String(result.data ?? ''));
        if (!transcript) {
          this.callbacks.onFailure('no-speech', '没有听到清晰的英语', false);
          this.callbacks.onState('idle', '言灵待命');
          return;
        }
        this.callbacks.onFinal({
          transcript,
          alternatives: [],
          confidence: null,
        });
      },
      fail: (error) => {
        if (this.destroyed || session !== this.session) return;
        this.callbacks.onFailure(
          'network',
          error.errMsg || '火山语音识别暂时不可用',
          false,
        );
        this.callbacks.onState('idle', '言灵待命');
      },
      complete: () => {
        if (session === this.session) this.requestInFlight = false;
      },
    });
  }

  private isCurrent(
    session: number,
    recorder: DouyinRecorderManager,
  ): boolean {
    return !this.destroyed && session === this.session && this.recorder === recorder;
  }
}
