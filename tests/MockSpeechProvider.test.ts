import { describe, expect, it } from 'vitest';
import { MockSpeechProvider } from '../src/voice/MockSpeechProvider';

describe('MockSpeechProvider', () => {
  it('returns configured transcript', async () => {
    const provider = new MockSpeechProvider({ transcript: 'I need a shield.', latencyMs: 0 });
    await provider.startListening({ language: 'en-US' });
    const result = await provider.stopListening();
    expect(result.transcript).toBe('I need a shield.');
    expect(result.provider).toBe('mock');
  });
  it('rejects empty transcript', async () => {
    const provider = new MockSpeechProvider({ transcript: ' ', latencyMs: 0 });
    await provider.startListening();
    await expect(provider.stopListening()).rejects.toThrow('请输入');
  });
});
