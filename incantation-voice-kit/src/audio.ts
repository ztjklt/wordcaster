import voiceCommitUrl from './assets/audio/voice-commit.ogg?inline';
import voiceFailUrl from './assets/audio/voice-fail.ogg?inline';
import voiceOnUrl from './assets/audio/voice-on.ogg?inline';
import voiceSuccessUrl from './assets/audio/voice-success.ogg?inline';
import type { IncantationSoundProfile } from './types';

type VoiceAudioCue = 'on' | 'commit' | 'success' | 'fail';

const audioFiles: Record<VoiceAudioCue, string> = {
  on: voiceOnUrl,
  commit: voiceCommitUrl,
  success: voiceSuccessUrl,
  fail: voiceFailUrl,
};

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

const clampVolume = (volume: number): number =>
  Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 1;

export class IncantationAudio {
  private context?: AudioContext;
  private volume: number;
  private readonly active = new Set<HTMLAudioElement>();

  constructor(volume: number) {
    this.volume = clampVolume(volume);
  }

  setVolume(volume: number): void {
    this.volume = clampVolume(volume);
    this.active.forEach((audio) => {
      audio.volume = this.volume;
    });
  }

  playCue(cue: VoiceAudioCue): void {
    if (this.volume <= 0) return;
    if (typeof Audio === 'undefined') {
      this.playSynthCue(cue);
      return;
    }
    const audio = new Audio(audioFiles[cue]);
    audio.preload = 'auto';
    audio.volume = this.volume;
    this.active.add(audio);
    const clear = () => this.active.delete(audio);
    audio.addEventListener('ended', clear, { once: true });
    audio.addEventListener('error', clear, { once: true });
    try {
      void audio.play().catch(() => {
        clear();
        this.playSynthCue(cue);
      });
    } catch {
      clear();
      this.playSynthCue(cue);
    }
  }

  playWord(effectId: string, profile: IncantationSoundProfile): void {
    const context = this.getContext();
    if (!context || this.volume <= 0) return;
    if (context.state === 'suspended') void context.resume();
    const hash = [...effectId].reduce((sum, value) => sum + value.charCodeAt(0), 0);
    const now = context.currentTime;
    const bases: Record<IncantationSoundProfile, number> = {
      metal: 190,
      mystic: 420,
      nature: 310,
      water: 260,
      electric: 520,
      food: 350,
      paper: 390,
      transit: 150,
    };
    const base = bases[profile] + (hash % 9) * 17;
    [0, .07, .14].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = profile === 'metal' || profile === 'transit'
        ? 'square'
        : profile === 'electric'
          ? 'sawtooth'
          : profile === 'mystic'
            ? 'sine'
            : 'triangle';
      oscillator.frequency.setValueAtTime(base * (1 + index * .24), now + offset);
      oscillator.frequency.exponentialRampToValueAtTime(
        base * (1.35 + index * .2),
        now + offset + .12,
      );
      gain.gain.setValueAtTime(.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(
        (.055 - index * .009) * this.volume,
        now + offset + .012,
      );
      gain.gain.exponentialRampToValueAtTime(.0001, now + offset + .16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + .18);
    });
  }

  close(): void {
    this.active.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });
    this.active.clear();
    if (this.context && this.context.state !== 'closed') void this.context.close();
    this.context = undefined;
  }

  private getContext(): AudioContext | undefined {
    if (typeof window === 'undefined') return undefined;
    const AudioContextConstructor = window.AudioContext
      ?? (window as AudioWindow).webkitAudioContext;
    if (!AudioContextConstructor) return undefined;
    this.context ??= new AudioContextConstructor();
    return this.context;
  }

  private playSynthCue(cue: VoiceAudioCue): void {
    const context = this.getContext();
    if (!context || this.volume <= 0) return;
    if (context.state === 'suspended') void context.resume();
    const config = {
      on: [440, .09, 'sine'],
      commit: [620, .08, 'sine'],
      success: [720, .22, 'sine'],
      fail: [120, .13, 'triangle'],
    } as const;
    const [frequency, duration, wave] = config[cue];
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (cue === 'success') {
      oscillator.frequency.exponentialRampToValueAtTime(980, now + duration);
    }
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.11 * this.volume, now + .01);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + .02);
  }
}
