import { AudioManager } from '../../audio/AudioManager';
import { SaveManager } from '../../storage/SaveManager';
import { VoiceInputController } from '../../voice/VoiceInputController';
import { providerLabel, vibrateVoiceSuccess } from '../../voice/VoiceFeedback';
import type { AIInterpretation, VoiceChannelState, VoiceUtterance } from '../../voice/VoiceTypes';
import { getArena } from '../arena/BattleContent';
import { EventBus } from '../events/EventBus';
import { GameEvents } from '../events/GameEvents';

interface VoiceSuccess {
  utteranceId?: string;
  challenge?: boolean;
}

interface VoiceFailure {
  utteranceId?: string;
  reason?: 'not-in-lesson' | 'not-equipped' | 'confusable' | 'unknown' | string;
}

export interface VoiceOverlayDictionaryEntry {
  word: string;
  chinese: string;
  effect: string;
}

export interface VoiceOverlayOptions {
  dictionary?: readonly VoiceOverlayDictionaryEntry[];
  patterns?: readonly string[];
  title?: string;
  placeholder?: string;
}

const failureCopy: Record<string, string> = {
  'not-in-lesson': '不在本局言灵词库 · 展开「本局言灵」查看',
  'not-equipped': '言灵尚未装备 · 下一局可在战前配置',
  confusable: '发音相近但意思不同 · 再清晰地说一次',
  unknown: '暂时无法理解这句表达 · 可以换个句式',
  'word-not-visible': '没有识别到未激活的完整单词 · 看清方块后再读一次',
  'letter-spelling': '请直接朗读完整单词 · 不需要逐个字母拼读',
  'ambiguous-word': '一次只读一个方块 · 请选择一个言灵',
  'already-activated': '这个言灵已经点亮 · 换一个尚未激活的单词',
  'input-locked': '言灵效果正在展开 · 很快可以继续',
  timeout: '响应时间结束 · 新的十五秒已经开始',
};

export class VoiceOverlay {
  private readonly root: HTMLElement;
  private readonly controller: VoiceInputController;
  private readonly audio = new AudioManager();
  private readonly mode: 'battle' | 'training' | 'command-block';
  private latestId = '';
  private clearId?: number;

  constructor(mode: 'battle' | 'training' | 'command-block' = 'battle', options: VoiceOverlayOptions = {}) {
    const host = document.querySelector<HTMLElement>('#dom-overlay');
    if (!host) throw new Error('无法找到 DOM 覆盖层 #dom-overlay');
    const arena = getArena(SaveManager.load().selectedArenaId);
    this.mode = mode;
    this.controller = new VoiceInputController({ interpret: mode !== 'command-block' });
    const dictionary = options.dictionary ?? arena.lesson.words.map((entry) => ({
      word: entry.english,
      chinese: entry.chinese,
      effect: entry.gameEffect,
    }));
    const patterns = options.patterns ?? arena.lesson.patterns.map((entry) => entry.example);
    const title = options.title ?? '本局言灵';

    this.root = document.createElement('section');
    this.root.className = `voice-command-ui ${mode}-voice-ui`;
    this.root.style.setProperty('--voice-accent', arena.accentCss);
    this.root.innerHTML = `
      <div class="voice-words" aria-live="polite" aria-atomic="false">
        <div class="voice-meta">
          <span class="voice-channel"><i></i>OFF</span>
          <span class="voice-system-label">INCANTATION LINK</span>
        </div>
        <p class="voice-live">言灵待命</p>
        <p class="voice-substatus">点击下方「言灵」开始聆听</p>
        <div class="voice-listening-wave" aria-hidden="true">
          ${Array.from({ length: 9 }, (_, index) => `<i style="--bar-index:${index}"></i>`).join('')}
        </div>
        <div class="voice-success-rings" aria-hidden="true"><i></i><i></i></div>
        <div class="voice-sparks" aria-hidden="true"></div>
      </div>

      <button class="lesson-peek" type="button">
        <span>${title}</span><i aria-hidden="true"></i>
      </button>
      <aside class="lesson-drawer" aria-hidden="true">
        <header>
          <small>BATTLE DICTIONARY · ${dictionary.length} WORDS / ${patterns.length} PATTERNS</small>
          <strong>${arena.name} · ${title}</strong>
        </header>
        <div class="lesson-word-grid">
          ${dictionary.map((entry, index) => `
            <span>
              <small>${String(index + 1).padStart(2, '0')}</small>
              <b>${entry.word}</b>
              <em>${entry.chinese} · ${entry.effect}</em>
            </span>
          `).join('')}
        </div>
        <div class="lesson-pattern-list">
          ${patterns.map((pattern) => `<em>${pattern}</em>`).join('')}
        </div>
      </aside>

      <div class="voice-actions">
        <button class="incant-button" type="button" aria-label="开启或关闭持续语音识别">
          <i class="action-glyph" aria-hidden="true"><b></b><b></b></i>
          <span>言灵<small>L</small></span>
        </button>
        <button class="write-button" type="button" aria-label="开启文字输入">
          <i class="action-glyph write-glyph" aria-hidden="true">⌁</i>
          <span>念写<small>N</small></span>
        </button>
      </div>

      <form class="write-tray">
        <span class="write-prefix" aria-hidden="true">念写</span>
        <input
          maxlength="300"
          autocomplete="off"
          aria-label="手动输入英语言灵"
          placeholder="${options.placeholder ?? `写下本局言灵，例如 ${patterns[0] ?? 'Use the object.'}`}"
        >
        <button type="submit"><span>执行</span><i aria-hidden="true">→</i></button>
      </form>
    `;
    host.replaceChildren(this.root);
    this.bind();
  }

  private bind(): void {
    this.root.querySelector('.incant-button')?.addEventListener('click', this.toggleVoice);
    this.root.querySelector('.write-button')?.addEventListener('click', this.toggleWrite);
    this.root.querySelector('.lesson-peek')?.addEventListener('click', this.toggleLesson);
    this.root.querySelector('form')?.addEventListener('submit', this.submitText);
    this.root.querySelector('input')?.addEventListener('focus', this.inputFocus);
    this.root.querySelector('input')?.addEventListener('blur', this.inputBlur);
    window.addEventListener('keydown', this.keydown);
    EventBus.on(GameEvents.VOICE_UTTERANCE, this.utterance);
    EventBus.on(GameEvents.VOICE_INTERPRETATION, this.interpretation);
    EventBus.on(GameEvents.VOICE_CHANNEL, this.channel);
    EventBus.on(GameEvents.VOICE_LISTEN_START, this.listenStart);
    EventBus.on(GameEvents.VOICE_LISTEN_END, this.listenEnd);
    EventBus.on(GameEvents.VOICE_ERROR, this.error);
    EventBus.on(GameEvents.VOICE_COMMAND_SUCCESS, this.success);
    EventBus.on(GameEvents.VOICE_COMMAND_FAILED, this.failed);
  }

  private toggleVoice = (): void => {
    if (this.controller.isContinuous) {
      this.controller.stopContinuous();
      this.show('言灵已收束', '再次点击即可继续聆听');
      return;
    }
    this.root.classList.remove('failed', 'succeeded');
    this.audio.play('voiceOn');
    this.controller.startContinuous();
  };

  private toggleWrite = (): void => {
    const open = this.root.classList.toggle('writing');
    this.root.classList.remove('lesson-open');
    this.root.querySelector('.lesson-drawer')?.setAttribute('aria-hidden', 'true');
    const input = this.root.querySelector<HTMLInputElement>('input');
    if (open) window.setTimeout(() => input?.focus(), 120);
    else input?.blur();
  };

  private toggleLesson = (): void => {
    const open = this.root.classList.toggle('lesson-open');
    this.root.classList.remove('writing');
    this.root.querySelector<HTMLInputElement>('input')?.blur();
    this.root.querySelector('.lesson-drawer')?.setAttribute('aria-hidden', String(!open));
  };

  private submitText = (event: Event): void => {
    event.preventDefault();
    const input = this.root.querySelector<HTMLInputElement>('input');
    if (!input?.value.trim()) return;
    this.root.classList.add('processing');
    void this.controller.submitMock(input.value);
    input.value = '';
    this.root.classList.remove('writing');
    input.blur();
  };

  private inputFocus = (): void => {
    EventBus.emit(GameEvents.TEXT_INPUT_FOCUS, true);
  };

  private inputBlur = (): void => {
    EventBus.emit(GameEvents.TEXT_INPUT_FOCUS, false);
  };

  private keydown = (event: KeyboardEvent): void => {
    if ((event.target as HTMLElement)?.tagName === 'INPUT') return;
    if (event.code === 'KeyL') this.toggleVoice();
    if (event.code === 'KeyN') this.toggleWrite();
  };

  private utterance = (utterance: VoiceUtterance): void => {
    if (this.clearId) window.clearTimeout(this.clearId);
    this.root.classList.remove('failed', 'succeeded');
    this.latestId = utterance.utteranceId;
    if (utterance.partialText) this.renderWords(utterance.partialText, true);
    if (utterance.finalRawText) {
      this.renderWords(utterance.finalRawText, false);
      this.audio.play('voiceCommit');
    }
  };

  private interpretation = (interpretation: AIInterpretation): void => {
    if (this.mode !== 'command-block' && interpretation.utteranceId === this.latestId) {
      this.text('.voice-substatus', interpretation.naturalText);
    }
  };

  private channel = (state: VoiceChannelState): void => {
    this.root.dataset.provider = state.provider;
    this.root.classList.toggle('channel-fallback', state.state === 'fallback');
    this.root.classList.toggle('channel-connecting', state.state === 'connecting');
    this.text('.voice-channel', providerLabel(state.provider));
    this.text('.voice-substatus', state.message);
    const channel = this.root.querySelector<HTMLElement>('.voice-channel');
    if (channel && !channel.querySelector('i')) channel.prepend(document.createElement('i'));
  };

  private listenStart = (): void => {
    this.root.classList.add('listening');
    this.setIncantLabel('收束');
  };

  private listenEnd = (): void => {
    this.root.classList.remove('listening', 'channel-connecting');
    this.setIncantLabel('言灵');
  };

  private error = (message: string): void => {
    this.root.classList.add('failed');
    this.show('未能听清', message);
    window.setTimeout(() => this.root.classList.remove('failed'), 560);
  };

  private success = (data: VoiceSuccess): void => {
    if (data.utteranceId && this.latestId && data.utteranceId !== this.latestId) return;
    this.root.classList.remove('failed', 'processing');
    this.root.classList.add('succeeded');
    this.text('.voice-substatus', data.challenge ? '语言挑战完成 · 战场恢复正常速度' : '言灵生效 · 战场已经响应');
    this.spawnSparks();
    this.audio.play('voiceSuccess');
    const save = SaveManager.load();
    vibrateVoiceSuccess(navigator, save.settings.hapticsEnabled !== false, Boolean(data.challenge));
    window.setTimeout(() => this.root.classList.remove('succeeded'), 1050);
    this.scheduleClear(2400);
  };

  private failed = (data?: VoiceFailure): void => {
    if (data?.utteranceId && this.latestId && data.utteranceId !== this.latestId) return;
    this.root.classList.remove('processing', 'succeeded');
    this.root.classList.add('failed');
    this.text('.voice-substatus', failureCopy[data?.reason ?? ''] ?? '言灵未能生效 · 再试一次');
    this.audio.play('voiceFail');
    window.setTimeout(() => this.root.classList.remove('failed'), 560);
  };

  private renderWords(value: string, partial: boolean): void {
    const line = this.root.querySelector<HTMLElement>('.voice-live');
    if (!line) return;
    const words = value.trim().split(/\s+/).filter(Boolean);
    const existing = Array.from(line.querySelectorAll<HTMLElement>('.voice-token'));
    let stableLength = 0;
    while (stableLength < words.length && stableLength < existing.length
      && existing[stableLength].dataset.word === words[stableLength]) {
      stableLength += 1;
    }
    existing.slice(stableLength).forEach((token) => token.remove());
    if (stableLength === 0 && existing.length === 0) line.replaceChildren();

    words.slice(stableLength).forEach((word, offset) => {
      const span = document.createElement('span');
      span.className = 'voice-token';
      span.dataset.word = word;
      span.textContent = word;
      span.style.setProperty('--word-index', String(stableLength + offset));
      line.append(span);
    });

    line.classList.toggle('partial', partial);
    this.root.classList.toggle('transcribing', partial);
    this.text('.voice-substatus', partial ? '正在聆听 · 继续说' : '正在理解 · 让战场回应');
  }

  private spawnSparks(): void {
    const host = this.root.querySelector<HTMLElement>('.voice-sparks');
    if (!host) return;
    const colors = ['#63f0d4', '#ffdf7f', '#b87cff', '#ffffff'];
    host.replaceChildren(...Array.from({ length: 24 }, (_, index) => {
      const spark = document.createElement('i');
      spark.style.setProperty('--spark-angle', `${index * 15 + (index % 3) * 4}deg`);
      spark.style.setProperty('--spark-distance', `${48 + (index % 5) * 12}px`);
      spark.style.setProperty('--spark-delay', `${(index % 4) * 18}ms`);
      spark.style.setProperty('--spark-size', `${2 + (index % 3) * 2}px`);
      spark.style.setProperty('--spark-color', colors[index % colors.length]);
      return spark;
    }));
  }

  private show(main: string, sub: string): void {
    const line = this.root.querySelector<HTMLElement>('.voice-live');
    if (line) {
      line.replaceChildren(main);
      line.classList.remove('partial');
    }
    this.text('.voice-substatus', sub);
  }

  private scheduleClear(delay: number): void {
    if (this.clearId) window.clearTimeout(this.clearId);
    this.clearId = window.setTimeout(() => {
      this.show('言灵待命', this.controller.isContinuous ? '持续聆听中 · 直接说出英语' : '点击下方「言灵」开始聆听');
    }, delay);
  }

  private text(selector: string, value: string): void {
    const element = this.root.querySelector<HTMLElement>(selector);
    if (element) element.textContent = value;
  }

  private setIncantLabel(value: string): void {
    const label = this.root.querySelector<HTMLElement>('.incant-button span');
    if (!label) return;
    const shortcut = document.createElement('small');
    shortcut.textContent = 'L';
    label.replaceChildren(value, shortcut);
  }

  destroy(): void {
    this.controller.cancel();
    this.audio.close();
    if (this.clearId) window.clearTimeout(this.clearId);
    window.removeEventListener('keydown', this.keydown);
    EventBus.off(GameEvents.VOICE_UTTERANCE, this.utterance);
    EventBus.off(GameEvents.VOICE_INTERPRETATION, this.interpretation);
    EventBus.off(GameEvents.VOICE_CHANNEL, this.channel);
    EventBus.off(GameEvents.VOICE_LISTEN_START, this.listenStart);
    EventBus.off(GameEvents.VOICE_LISTEN_END, this.listenEnd);
    EventBus.off(GameEvents.VOICE_ERROR, this.error);
    EventBus.off(GameEvents.VOICE_COMMAND_SUCCESS, this.success);
    EventBus.off(GameEvents.VOICE_COMMAND_FAILED, this.failed);
    EventBus.emit(GameEvents.TEXT_INPUT_FOCUS, false);
    navigator.vibrate?.(0);
    this.root.remove();
  }

  cancel(): void {
    this.controller.cancel();
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? '' : 'none';
  }
}
