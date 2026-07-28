import { TranscriptAggregator } from './TranscriptAggregator';
import { VoiceActivityDetector } from './VoiceActivityDetector';
import type { VoiceUtterance } from './VoiceTypes';

interface RealtimeEvent { type?: string; item_id?: string; delta?: string; transcript?: string; }
export class RealtimeSpeechProvider {
  private peer?: RTCPeerConnection; private channel?: RTCDataChannel; private stream?: MediaStream; private context?: AudioContext; private analyser?: AnalyserNode; private animationId?: number;
  private readonly aggregator = new TranscriptAggregator(); private readonly vad = new VoiceActivityDetector();
  constructor(private readonly onUtterance: (utterance: VoiceUtterance) => void, private readonly onDisconnected: (reason: string) => void) {}
  static async available(): Promise<boolean> { try { const response = await fetch('/api/health'); const data = await response.json() as { realtimeAvailable?: boolean }; return Boolean(data.realtimeAvailable && 'mediaDevices' in navigator && 'RTCPeerConnection' in globalThis); } catch { return false; } }
  async connect(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    this.peer = new RTCPeerConnection(); this.stream.getTracks().forEach((track) => this.peer?.addTrack(track, this.stream!));
    this.channel = this.peer.createDataChannel('oai-events'); this.channel.onmessage = (event) => this.handleEvent(String(event.data));
    this.peer.onconnectionstatechange = () => { if (['failed','disconnected','closed'].includes(this.peer?.connectionState ?? '')) this.onDisconnected(this.peer?.connectionState ?? 'closed'); };
    await this.startVad(); const offer = await this.peer.createOffer(); await this.peer.setLocalDescription(offer);
    const response = await fetch('/api/realtime/session', { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: offer.sdp });
    if (!response.ok) throw new Error(`Realtime 会话失败 (${response.status})`);
    await this.peer.setRemoteDescription({ type: 'answer', sdp: await response.text() });
  }
  close(): void { if (this.animationId !== undefined) cancelAnimationFrame(this.animationId); this.channel?.close(); this.peer?.close(); this.stream?.getTracks().forEach((track) => track.stop()); void this.context?.close(); this.channel = undefined; this.peer = undefined; this.stream = undefined; this.context = undefined; this.aggregator.clear(); this.vad.reset(); }
  private handleEvent(raw: string): void { try { const event = JSON.parse(raw) as RealtimeEvent; if (!event.item_id) return; if (event.type === 'conversation.item.input_audio_transcription.delta' && event.delta) this.onUtterance(this.aggregator.applyDelta(event.item_id, event.delta)); if (event.type === 'conversation.item.input_audio_transcription.completed') this.onUtterance(this.aggregator.complete(event.item_id, event.transcript ?? '')); } catch { /* malformed upstream events are ignored */ } }
  private async startVad(): Promise<void> {
    if (!this.stream) return; this.context = new AudioContext(); const source = this.context.createMediaStreamSource(this.stream); this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 512; source.connect(this.analyser); const values = new Uint8Array(this.analyser.fftSize);
    const tick = () => { if (!this.analyser) return; this.analyser.getByteTimeDomainData(values); const rms = Math.sqrt(values.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / values.length); const event = this.vad.sample(rms > 0.025, performance.now()); if (event?.type === 'speech-end') this.send({ type: 'input_audio_buffer.commit' }); if (event?.type === 'idle-clear') this.send({ type: 'input_audio_buffer.clear' }); this.animationId = requestAnimationFrame(tick); }; tick();
  }
  private send(event: object): void { if (this.channel?.readyState === 'open') this.channel.send(JSON.stringify(event)); }
}
