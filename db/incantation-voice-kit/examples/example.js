import {
  createIncantationVoice,
  playWordFlash,
} from '../dist/incantation-voice-kit.es.js';

const words = [
  { id: 'sword', word: 'sword', color: '#79f7e1', soundProfile: 'metal' },
  { id: 'shield', word: 'shield', color: '#73cfff', soundProfile: 'metal' },
  { id: 'lantern', word: 'lantern', color: '#ff9d58', soundProfile: 'mystic' },
  { id: 'bamboo', word: 'bamboo', color: '#82f1b6', soundProfile: 'nature' },
  { id: 'apple', word: 'apple', color: '#ff6b7b', soundProfile: 'food' },
  { id: 'coin', word: 'coin', color: '#ffdb67', soundProfile: 'metal' },
];

const log = document.querySelector('#event-log');
const cards = [...document.querySelectorAll('[data-word-id]')];

const clearCandidates = () => cards.forEach((card) => card.classList.remove('candidate'));

const voice = createIncantationVoice({
  target: '#voice-layer',
  words,
  volume: .75,
  accentColor: '#63f0d4',
  haptics: true,
  onCandidate: ({ word }) => {
    clearCandidates();
    if (word) document.querySelector(`[data-word-id="${word.id}"]`)?.classList.add('candidate');
  },
  onMatch: (result) => {
    clearCandidates();
    const target = document.querySelector(`[data-word-id="${result.word.id}"]`);
    if (target instanceof HTMLElement) {
      playWordFlash(target, { color: result.word.color });
    }
    log.textContent = `命中 ${result.word.word.toUpperCase()} · ${result.provider} · confidence ${result.confidence ?? 'n/a'}`;
  },
  onNoMatch: (result) => {
    clearCandidates();
    log.textContent = `未命中 · ${result.reason}${result.transcript ? ` · “${result.transcript}”` : ''}`;
  },
  onStateChange: (state) => {
    document.body.dataset.voiceState = state.state;
  },
});

document.querySelector('#simulate-success')?.addEventListener('click', () => {
  voice.submitText('apple');
});

document.querySelector('#simulate-failure')?.addEventListener('click', () => {
  voice.playFailure('unknown');
});

document.querySelector('#volume')?.addEventListener('input', (event) => {
  voice.setVolume(Number(event.target.value));
});

window.addEventListener('beforeunload', () => voice.destroy(), { once: true });
