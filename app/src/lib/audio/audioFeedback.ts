import popStartUrl from '@/assets/sounds/pop_start.wav';
import popStopUrl from '@/assets/sounds/pop_stop.wav';
import marimbaStartUrl from '@/assets/sounds/marimba_start.wav';
import marimbaStopUrl from '@/assets/sounds/marimba_stop.wav';

export type SoundTheme = 'pop' | 'marimba';
export type SoundCue = 'start' | 'stop';

const soundMap: Record<SoundTheme, Record<SoundCue, string>> = {
  pop: {
    start: popStartUrl,
    stop: popStopUrl,
  },
  marimba: {
    start: marimbaStartUrl,
    stop: marimbaStopUrl,
  },
};

/**
 * Plays an audio earcon / feedback sound for recording start/stop.
 * Mirrors Handy's audio feedback system for instant acoustic confirmation.
 */
export function playAudioFeedback(
  cue: SoundCue,
  theme: SoundTheme = 'pop',
  volume: number = 0.7,
): void {
  try {
    const selectedTheme = soundMap[theme] ? theme : 'pop';
    const soundUrl = soundMap[selectedTheme][cue];
    if (!soundUrl) return;

    const audio = new Audio(soundUrl);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch((err) => {
      // Audio playback can be silenced if not yet interacted with in webview
      console.debug('[audioFeedback] playback silenced or prevented:', err);
    });
  } catch (err) {
    console.debug('[audioFeedback] failed to play sound cue:', err);
  }
}
