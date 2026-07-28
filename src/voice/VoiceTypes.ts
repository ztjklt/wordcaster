import type { GameplayIntent } from '../language/GameplayCommand';

export type VoiceProviderKind = 'openai-realtime' | 'browser' | 'mock';
export type VoiceStatus = 'listening' | 'transcribing' | 'interpreting' | 'complete' | 'failed';
export interface VoiceUtterance { utteranceId: string; partialText: string; finalRawText?: string; aiNaturalText?: string; status: VoiceStatus; provider: VoiceProviderKind; }
export interface AIInterpretation { utteranceId: string; naturalText: string; intent: GameplayIntent; itemId?: string; targetEntityId?: string; direction?: 'left'|'right'|'up'|'down'; confidence: number; detectedMistake?: { targetWord: string; spokenWord: string; type: 'confusable'|'grammar'|'missing_slot' }; explanationZh?: string; }
export interface VoiceChannelState { provider: VoiceProviderKind; state: 'connecting'|'listening'|'reconnecting'|'fallback'|'off'|'error'; message: string; }
