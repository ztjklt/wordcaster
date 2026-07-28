import { EventBus } from '../game/events/EventBus';
import { GameEvents } from '../game/events/GameEvents';
import { BrowserSpeechProvider } from './BrowserSpeechProvider';
import { interpretUtterance } from './InterpretationClient';
import { RealtimeSpeechProvider } from './RealtimeSpeechProvider';
import type { SpeechProvider, SpeechResult } from './SpeechProvider';
import type { VoiceChannelState, VoiceProviderKind, VoiceUtterance } from './VoiceTypes';

type VoiceMode = 'auto'|'realtime'|'browser'|'mock';
export class VoiceInputController {
  private readonly browserProvider = new BrowserSpeechProvider();
  private readonly realtimeProvider = new RealtimeSpeechProvider((utterance) => this.handleRealtimeUtterance(utterance), (reason) => void this.handleRealtimeFailure(reason));
  private activeProvider?: SpeechProvider; private listening = false; private continuousEnabled = false; private restartId?: number; private realtimeFailures = 0; private abort = new AbortController();
  private readonly mode = ((import.meta.env.VITE_VOICE_MODE as VoiceMode | undefined) ?? 'auto');
  private readonly enableInterpretation: boolean;
  constructor(options: { interpret?: boolean } = {}) { this.enableInterpretation = options.interpret !== false; }
  get browserSupported(): boolean { return this.browserProvider.isSupported(); } get isListening(): boolean { return this.listening; } get isContinuous(): boolean { return this.continuousEnabled; }
  startContinuous(): void { if (this.continuousEnabled) return; this.continuousEnabled = true; void this.connectBestChannel(); }
  stopContinuous(): void { this.continuousEnabled = false; this.cancelActive(); this.emitChannel('mock','off','持续语音已关闭'); }
  async startBrowserListening(): Promise<void> { if (this.listening) return; try { await this.begin(this.browserProvider); void this.browserProvider.waitForEnd().then(() => { if (this.listening && this.activeProvider === this.browserProvider) void this.finish(); }); } catch (error) { this.handleBrowserFailure(error); } }
  async submitMock(transcript: string): Promise<void> { const text=transcript.trim(); if(!text)return; this.emitFinal({transcript:text,alternatives:[],confidence:1,language:'en-US',durationMs:0,provider:'mock'}); }
  async finish(): Promise<void> { if (!this.listening || !this.activeProvider) return; try { const result = await this.activeProvider.stopListening(); this.emitFinal(result); } catch (error) { this.handleBrowserFailure(error); return; } this.listening = false; this.activeProvider = undefined; EventBus.emit(GameEvents.VOICE_LISTEN_END); this.scheduleBrowserRestart(); }
  cancel(): void { this.continuousEnabled = false; this.cancelActive(); }
  private async connectBestChannel(): Promise<void> {
    if (this.mode === 'mock') { this.emitChannel('mock','listening','文本模式待命'); return; }
    if (this.mode !== 'browser' && await RealtimeSpeechProvider.available()) { try { this.emitChannel('openai-realtime','connecting','正在连接 Realtime'); await this.realtimeProvider.connect(); if (!this.continuousEnabled) { this.realtimeProvider.close(); return; } this.realtimeFailures = 0; this.listening = true; EventBus.emit(GameEvents.VOICE_LISTEN_START); this.emitChannel('openai-realtime','listening','Realtime 持续聆听中'); return; } catch (error) { await this.handleRealtimeFailure(error instanceof Error ? error.message : '连接失败'); return; } }
    if (this.mode === 'realtime') this.emitChannel('openai-realtime','error','Realtime 不可用');
    this.fallbackToBrowser('Realtime 未配置或不可用');
  }
  private async handleRealtimeFailure(reason: string): Promise<void> { this.realtimeProvider.close(); this.listening = false; if (!this.continuousEnabled) return; this.realtimeFailures += 1; if (this.realtimeFailures <= 2 && this.mode !== 'browser') { const wait = 400 * 2 ** (this.realtimeFailures - 1); this.emitChannel('openai-realtime','reconnecting',`Realtime 重连 ${this.realtimeFailures}/2`); window.setTimeout(() => { if (this.continuousEnabled) void this.connectBestChannel(); }, wait); return; } this.fallbackToBrowser(reason); }
  private fallbackToBrowser(reason: string): void { if (this.browserSupported && this.mode !== 'mock') { this.emitChannel('browser','fallback',`${reason} · 已切换 Browser`); void this.startBrowserListening(); } else this.emitChannel('mock','fallback',`${reason} · 请使用文本输入`); }
  private async begin(provider: SpeechProvider): Promise<void> { this.listening = true; this.activeProvider = provider; EventBus.emit(GameEvents.VOICE_LISTEN_START); await provider.startListening({ language: 'en-US', timeoutMs: 7000, onPartial: (text) => EventBus.emit(GameEvents.VOICE_UTTERANCE,{utteranceId:'browser-live',partialText:text,status:'transcribing',provider:'browser'} satisfies VoiceUtterance) }); if (provider === this.browserProvider) this.emitChannel('browser','listening','Browser 持续聆听中'); }
  private emitFinal(result: SpeechResult, utteranceId = crypto.randomUUID(), provider?: VoiceProviderKind): void { const kind = provider ?? (result.provider === 'browser' ? 'browser' : 'mock'); const utterance: VoiceUtterance = { utteranceId, partialText: '', finalRawText: result.transcript, status: this.enableInterpretation ? 'interpreting' : 'complete', provider: kind }; EventBus.emit(GameEvents.VOICE_UTTERANCE, utterance); EventBus.emit(GameEvents.VOICE_RESULT, { ...result, utteranceId }); if (this.enableInterpretation) void this.interpret(utterance); }
  private handleRealtimeUtterance(utterance: VoiceUtterance): void { EventBus.emit(GameEvents.VOICE_UTTERANCE, utterance); if (utterance.finalRawText) { const result: SpeechResult = { utteranceId: utterance.utteranceId, transcript: utterance.finalRawText, alternatives: [], confidence: null, language: 'en-US', durationMs: 0, provider: 'openai-realtime' }; EventBus.emit(GameEvents.VOICE_RESULT, result); if (this.enableInterpretation) void this.interpret(utterance); } }
  private async interpret(utterance: VoiceUtterance): Promise<void> { if (!utterance.finalRawText) return; try { const interpretation = await interpretUtterance(utterance.utteranceId, utterance.finalRawText, {}, this.abort.signal); if (interpretation) EventBus.emit(GameEvents.VOICE_INTERPRETATION, interpretation); } catch { /* AI is optional; local intent still works */ } }
  private handleBrowserFailure(error: unknown): void { const message = error instanceof Error ? error.message : '语音识别失败'; this.listening = false; this.activeProvider = undefined; EventBus.emit(GameEvents.VOICE_LISTEN_END); if (message.includes('权限') || message.includes('不支持') || message.includes('网络')) { this.continuousEnabled = false; this.emitChannel('mock','fallback',`${message} · 请使用文本输入`); EventBus.emit(GameEvents.VOICE_ERROR, message); } else { EventBus.emit(GameEvents.VOICE_RETRY, message); this.scheduleBrowserRestart(); } }
  private scheduleBrowserRestart(): void { if (!this.continuousEnabled || this.restartId !== undefined) return; this.restartId = window.setTimeout(() => { this.restartId = undefined; if (this.continuousEnabled) void this.startBrowserListening(); }, 180); }
  private cancelLegacy(): void { this.activeProvider?.cancel(); this.activeProvider = undefined; this.listening = false; }
  private cancelActive(): void { if (this.restartId !== undefined) window.clearTimeout(this.restartId); this.restartId = undefined; this.abort.abort(); this.abort = new AbortController(); this.cancelLegacy(); this.realtimeProvider.close(); EventBus.emit(GameEvents.VOICE_LISTEN_END); }
  private emitChannel(provider: VoiceProviderKind, state: VoiceChannelState['state'], message: string): void { EventBus.emit(GameEvents.VOICE_CHANNEL, { provider, state, message } satisfies VoiceChannelState); }
}
