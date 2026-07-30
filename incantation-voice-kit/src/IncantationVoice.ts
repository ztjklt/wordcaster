import { IncantationAudio } from './audio';
import { playWordFlash, prefersReducedMotion } from './effects';
import {
  assertValidWords,
  resolveSpeechAlternatives,
  resolveSpokenWord,
} from './matcher';
import { BrowserWordRecognizer } from './recognizer';
import type {
  IncantationCandidateResult,
  IncantationChannelState,
  IncantationFailureReason,
  IncantationFeedback,
  IncantationMatchResult,
  IncantationNoMatchResult,
  IncantationProvider,
  IncantationStateChange,
  IncantationVoiceInstance,
  IncantationVoiceOptions,
  IncantationWord,
} from './types';

const failureCopy: Record<string, string> = {
  unknown: '没有识别到词库中的完整单词 · 再试一次',
  ambiguous: '一次只读一个单词 · 当前结果存在歧义',
  spelling: '请直接朗读完整单词 · 不需要逐字母拼读',
  permission: '麦克风权限被拒绝 · 请使用念写',
  unsupported: '当前浏览器不支持语音识别 · 请使用念写',
  'no-speech': '没有检测到语音 · 请再试一次',
  network: '浏览器语音服务网络异常 · 请使用念写',
  'audio-capture': '无法访问麦克风 · 请检查设备或使用念写',
  stopped: '言灵已收束',
};

const randomId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ivk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const resolveTarget = (target: HTMLElement | string): HTMLElement => {
  if (typeof target !== 'string') return target;
  const element = document.querySelector<HTMLElement>(target);
  if (!element) throw new Error(`找不到言灵挂载目标: ${target}`);
  return element;
};

const clampVolume = (volume: number): number =>
  Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 1;

export class IncantationVoice implements IncantationVoiceInstance {
  private readonly root: HTMLElement;
  private readonly host: HTMLElement;
  private readonly recognizer: BrowserWordRecognizer;
  private readonly audio: IncantationAudio;
  private readonly options: IncantationVoiceOptions;
  private words: IncantationWord[];
  private latestMatch?: IncantationMatchResult;
  private clearId?: number;
  private destroyed = false;
  private provider: IncantationProvider = 'browser';
  private permissionState: 'unknown' | 'requesting' | 'granted' | 'denied' = 'unknown';
  private permissionAttempt = 0;
  private holdTimeout?: number;

  constructor(options: IncantationVoiceOptions) {
    if (typeof document === 'undefined') {
      throw new Error('incantation-voice-kit 需要浏览器 DOM 环境');
    }
    this.options = options;
    this.words = [...options.words];
    assertValidWords(this.words);
    this.host = resolveTarget(options.target);
    this.audio = new IncantationAudio(clampVolume(options.volume ?? 1));
    this.root = this.createRoot();
    this.host.append(this.root);
    this.recognizer = new BrowserWordRecognizer(
      options.language ?? 'en-US',
      false,
      {
        onPartial: (transcript) => this.handlePartial(transcript),
        onFinal: (result) => this.handleFinal(
          result.transcript,
          result.alternatives,
          result.confidence,
          'browser',
        ),
        onFailure: (reason, message, fatal) => this.handleRecognitionFailure(reason, message, fatal),
        onState: (state, message) => this.handleRecognizerState(state, message),
      },
    );
    this.provider = this.recognizer.supported ? 'browser' : 'text';
    this.bind();
    this.setChannel(this.recognizer.supported ? 'BROWSER' : 'TEXT');
    if (!this.recognizer.supported) {
      this.notifyState('fallback', '浏览器不支持语音识别 · 念写仍可使用', 'text');
      this.show('言灵待命', '浏览器不支持语音识别 · 请使用念写');
    }
  }

  get browserSupported(): boolean {
    return this.recognizer.supported;
  }

  get isListening(): boolean {
    return this.recognizer.listening;
  }

  get isRequestingPermission(): boolean {
    return this.permissionState === 'requesting';
  }

  beginHold(): void {
    if (this.destroyed || this.recognizer.listening || this.permissionState === 'requesting') return;
    if (
      this.permissionState !== 'granted'
      && typeof navigator.mediaDevices?.getUserMedia === 'function'
    ) {
      const attempt = ++this.permissionAttempt;
      this.permissionState = 'requesting';
      this.audio.playCue('on');
      this.notifyState('connecting', '正在请求麦克风权限 · 授权后请再次按住');
      void navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        if (this.destroyed || attempt !== this.permissionAttempt) return;
        this.permissionState = 'granted';
        this.notifyState('idle', '麦克风已启用 · 请再次按住施法');
      }).catch(() => {
        if (this.destroyed || attempt !== this.permissionAttempt) return;
        this.permissionState = 'denied';
        this.provider = 'text';
        this.notifyState('fallback', '麦克风权限未开启 · 请使用文字输入', 'text');
        this.playFailure('permission');
      });
      return;
    }
    this.permissionState = 'granted';
    this.start();
    if (this.recognizer.listening) {
      this.holdTimeout = window.setTimeout(() => this.finishHold(), 8_000);
    }
  }

  finishHold(): void {
    if (this.destroyed || this.permissionState === 'requesting') return;
    if (this.holdTimeout !== undefined) window.clearTimeout(this.holdTimeout);
    this.holdTimeout = undefined;
    if (!this.recognizer.listening) return;
    this.recognizer.finish();
    this.root.classList.remove('ivk-listening', 'ivk-transcribing');
    this.setIncantLabel('言灵');
  }

  cancel(): void {
    this.permissionAttempt += 1;
    if (this.permissionState === 'requesting') this.permissionState = 'unknown';
    if (this.holdTimeout !== undefined) window.clearTimeout(this.holdTimeout);
    this.holdTimeout = undefined;
    this.recognizer.cancel();
    this.root.classList.remove('ivk-listening', 'ivk-transcribing');
    this.setIncantLabel('言灵');
  }

  start(): void {
    if (this.destroyed || this.recognizer.listening) return;
    this.clearFeedback();
    this.audio.playCue('on');
    const started = this.recognizer.start();
    if (started) {
      this.provider = 'browser';
      this.root.classList.add('ivk-listening');
      this.setIncantLabel('收束');
    } else {
      this.provider = 'text';
      this.openWriteTray();
    }
  }

  stop(): void {
    this.cancel();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.holdTimeout !== undefined) window.clearTimeout(this.holdTimeout);
    this.recognizer.destroy();
    this.audio.close();
    if (this.clearId !== undefined) window.clearTimeout(this.clearId);
    window.removeEventListener('keydown', this.keydown);
    this.root.remove();
    navigator.vibrate?.(0);
    this.options.onStateChange?.({
      state: 'destroyed',
      provider: this.provider,
      message: '言灵组件已销毁',
    });
  }

  submitText(transcript: string): void {
    if (this.destroyed || !transcript.trim()) return;
    this.provider = 'text';
    this.handleFinal(transcript.trim(), [], 1, 'text');
  }

  setWords(words: readonly IncantationWord[]): void {
    assertValidWords(words);
    this.words = [...words];
    this.latestMatch = undefined;
    this.options.onCandidate?.({
      transcript: '',
      normalizedTranscript: '',
    });
  }

  setVolume(volume: number): void {
    this.audio.setVolume(volume);
  }

  playSuccess(result?: IncantationMatchResult | IncantationFeedback | string): void {
    if (this.destroyed) return;
    const feedback =
      result && typeof result === 'object' && !('utteranceId' in result)
        ? result as IncantationFeedback
        : undefined;
    const match: IncantationMatchResult | undefined = typeof result === 'string'
      ? this.latestMatch?.word.id === result
        ? this.latestMatch
        : undefined
      : feedback
        ? undefined
        : result as IncantationMatchResult | undefined ?? this.latestMatch;
    const word = match?.word
      ?? (feedback?.wordId
        ? this.words.find((entry) => entry.id === feedback.wordId)
        : undefined);
    this.clearFeedback();
    this.root.classList.remove('ivk-failed', 'ivk-processing');
    this.root.classList.add('ivk-succeeded');
    const color = feedback?.color ?? word?.color;
    if (color) this.root.style.setProperty('--ivk-accent', color);
    this.text('.ivk-substatus', word
      ? `${word.word.toUpperCase()} · 言灵生效`
      : feedback?.label ?? '言灵生效 · 项目已经响应');
    this.spawnSparks();
    this.audio.playCue('success');
    const soundProfile = feedback?.soundProfile ?? word?.soundProfile;
    if (soundProfile) this.audio.playWord(word?.id ?? feedback?.wordId ?? 'word-caster', soundProfile);
    playWordFlash(this.host, {
      color: color ?? this.options.accentColor,
      durationMs: 920,
      reducedMotion: this.options.reducedMotion,
    });
    if (this.options.haptics && !this.reducedMotion()) navigator.vibrate?.(25);
    this.clearId = window.setTimeout(() => {
      this.root.classList.remove('ivk-succeeded');
      this.resetAccent();
      this.show(
        '言灵待命',
        this.recognizer.listening ? '持续聆听中 · 直接说出英语' : '点击下方「言灵」开始聆听',
      );
    }, 2_400);
  }

  playFailure(reason: IncantationFailureReason = 'unknown'): void {
    if (this.destroyed) return;
    this.clearFeedback();
    this.root.classList.remove('ivk-succeeded', 'ivk-processing');
    this.root.classList.add('ivk-failed');
    this.text('.ivk-substatus', failureCopy[reason] ?? '言灵未能生效 · 再试一次');
    this.audio.playCue('fail');
    this.clearId = window.setTimeout(() => {
      this.root.classList.remove('ivk-failed');
      this.resetAccent();
    }, this.reducedMotion() ? 120 : 560);
  }

  private createRoot(): HTMLElement {
    const root = document.createElement('section');
    root.className = `ivk-root${this.options.renderUI === false ? ' ivk-headless' : ''}`;
    root.setAttribute('aria-label', '言灵语音识别');
    root.style.setProperty('--ivk-accent', this.options.accentColor ?? '#63f0d4');
    root.innerHTML = `
      <div class="ivk-words">
        <div class="ivk-meta">
          <span class="ivk-channel"><i></i><b>OFF</b></span>
          <span class="ivk-system-label">INCANTATION LINK</span>
        </div>
        <p class="ivk-live">言灵待命</p>
        <p class="ivk-substatus">点击下方「言灵」开始聆听</p>
        <div class="ivk-listening-wave" aria-hidden="true">
          ${Array.from({ length: 9 }, (_, index) => `<i style="--ivk-bar-index:${index}"></i>`).join('')}
        </div>
        <div class="ivk-success-rings" aria-hidden="true"><i></i><i></i></div>
        <div class="ivk-sparks" aria-hidden="true"></div>
      </div>
      <span class="ivk-announcer" aria-live="polite" aria-atomic="true"></span>
      <div class="ivk-actions">
        <button class="ivk-incant-button" type="button" aria-label="开启或关闭持续语音识别">
          <i class="ivk-action-glyph" aria-hidden="true"><b></b><b></b></i>
          <span>言灵<small>L</small></span>
        </button>
        <button class="ivk-write-button" type="button" aria-label="开启文字输入">
          <i class="ivk-action-glyph ivk-write-glyph" aria-hidden="true">⌁</i>
          <span>念写<small>N</small></span>
        </button>
      </div>
      <form class="ivk-write-tray">
        <span class="ivk-write-prefix" aria-hidden="true">念写</span>
        <input maxlength="160" autocomplete="off" aria-label="手动输入英语言灵"
          placeholder="写下一个词库单词，例如 apple">
        <button type="submit"><span>执行</span><i aria-hidden="true">→</i></button>
      </form>
    `;
    if (this.options.renderUI === false) {
      root.querySelector('.ivk-actions')?.remove();
      root.querySelector('.ivk-write-tray')?.remove();
    }
    return root;
  }

  private bind(): void {
    this.root.querySelector('.ivk-incant-button')?.addEventListener('click', this.toggleVoice);
    this.root.querySelector('.ivk-write-button')?.addEventListener('click', this.toggleWrite);
    this.root.querySelector('form')?.addEventListener('submit', this.submitForm);
    if (this.options.shortcuts !== false) window.addEventListener('keydown', this.keydown);
  }

  private toggleVoice = (): void => {
    if (this.recognizer.listening) this.stop();
    else this.start();
  };

  private toggleWrite = (): void => {
    if (this.root.classList.contains('ivk-writing')) {
      this.closeWriteTray();
    } else {
      this.openWriteTray();
    }
  };

  private openWriteTray(): void {
    this.root.classList.add('ivk-writing');
    const input = this.root.querySelector<HTMLInputElement>('input');
    window.setTimeout(() => input?.focus(), 100);
  }

  private closeWriteTray(): void {
    this.root.classList.remove('ivk-writing');
    this.root.querySelector<HTMLInputElement>('input')?.blur();
  }

  private submitForm = (event: Event): void => {
    event.preventDefault();
    const input = this.root.querySelector<HTMLInputElement>('input');
    if (!input?.value.trim()) return;
    this.submitText(input.value);
    input.value = '';
    this.closeWriteTray();
  };

  private keydown = (event: KeyboardEvent): void => {
    if ((event.target as HTMLElement | null)?.tagName === 'INPUT') return;
    if (event.code === 'KeyL') this.toggleVoice();
    if (event.code === 'KeyN') this.toggleWrite();
    if (event.code === 'Escape') this.closeWriteTray();
  };

  private handlePartial(transcript: string): void {
    if (this.destroyed) return;
    this.renderWords(transcript, true);
    const match = resolveSpokenWord(transcript, this.words, false);
    const candidate = match.candidateWordId
      ? this.words.find((word) => word.id === match.candidateWordId)
      : undefined;
    if (candidate?.color) this.root.style.setProperty('--ivk-accent', candidate.color);
    else this.resetAccent();
    const result: IncantationCandidateResult = {
      transcript,
      normalizedTranscript: match.normalizedInput,
      word: candidate,
    };
    this.options.onCandidate?.(result);
    this.notifyState('transcribing', candidate
      ? `候选言灵 · ${candidate.word.toUpperCase()}`
      : '正在聆听 · 继续说');
  }

  private handleFinal(
    transcript: string,
    alternatives: readonly string[],
    confidence: number | null,
    provider: IncantationProvider,
  ): void {
    if (this.destroyed) return;
    this.provider = provider;
    this.clearFeedback();
    this.renderWords(transcript, false);
    this.text('.ivk-announcer', `你说的是：${transcript}`);
    this.audio.playCue('commit');
    this.notifyState('processing', '正在匹配词库', provider);
    this.options.onCandidate?.({
      transcript,
      normalizedTranscript: resolveSpokenWord(transcript, this.words, true).normalizedInput,
    });

    if (this.options.onFinalTranscript) {
      this.options.onFinalTranscript({
        transcript,
        alternatives,
        confidence,
        provider,
      });
      this.root.classList.add('ivk-processing');
      this.text('.ivk-substatus', '等待 Word Caster 确认执行');
      return;
    }

    const match = resolveSpeechAlternatives(transcript, alternatives, this.words);
    const word = match.wordId
      ? this.words.find((entry) => entry.id === match.wordId)
      : undefined;
    if (match.matched && word) {
      const result: IncantationMatchResult = {
        utteranceId: randomId(),
        word,
        transcript,
        normalizedTranscript: match.normalizedInput,
        confidence,
        provider,
      };
      this.latestMatch = result;
      this.options.onMatch?.(result);
      if ((this.options.feedbackMode ?? 'auto') === 'auto') this.playSuccess(result);
      else {
        this.root.classList.add('ivk-processing');
        this.text('.ivk-substatus', `${word.word.toUpperCase()} · 等待项目确认`);
      }
      return;
    }

    const reason: IncantationFailureReason = match.mode === 'ambiguous'
      ? 'ambiguous'
      : match.mode === 'spelling'
        ? 'spelling'
        : 'unknown';
    const failure: IncantationNoMatchResult = {
      utteranceId: randomId(),
      transcript,
      normalizedTranscript: match.normalizedInput,
      confidence,
      provider,
      reason,
      candidateWordIds: match.candidateWordIds,
    };
    this.options.onNoMatch?.(failure);
    this.playFailure(reason);
  }

  private handleRecognitionFailure(
    reason: IncantationFailureReason,
    message: string,
    fatal: boolean,
  ): void {
    if (this.destroyed) return;
    if (fatal) {
      this.provider = 'text';
      this.root.classList.remove('ivk-listening', 'ivk-transcribing');
      this.setChannel('TEXT');
      this.setIncantLabel('言灵');
      this.show('语音已降级', message);
      this.openWriteTray();
      const failure: IncantationNoMatchResult = {
        utteranceId: randomId(),
        transcript: '',
        normalizedTranscript: '',
        confidence: null,
        provider: 'browser',
        reason,
        candidateWordIds: [],
      };
      this.options.onNoMatch?.(failure);
      this.playFailure(reason);
      return;
    }
    this.text('.ivk-substatus', message);
  }

  private handleRecognizerState(state: IncantationChannelState, message: string): void {
    if (this.destroyed) return;
    this.root.classList.toggle('ivk-listening', state === 'listening' || state === 'transcribing');
    this.root.classList.toggle('ivk-reconnecting', state === 'reconnecting' || state === 'connecting');
    if (state === 'listening') {
      this.provider = 'browser';
      this.setChannel('BROWSER');
      this.setIncantLabel('收束');
    } else if (state === 'idle') {
      this.setIncantLabel('言灵');
    } else if (state === 'fallback') {
      this.provider = 'text';
      this.setChannel('TEXT');
      this.setIncantLabel('言灵');
    }
    this.text('.ivk-substatus', message);
    this.notifyState(state, message);
  }

  private notifyState(
    state: IncantationChannelState,
    message: string,
    provider: IncantationProvider = this.provider,
  ): void {
    const update: IncantationStateChange = { state, provider, message };
    this.options.onStateChange?.(update);
  }

  private renderWords(value: string, partial: boolean): void {
    const line = this.root.querySelector<HTMLElement>('.ivk-live');
    if (!line) return;
    const words = value.trim().split(/\s+/).filter(Boolean);
    const existing = Array.from(line.querySelectorAll<HTMLElement>('.ivk-token'));
    let stableLength = 0;
    while (
      stableLength < words.length
      && stableLength < existing.length
      && existing[stableLength].dataset.word === words[stableLength]
    ) {
      stableLength += 1;
    }
    existing.slice(stableLength).forEach((token) => token.remove());
    if (stableLength === 0 && existing.length === 0) line.replaceChildren();
    words.slice(stableLength).forEach((word, offset) => {
      const token = document.createElement('span');
      token.className = 'ivk-token';
      token.dataset.word = word;
      token.textContent = word;
      token.style.setProperty('--ivk-word-index', String(stableLength + offset));
      line.append(token);
    });
    line.classList.toggle('ivk-partial', partial);
    this.root.classList.toggle('ivk-transcribing', partial);
    this.text('.ivk-substatus', partial ? '正在聆听 · 继续说' : '正在匹配 · 让项目回应');
  }

  private spawnSparks(): void {
    const host = this.root.querySelector<HTMLElement>('.ivk-sparks');
    if (!host) return;
    const colors = ['var(--ivk-accent)', '#ffdf7f', '#b87cff', '#ffffff'];
    host.replaceChildren(...Array.from({ length: 24 }, (_, index) => {
      const spark = document.createElement('i');
      spark.style.setProperty('--ivk-spark-angle', `${index * 15 + (index % 3) * 4}deg`);
      spark.style.setProperty('--ivk-spark-distance', `${48 + (index % 5) * 12}px`);
      spark.style.setProperty('--ivk-spark-delay', `${(index % 4) * 18}ms`);
      spark.style.setProperty('--ivk-spark-size', `${2 + (index % 3) * 2}px`);
      spark.style.setProperty('--ivk-spark-color', colors[index % colors.length]);
      return spark;
    }));
  }

  private clearFeedback(): void {
    if (this.clearId !== undefined) window.clearTimeout(this.clearId);
    this.clearId = undefined;
    this.root.classList.remove('ivk-failed', 'ivk-succeeded', 'ivk-processing');
  }

  private show(main: string, sub: string): void {
    const line = this.root.querySelector<HTMLElement>('.ivk-live');
    if (line) {
      line.replaceChildren(main);
      line.classList.remove('ivk-partial');
    }
    this.text('.ivk-substatus', sub);
  }

  private text(selector: string, value: string): void {
    const element = this.root.querySelector<HTMLElement>(selector);
    if (element) element.textContent = value;
  }

  private setChannel(value: string): void {
    this.text('.ivk-channel b', value);
  }

  private setIncantLabel(value: string): void {
    const label = this.root.querySelector<HTMLElement>('.ivk-incant-button span');
    if (!label) return;
    const shortcut = document.createElement('small');
    shortcut.textContent = 'L';
    label.replaceChildren(value, shortcut);
  }

  private resetAccent(): void {
    this.root.style.setProperty('--ivk-accent', this.options.accentColor ?? '#63f0d4');
  }

  private reducedMotion(): boolean {
    return prefersReducedMotion(this.options.reducedMotion);
  }
}
