import './styles.css';

import { IncantationVoice } from './IncantationVoice';

export { playWordFlash, prefersReducedMotion } from './effects';
export {
  assertValidWords,
  normalizeSpokenInput,
  resolveSpeechAlternatives,
  resolveSpokenWord,
  tokenizeSpokenInput,
  type SpokenWordMatch,
  type SpokenWordMatchMode,
} from './matcher';
export type {
  IncantationCandidateResult,
  IncantationChannelState,
  IncantationFailureReason,
  IncantationMatchResult,
  IncantationNoMatchResult,
  IncantationProvider,
  IncantationSoundProfile,
  IncantationStateChange,
  IncantationVoiceInstance,
  IncantationVoiceOptions,
  IncantationWord,
  WordFlashOptions,
} from './types';

import type {
  IncantationVoiceInstance,
  IncantationVoiceOptions,
} from './types';

export function createIncantationVoice(
  options: IncantationVoiceOptions,
): IncantationVoiceInstance {
  return new IncantationVoice(options);
}
