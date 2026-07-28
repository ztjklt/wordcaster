import { describe, expect, it } from 'vitest';
import { BrowserSpeechProvider } from '../src/voice/BrowserSpeechProvider';

describe('BrowserSpeechProvider', () => {
  it('reports unsupported outside a browser environment', () => {
    expect(new BrowserSpeechProvider().isSupported()).toBe(false);
  });

  it('rejects listening when recognition API is unavailable', async () => {
    await expect(new BrowserSpeechProvider().startListening()).rejects.toThrow('不支持语音识别');
  });
});
