import type {
  IncantationFailureReason,
  IncantationRecognizer,
  IncantationRecognizerCallbacks,
  IncantationRecognizerFactory,
} from "../../incantation-voice-kit/src/types";

const TARGET_SAMPLE_RATE = 16_000;
const MIN_AUDIO_SECONDS = 0.18;
const MIN_SIGNAL_RMS = 0.0025;
const MICROPHONE_PERMISSION_TIMEOUT_MS = 12_000;
const TRANSCRIPTION_TIMEOUT_MS = 20_000;

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

interface TranscriptionResponse {
  transcript?: string;
  error?: string;
}

function audioContextConstructor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
}

function recognitionError(error: unknown): {
  reason: IncantationFailureReason;
  message: string;
  fatal: boolean;
} {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return {
      reason: "permission",
      message: "麦克风权限未开启 · 请使用文字输入",
      fatal: true,
    };
  }
  if (name === "NotFoundError" || name === "NotReadableError") {
    return {
      reason: "audio-capture",
      message: "无法访问麦克风 · 请检查设备或使用文字输入",
      fatal: true,
    };
  }
  return {
    reason: "unknown",
    message: "麦克风没有成功启动 · 请再试一次",
    fatal: false,
  };
}

function totalSamples(chunks: readonly Float32Array[]): number {
  return chunks.reduce((total, chunk) => total + chunk.length, 0);
}

function signalRms(chunks: readonly Float32Array[]): number {
  let sum = 0;
  let count = 0;
  for (const chunk of chunks) {
    for (const sample of chunk) {
      sum += sample * sample;
      count += 1;
    }
  }
  return count > 0 ? Math.sqrt(sum / count) : 0;
}

function flatten(chunks: readonly Float32Array[]): Float32Array {
  const merged = new Float32Array(totalSamples(chunks));
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function downsample(
  input: Float32Array,
  inputRate: number,
  outputRate: number,
): Float32Array {
  if (inputRate <= outputRate) return input;
  const ratio = inputRate / outputRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);
  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const start = Math.floor(outputIndex * ratio);
    const end = Math.min(input.length, Math.floor((outputIndex + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let inputIndex = start; inputIndex < end; inputIndex += 1) {
      sum += input[inputIndex];
      count += 1;
    }
    output[outputIndex] = count > 0 ? sum / count : input[start] ?? 0;
  }
  return output;
}

export function encodePcm16Wav(
  chunks: readonly Float32Array[],
  inputSampleRate: number,
): Uint8Array {
  const samples = downsample(
    flatten(chunks),
    inputSampleRate,
    TARGET_SAMPLE_RATE,
  );
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const writeAscii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, TARGET_SAMPLE_RATE, true);
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(
      44 + index * 2,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true,
    );
  }
  return bytes;
}

class ArkWordRecognizer implements IncantationRecognizer {
  readonly provider = "volcengine" as const;
  private holding = false;
  private permissionPending = false;
  private finishRequested = false;
  private destroyed = false;
  private requestInFlight = false;
  private session = 0;
  private chunks: Float32Array[] = [];
  private stream?: MediaStream;
  private context?: AudioContext;
  private source?: MediaStreamAudioSourceNode;
  private processor?: ScriptProcessorNode;
  private silentGain?: GainNode;
  private abortController?: AbortController;
  private permissionTimeoutId?: number;

  constructor(
    private readonly language: string,
    private readonly callbacks: IncantationRecognizerCallbacks,
  ) {}

  get supported(): boolean {
    return (
      typeof navigator !== "undefined"
      && typeof navigator.mediaDevices?.getUserMedia === "function"
      && Boolean(audioContextConstructor())
    );
  }

  get listening(): boolean {
    return this.holding;
  }

  get requestingPermission(): boolean {
    return this.permissionPending;
  }

  start(): boolean {
    if (this.destroyed || this.holding || this.requestInFlight) return false;
    if (!this.supported) {
      this.callbacks.onFailure(
        "unsupported",
        "当前浏览器无法录音 · 请使用文字输入",
        true,
      );
      this.callbacks.onState("fallback", "当前浏览器无法录音 · 请使用文字输入");
      return false;
    }

    const session = ++this.session;
    this.holding = true;
    this.permissionPending = true;
    this.finishRequested = false;
    this.chunks = [];
    this.callbacks.onState("connecting", "正在启动麦克风…");
    this.permissionTimeoutId = window.setTimeout(
      () => this.handlePermissionTimeout(session),
      MICROPHONE_PERMISSION_TIMEOUT_MS,
    );
    void this.openMicrophone(session);
    return true;
  }

  finish(): void {
    if (this.destroyed || !this.holding) return;
    this.holding = false;
    this.finishRequested = true;
    this.callbacks.onState("processing", "正在结束本次言灵…");
    if (!this.permissionPending) this.submitCapture(this.session);
  }

  cancel(): void {
    this.session += 1;
    this.holding = false;
    this.permissionPending = false;
    this.finishRequested = false;
    this.requestInFlight = false;
    this.abortController?.abort();
    this.abortController = undefined;
    this.clearPermissionTimeout();
    this.chunks = [];
    this.closeCapture();
    if (!this.destroyed) this.callbacks.onState("idle", "言灵已收束");
  }

  stop(): void {
    this.cancel();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cancel();
  }

  private async openMicrophone(session: number): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (this.destroyed || session !== this.session) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      this.clearPermissionTimeout();
      this.permissionPending = false;
      if (!this.holding && this.finishRequested) {
        stream.getTracks().forEach((track) => track.stop());
        this.finishRequested = false;
        this.callbacks.onFailure("no-speech", "没有听到清晰的英语", false);
        this.callbacks.onState("idle", "言灵待命");
        return;
      }

      const Context = audioContextConstructor();
      if (!Context) throw new Error("AudioContext unavailable");
      const context = new Context();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const silentGain = context.createGain();
      silentGain.gain.value = 0;
      processor.onaudioprocess = (event) => {
        if (!this.holding || session !== this.session) return;
        this.chunks.push(
          new Float32Array(event.inputBuffer.getChannelData(0)),
        );
      };
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(context.destination);
      this.stream = stream;
      this.context = context;
      this.source = source;
      this.processor = processor;
      this.silentGain = silentGain;
      await context.resume();
      if (this.destroyed || session !== this.session) {
        this.closeCapture();
        return;
      }
      this.callbacks.onState("listening", "火山语音正在聆听");
    } catch (error) {
      if (this.destroyed || session !== this.session) return;
      this.clearPermissionTimeout();
      this.permissionPending = false;
      this.holding = false;
      this.finishRequested = false;
      this.closeCapture();
      const failure = recognitionError(error);
      this.callbacks.onFailure(
        failure.reason,
        failure.message,
        failure.fatal,
      );
      this.callbacks.onState(
        failure.fatal ? "fallback" : "idle",
        failure.message,
      );
    }
  }

  private submitCapture(session: number): void {
    if (this.destroyed || session !== this.session) return;
    this.finishRequested = false;
    const chunks = this.chunks;
    const sampleRate = this.context?.sampleRate ?? TARGET_SAMPLE_RATE;
    this.chunks = [];
    this.closeCapture();

    const duration = totalSamples(chunks) / Math.max(1, sampleRate);
    if (duration < MIN_AUDIO_SECONDS || signalRms(chunks) < MIN_SIGNAL_RMS) {
      this.callbacks.onFailure("no-speech", "没有听到清晰的英语", false);
      this.callbacks.onState("idle", "言灵待命");
      return;
    }
    void this.transcribe(chunks, sampleRate, session);
  }

  private async transcribe(
    chunks: readonly Float32Array[],
    sampleRate: number,
    session: number,
  ): Promise<void> {
    this.requestInFlight = true;
    this.callbacks.onState("transcribing", "火山模型正在辨认言灵…");
    const abortController = new AbortController();
    this.abortController = abortController;
    const timeoutId = window.setTimeout(
      () => abortController.abort(),
      TRANSCRIPTION_TIMEOUT_MS,
    );

    try {
      const wav = encodePcm16Wav(chunks, sampleRate);
      const form = new FormData();
      form.append(
        "audio",
        new Blob([Uint8Array.from(wav)], { type: "audio/wav" }),
        "incantation.wav",
      );
      form.append("language", this.language);
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: form,
        signal: abortController.signal,
      });
      const payload = await response.json() as TranscriptionResponse;
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      const transcript = String(payload.transcript ?? "").trim();
      if (!transcript) {
        this.callbacks.onFailure("no-speech", "没有听到清晰的英语", false);
        this.callbacks.onState("idle", "言灵待命");
        return;
      }
      if (this.destroyed || session !== this.session) return;
      this.callbacks.onFinal({
        transcript,
        alternatives: [],
        confidence: null,
      });
    } catch (error) {
      if (this.destroyed || session !== this.session) return;
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      this.callbacks.onFailure(
        "network",
        timedOut
          ? "火山语音识别超时 · 请再试一次"
          : "火山语音识别暂时不可用 · 请再试一次",
        false,
      );
      this.callbacks.onState("idle", "言灵待命");
    } finally {
      window.clearTimeout(timeoutId);
      if (session === this.session) {
        this.requestInFlight = false;
        this.abortController = undefined;
      }
    }
  }

  private handlePermissionTimeout(session: number): void {
    if (
      this.destroyed
      || session !== this.session
      || !this.permissionPending
    ) {
      return;
    }
    this.permissionTimeoutId = undefined;
    this.session += 1;
    this.holding = false;
    this.permissionPending = false;
    this.finishRequested = false;
    this.chunks = [];
    this.closeCapture();
    const message = "麦克风授权等待超时 · 请允许权限或使用文字输入";
    this.callbacks.onFailure("permission", message, true);
    this.callbacks.onState("fallback", message);
  }

  private clearPermissionTimeout(): void {
    if (this.permissionTimeoutId === undefined) return;
    window.clearTimeout(this.permissionTimeoutId);
    this.permissionTimeoutId = undefined;
  }

  private closeCapture(): void {
    if (this.processor) this.processor.onaudioprocess = null;
    try {
      this.source?.disconnect();
      this.processor?.disconnect();
      this.silentGain?.disconnect();
    } catch {
      // Audio nodes may already have disconnected during page suspension.
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    const context = this.context;
    this.stream = undefined;
    this.source = undefined;
    this.processor = undefined;
    this.silentGain = undefined;
    this.context = undefined;
    if (context && context.state !== "closed") {
      void context.close().catch(() => undefined);
    }
  }
}

export const createArkRecognizer: IncantationRecognizerFactory = (
  language,
  _continuous,
  callbacks,
) => new ArkWordRecognizer(language, callbacks);
