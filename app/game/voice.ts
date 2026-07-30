export type VoiceState =
  | "idle"
  | "requesting-permission"
  | "listening"
  | "processing"
  | "matched"
  | "no-match"
  | "unsupported";

export interface VoiceSnapshot {
  state: VoiceState;
  transcript: string;
  message: string;
}

interface RecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: RecognitionAlternative;
}

interface RecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    [index: number]: RecognitionResult;
  };
}

interface RecognitionErrorEvent extends Event {
  readonly error: string;
}

interface BrowserRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface BrowserRecognitionConstructor {
  new (): BrowserRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: BrowserRecognitionConstructor;
    webkitSpeechRecognition?: BrowserRecognitionConstructor;
  }
}

function errorMessage(code: string): string {
  if (code === "not-allowed" || code === "service-not-allowed") {
    return "麦克风权限被拒绝，请允许权限或使用文字输入";
  }
  if (code === "audio-capture") return "没有找到可以使用的麦克风";
  if (code === "network") return "浏览器语音服务暂时不可用";
  if (code === "no-speech") return "没有听到清晰的英语";
  if (code === "aborted") return "本次言灵已取消";
  return "语音识别没有成功，请再试一次";
}

export class PushToTalkController {
  readonly supported: boolean;
  private recognition: BrowserRecognition | null = null;
  private timeoutId: number | null = null;
  private permissionAttempt = 0;
  private permissionState:
    | "unknown"
    | "requesting"
    | "granted"
    | "denied" = "unknown";
  private transcript = "";
  private finalDelivered = false;
  private readonly onSnapshot: (snapshot: VoiceSnapshot) => void;
  private readonly onFinal: (transcript: string | null) => void;

  constructor(
    onSnapshot: (snapshot: VoiceSnapshot) => void,
    onFinal: (transcript: string | null) => void,
  ) {
    this.supported =
      typeof window !== "undefined" &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    this.onSnapshot = onSnapshot;
    this.onFinal = onFinal;
    if (!this.supported) {
      this.emit(
        "unsupported",
        "",
        "当前浏览器不支持语音识别，请使用施法魔典旁的文字输入",
      );
    }
  }

  isRequestingPermission(): boolean {
    return this.permissionState === "requesting";
  }

  startOnKeyDown(): boolean {
    if (!this.supported || this.recognition) return false;
    if (this.permissionState === "requesting") return false;
    if (
      this.permissionState !== "granted" &&
      typeof navigator.mediaDevices?.getUserMedia === "function"
    ) {
      this.requestMicrophonePermission();
      return true;
    }
    return this.startRecognition();
  }

  private requestMicrophonePermission(): void {
    const attempt = ++this.permissionAttempt;
    this.permissionState = "requesting";
    this.emit(
      "requesting-permission",
      "",
      "正在请求麦克风权限 · 授权后请再次按住 M",
    );
    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        if (
          attempt !== this.permissionAttempt ||
          this.permissionState !== "requesting"
        ) {
          return;
        }
        this.permissionState = "granted";
        this.emit(
          "idle",
          "",
          "麦克风已启用 · 请再次按住 M 说出英文",
        );
      })
      .catch(() => {
        if (attempt !== this.permissionAttempt) return;
        this.permissionState = "denied";
        this.emit(
          "unsupported",
          "",
          "麦克风权限未开启 · 可重新按 M 授权或使用文字输入",
        );
      });
  }

  private startRecognition(): boolean {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return false;
    const recognition = new Recognition();
    this.recognition = recognition;
    this.transcript = "";
    this.finalDelivered = false;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.onstart = () => {
      if (this.recognition !== recognition) return;
      this.permissionState = "granted";
      this.emit("listening", "", "正在聆听 · 松开 M 结束");
    };
    recognition.onresult = (event) => {
      if (this.recognition !== recognition) return;
      const pieces: string[] = [];
      for (let index = 0; index < event.results.length; index += 1) {
        const text = event.results[index][0]?.transcript?.trim();
        if (text) pieces.push(text);
      }
      const transcript = pieces.join(" ").trim();
      if (!transcript) return;
      this.transcript = transcript;
      const current = event.results[event.resultIndex];
      this.emit(
        current?.isFinal ? "processing" : "listening",
        transcript,
        current?.isFinal ? "正在理解言灵…" : "正在聆听 · 松开 M 结束",
      );
    };
    recognition.onerror = (event) => {
      if (this.recognition !== recognition) return;
      this.clearTimeout();
      this.recognition = null;
      this.finalDelivered = true;
      const permissionError =
        event.error === "not-allowed" ||
        event.error === "service-not-allowed";
      if (permissionError) this.permissionState = "denied";
      this.emit(
        permissionError ? "unsupported" : "no-match",
        this.transcript,
        errorMessage(event.error),
      );
    };
    recognition.onend = () => {
      if (this.recognition !== recognition) return;
      this.clearTimeout();
      this.recognition = null;
      if (this.finalDelivered) return;
      this.finalDelivered = true;
      const finalText = this.transcript.trim();
      if (finalText) {
        this.emit("processing", finalText, "正在理解言灵…");
        this.onFinal(finalText);
      } else {
        this.emit("no-match", "", "没有听到清晰的英语");
        this.onFinal(null);
      }
    };
    this.emit(
      "requesting-permission",
      "",
      "正在启动麦克风…",
    );
    this.permissionState = "requesting";
    try {
      recognition.start();
      this.timeoutId = window.setTimeout(() => this.stopRecognition(), 8_000);
      return true;
    } catch {
      this.recognition = null;
      this.emit("no-match", "", "麦克风没有成功启动");
      return false;
    }
  }

  finishOnKeyUp(): void {
    if (this.permissionState === "requesting" && !this.recognition) return;
    if (!this.recognition) return;
    this.emit("processing", this.transcript, "正在结束本次言灵…");
    this.stopRecognition();
  }

  cancel(): void {
    this.permissionAttempt += 1;
    if (this.permissionState === "requesting") {
      this.permissionState = "unknown";
    }
    this.clearTimeout();
    const recognition = this.recognition;
    this.recognition = null;
    this.finalDelivered = true;
    try {
      recognition?.abort();
    } finally {
      this.emit(
        this.supported ? "idle" : "unsupported",
        "",
        this.supported
          ? "按住 M 说出书中的英文"
          : "请使用施法魔典旁的文字输入",
      );
    }
  }

  reportMatch(
    transcript: string,
    message: string,
    matched: boolean,
  ): void {
    this.emit(matched ? "matched" : "no-match", transcript, message);
    window.setTimeout(() => {
      if (this.recognition) return;
      this.emit(
        this.supported ? "idle" : "unsupported",
        "",
        this.supported
          ? "按住 M 说出书中的英文"
          : "请使用施法魔典旁的文字输入",
      );
    }, 2_800);
  }

  private stopRecognition(): void {
    this.clearTimeout();
    try {
      this.recognition?.stop();
    } catch {
      this.cancel();
    }
  }

  private clearTimeout(): void {
    if (this.timeoutId !== null) window.clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  private emit(
    state: VoiceState,
    transcript: string,
    message: string,
  ): void {
    this.onSnapshot({ state, transcript, message });
  }
}
