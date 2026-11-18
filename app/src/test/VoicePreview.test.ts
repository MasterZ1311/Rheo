import { describe, expect, it } from 'vitest';
import { apiClient } from '@/lib/api/client';

describe('Built-in Voice Preview API', () => {
  it('generates standard preview URL for Kokoro preset voice', () => {
    const url = apiClient.getPresetVoicePreviewUrl('kokoro', 'af_bella');
    expect(url).toContain('/profiles/presets/kokoro/af_bella/preview');
  });

  it('generates preview URL with custom greeting text parameter', () => {
    const text = 'Hi, I am Nicole, how may I help you today?';
    const url = apiClient.getPresetVoicePreviewUrl('kokoro', 'af_nicole', text);
    expect(url).toContain('/profiles/presets/kokoro/af_nicole/preview?text=');
    expect(url).toContain(encodeURIComponent(text));
  });

  it('generates preview URL for Qwen CustomVoice preset voice', () => {
    const url = apiClient.getPresetVoicePreviewUrl('qwen_custom_voice', 'vivian');
    expect(url).toContain('/profiles/presets/qwen_custom_voice/vivian/preview');
  });
});
