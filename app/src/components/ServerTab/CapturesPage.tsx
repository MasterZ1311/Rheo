import { BookA, Check, ChevronDown, FolderOpen, Info, Keyboard, Laptop, Lock, Play, Plus, Send, Volume2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityNotice } from '@/components/AccessibilityGate/AccessibilityGate';
import { InputMonitoringNotice } from '@/components/InputMonitoringGate/InputMonitoringGate';
import { CapturePill, type PillState } from '@/components/CapturePill/CapturePill';
import { DictationReadinessChecklist } from '@/components/CapturesTab/DictationReadinessChecklist';
import { ChordPicker } from '@/components/ChordPicker/ChordPicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import { useToast } from '@/components/ui/use-toast';
import { playAudioFeedback } from '@/lib/audio/audioFeedback';
import { useDictationReadiness } from '@/lib/hooks/useDictationReadiness';
import { useCaptureSettings } from '@/lib/hooks/useSettings';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { usePlatform } from '@/platform/PlatformContext';
import { useServerStore } from '@/stores/serverStore';
import { cn } from '@/lib/utils/cn';
import { defaultChordKeys, displayLabelForKey, modifierSideHint } from '@/lib/utils/keyCodes';
import type { Qwen3ModelSize, VoiceProfileResponse, WhisperModelSize } from '@/lib/api/types';
import { SettingRow, SettingSection } from './SettingRow';

function ChordPreview({ keys }: { keys: string[] }) {
  const { t } = useTranslation();
  if (keys.length === 0) {
    return <span className="text-xs text-muted-foreground italic">{t('captures.chord.notSet')}</span>;
  }
  return (
    <div className="flex items-center gap-1">
      {keys.map((k) => {
        const side = modifierSideHint(k);
        return (
          <span
            key={k}
            className="relative inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded-md border border-border bg-muted/60 font-mono text-[11px] font-medium shadow-sm text-foreground"
          >
            {displayLabelForKey(k)}
            {side ? (
              <span className="absolute -top-1 -right-1 h-3 min-w-[0.75rem] px-0.5 rounded-sm bg-accent text-[7px] font-bold leading-none flex items-center justify-center text-accent-foreground">
                {side}
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

const isWindows =
  typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');

const PILL_SEQUENCE: PillState[] = ['recording', 'transcribing', 'refining', 'rest'];
const PILL_DURATIONS: Partial<Record<PillState, number>> = {
  recording: 2600,
  transcribing: 1500,
  refining: 1500,
  rest: 900,
};

function HotkeyPillPreview({ enabled }: { enabled: boolean }) {
  const [state, setState] = useState<PillState>('recording');
  const [tick, setTick] = useState(0);

  // Cycle recording → transcribing → refining → rest → …
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = PILL_SEQUENCE[(PILL_SEQUENCE.indexOf(state) + 1) % PILL_SEQUENCE.length];
      setState(next);
    }, PILL_DURATIONS[state] ?? 1000);
    return () => window.clearTimeout(t);
  }, [state]);

  // Timer only advances while recording; holds its final value through
  // transcribing and refining so users see the duration of the clip being
  // processed.
  useEffect(() => {
    if (state !== 'recording') return;
    setTick(0);
    const iv = window.setInterval(() => setTick((n) => n + 1), 90);
    return () => window.clearInterval(iv);
  }, [state]);

  const elapsedMs = tick * 90;

  return (
    <div
      className={cn(
        'relative rounded-xl border overflow-hidden transition-opacity',
        'bg-muted/30',
        'aspect-[6/1]',
        enabled ? 'border-border' : 'border-border/50 opacity-50',
      )}
      style={{
        backgroundImage: `
          linear-gradient(to right, hsl(var(--foreground) / 0.06) 1px, transparent 1px),
          linear-gradient(to bottom, hsl(var(--foreground) / 0.06) 1px, transparent 1px)
        `,
        backgroundSize: '22px 22px',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <CapturePill state={state} elapsedMs={elapsedMs} />
      </div>
    </div>
  );
}

export function CapturesPage() {
  const { t } = useTranslation();
  const platform = usePlatform();
  const serverUrl = useServerStore((state) => state.serverUrl);
  const { settings, update } = useCaptureSettings();
  const { data: profiles } = useProfiles();
  const { toast } = useToast();
  const readiness = useDictationReadiness();
  const sttModel = settings?.stt_model ?? 'turbo';
  const language = settings?.language ?? 'auto';
  const autoRefine = settings?.auto_refine ?? true;
  const llmModel = settings?.llm_model ?? '0.6B';
  const smartCleanup = settings?.smart_cleanup ?? true;
  const selfCorrection = settings?.self_correction ?? true;
  const preserveTechnical = settings?.preserve_technical ?? true;
  const allowAutoPaste = settings?.allow_auto_paste ?? true;
  const defaultVoiceId = settings?.default_playback_voice_id ?? null;
  const hotkeyEnabled = settings?.hotkey_enabled ?? false;
  const pushToTalkKeys = settings?.chord_push_to_talk_keys ?? defaultChordKeys('push');
  const toggleToTalkKeys = settings?.chord_toggle_to_talk_keys ?? defaultChordKeys('toggle');

  // Handy feature states
  const audioFeedback = settings?.audio_feedback ?? false;
  const audioFeedbackVolume = settings?.audio_feedback_volume ?? 0.7;
  const soundTheme = settings?.sound_theme ?? 'pop';
  const customWords = settings?.custom_words ?? [];
  const wordCorrectionThreshold = settings?.word_correction_threshold ?? 0.8;
  const autoSubmit = settings?.auto_submit ?? false;
  const autoSubmitKey = settings?.auto_submit_key ?? 'enter';
  const appendTrailingSpace = settings?.append_trailing_space ?? false;
  const recordingRetentionPeriod = settings?.recording_retention_period ?? 'preserve_limit';
  const historyLimit = settings?.history_limit ?? 200;
  const translateToEnglish = settings?.translate_to_english ?? false;
  const modelUnloadTimeoutMinutes = settings?.model_unload_timeout_minutes ?? 5;
  const removeFillerWords = settings?.remove_filler_words ?? false;
  const pasteDelayMs = settings?.paste_delay_ms ?? 50;

  const [newWord, setNewWord] = useState('');
  const [chordEditor, setChordEditor] = useState<'push' | 'toggle' | null>(null);
  const [opening, setOpening] = useState(false);
  const [capturesPath, setCapturesPath] = useState<string | null>(null);

  const handleAddWord = () => {
    const trimmed = newWord.trim();
    if (trimmed && !customWords.includes(trimmed)) {
      update({ custom_words: [...customWords, trimmed] });
      setNewWord('');
    }
  };

  const handleRemoveWord = (wordToRemove: string) => {
    update({ custom_words: customWords.filter((w) => w !== wordToRemove) });
  };

  const handleTestAudio = () => {
    playAudioFeedback('start', (soundTheme as any) || 'pop', audioFeedbackVolume);
  };

  useEffect(() => {
    fetch(`${serverUrl}/health/filesystem`)
      .then((res) => res.json())
      .then((data) => {
        const dir = data.directories?.find((d: { path: string }) =>
          d.path.includes('captures'),
        );
        if (dir?.path) setCapturesPath(dir.path);
      })
      .catch(() => {});
  }, [serverUrl]);

  const openCapturesFolder = useCallback(async () => {
    if (!capturesPath) return;
    setOpening(true);
    try {
      await platform.filesystem.openPath(capturesPath);
    } catch (e) {
      console.error('Failed to open captures folder:', e);
    } finally {
      setOpening(false);
    }
  }, [platform, capturesPath]);

  const voices: VoiceProfileResponse[] = profiles ?? [];
  const defaultVoice =
    voices.find((v) => v.id === defaultVoiceId) ?? null;

  return (
    <div className="flex gap-8 items-start max-w-5xl">
      <div className="flex-1 min-w-0 max-w-2xl space-y-10">
      <SettingSection
        title={t('settings.captures.dictation.title')}
        description={t('settings.captures.dictation.description')}
      >
        <div>
          <SettingRow
            title={t('settings.captures.dictation.globalShortcut.title')}
            description={t('settings.captures.dictation.globalShortcut.description')}
            htmlFor="hotkeyEnabled"
            action={
              <Toggle
                id="hotkeyEnabled"
                checked={hotkeyEnabled}
                onCheckedChange={(v) => {
                  update({ hotkey_enabled: v });
                  // Surface model-readiness blocks at the toggle. The
                  // InputMonitoringNotice below already covers TCC, but
                  // missing models would otherwise be invisible from this
                  // page — the user toggles on, presses the chord, and
                  // nothing happens because useChordSync gates on readiness.
                  if (!v) return;
                  const missingModels = readiness.missing.filter(
                    (g) => g === 'stt' || g === 'llm',
                  );
                  if (missingModels.length === 0) return;
                  const names = [
                    missingModels.includes('stt') ? readiness.stt?.display_name : null,
                    missingModels.includes('llm') ? readiness.llm?.display_name : null,
                  ]
                    .filter(Boolean)
                    .join(' and ');
                  toast({
                    title: t('captures.toast.shortcutNotArmed'),
                    description: t('captures.toast.shortcutNotArmedDescription', {
                      names,
                      count: missingModels.length,
                    }),
                  });
                }}
              />
            }
          />
          <InputMonitoringNotice enabled={hotkeyEnabled} />
        </div>

        <SettingRow
          title={t('settings.captures.dictation.pushToTalk.title')}
          description={t('settings.captures.dictation.pushToTalk.description')}
          action={
            <div className="flex items-center gap-2">
              <ChordPreview keys={pushToTalkKeys} />
              <Button
                variant="outline"
                size="sm"
                disabled={!hotkeyEnabled}
                onClick={() => setChordEditor('push')}
              >
                <Keyboard className="h-3.5 w-3.5 mr-1.5" />
                {t('settings.captures.dictation.pushToTalk.change')}
              </Button>
            </div>
          }
        />

        <SettingRow
          title={t('settings.captures.dictation.toggle.title')}
          description={t('settings.captures.dictation.toggle.description')}
          action={
            <div className="flex items-center gap-2">
              <ChordPreview keys={toggleToTalkKeys} />
              <Button
                variant="outline"
                size="sm"
                disabled={!hotkeyEnabled}
                onClick={() => setChordEditor('toggle')}
              >
                <Keyboard className="h-3.5 w-3.5 mr-1.5" />
                {t('settings.captures.dictation.toggle.change')}
              </Button>
            </div>
          }
        />

        <ChordPicker
          open={chordEditor === 'push'}
          title={t('settings.captures.dictation.chordPicker.pttTitle')}
          description={t('settings.captures.dictation.chordPicker.pttDescription')}
          initialKeys={pushToTalkKeys}
          onCancel={() => setChordEditor(null)}
          onSave={(keys) => {
            update({ chord_push_to_talk_keys: keys });
            setChordEditor(null);
          }}
        />

        <ChordPicker
          open={chordEditor === 'toggle'}
          title={t('settings.captures.dictation.chordPicker.toggleTitle')}
          description={t('settings.captures.dictation.chordPicker.toggleDescription')}
          initialKeys={toggleToTalkKeys}
          onCancel={() => setChordEditor(null)}
          onSave={(keys) => {
            update({ chord_toggle_to_talk_keys: keys });
            setChordEditor(null);
          }}
        />

        <SettingRow
          title={t('settings.captures.dictation.preview.title')}
          description={t('settings.captures.dictation.preview.description')}
        >
          <HotkeyPillPreview enabled={hotkeyEnabled} />
        </SettingRow>

        <div>
          <SettingRow
            title={t('settings.captures.dictation.autoPaste.title')}
            description={t('settings.captures.dictation.autoPaste.description')}
            htmlFor="autoPaste"
            action={
              <Toggle
                id="autoPaste"
                checked={allowAutoPaste}
                onCheckedChange={(v) => update({ allow_auto_paste: v })}
                disabled={!hotkeyEnabled}
              />
            }
          />
          <AccessibilityNotice />
        </div>

        <SettingRow
          title={t('settings.captures.dictation.autoSubmit.title', 'Auto-Submit after Paste')}
          description={t(
            'settings.captures.dictation.autoSubmit.description',
            'Automatically sends a keystroke (e.g. Enter) after pasting transcribed text into the target app.'
          )}
          htmlFor="autoSubmit"
          action={
            <Toggle
              id="autoSubmit"
              checked={autoSubmit}
              onCheckedChange={(v) => update({ auto_submit: v })}
              disabled={!hotkeyEnabled}
            />
          }
        />

        {autoSubmit && (
          <SettingRow
            title={t('settings.captures.dictation.autoSubmitKey.title', 'Auto-Submit Key')}
            description={t(
              'settings.captures.dictation.autoSubmitKey.description',
              'Which keystroke to synthesize after paste completes.'
            )}
            action={
              <Select
                value={autoSubmitKey}
                onValueChange={(v) => update({ auto_submit_key: v as any })}
                disabled={!hotkeyEnabled}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enter">Enter</SelectItem>
                  <SelectItem value="ctrl_enter">Ctrl + Enter</SelectItem>
                  <SelectItem value="cmd_enter">Cmd + Enter</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        )}

        <SettingRow
          title={t('settings.captures.dictation.trailingSpace.title', 'Append Trailing Space')}
          description={t(
            'settings.captures.dictation.trailingSpace.description',
            'Add a trailing space after dictation so consecutive dictations do not fuse words together.'
          )}
          htmlFor="appendTrailingSpace"
          action={
            <Toggle
              id="appendTrailingSpace"
              checked={appendTrailingSpace}
              onCheckedChange={(v) => update({ append_trailing_space: v })}
              disabled={!hotkeyEnabled}
            />
          }
        />

        <SettingRow
          title={t('settings.captures.dictation.pasteDelay.title', 'Paste Settle Delay')}
          description={t(
            'settings.captures.dictation.pasteDelay.description',
            'Milliseconds to wait for window focus to settle before typing or pasting.'
          )}
          action={
            <div className="flex items-center gap-3 w-[240px]">
              <Slider
                min={10}
                max={200}
                step={10}
                value={[pasteDelayMs]}
                onValueChange={([val]) => update({ paste_delay_ms: val })}
                className="flex-1"
                disabled={!hotkeyEnabled}
              />
              <span className="font-mono text-xs text-muted-foreground w-12 text-right">
                {pasteDelayMs} ms
              </span>
            </div>
          }
        />
      </SettingSection>

      <SettingSection
        title={t('settings.captures.audioFeedback.title', 'Audio Feedback (Earcons)')}
        description={t(
          'settings.captures.audioFeedback.description',
          'Acoustic confirmation sounds when dictation begins and completes.'
        )}
      >
        <SettingRow
          title={t('settings.captures.audioFeedback.enabled.title', 'Sound Effects')}
          description={t(
            'settings.captures.audioFeedback.enabled.description',
            'Play an audible tone on recording start and stop.'
          )}
          htmlFor="audioFeedback"
          action={
            <Toggle
              id="audioFeedback"
              checked={audioFeedback}
              onCheckedChange={(v) => update({ audio_feedback: v })}
            />
          }
        />

        {audioFeedback && (
          <>
            <SettingRow
              title={t('settings.captures.audioFeedback.theme.title', 'Sound Theme')}
              description={t(
                'settings.captures.audioFeedback.theme.description',
                'Select between Pop and Marimba sound effects.'
              )}
              action={
                <Select
                  value={soundTheme}
                  onValueChange={(v) => {
                    update({ sound_theme: v as any });
                    playAudioFeedback('start', v as any, audioFeedbackVolume);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pop">Pop</SelectItem>
                    <SelectItem value="marimba">Marimba</SelectItem>
                  </SelectContent>
                </Select>
              }
            />

            <SettingRow
              title={t('settings.captures.audioFeedback.volume.title', 'Feedback Volume')}
              description={t(
                'settings.captures.audioFeedback.volume.description',
                'Adjust loudness of the recording start and stop cues.'
              )}
              action={
                <div className="flex items-center gap-3 w-[260px]">
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[Math.round(audioFeedbackVolume * 100)]}
                    onValueChange={([val]) => update({ audio_feedback_volume: val / 100 })}
                    className="flex-1"
                  />
                  <span className="font-mono text-xs text-muted-foreground w-10 text-right">
                    {Math.round(audioFeedbackVolume * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={handleTestAudio}
                    title="Test audio cue"
                  >
                    <Play className="h-3 w-3 mr-1 text-accent fill-accent" />
                    Test
                  </Button>
                </div>
              }
            />
          </>
        )}
      </SettingSection>

      <SettingSection
        title={t('settings.captures.transcription.title')}
        description={t('settings.captures.transcription.description')}
      >
        <SettingRow
          title={t('settings.captures.transcription.model.title')}
          description={t('settings.captures.transcription.model.description')}
          action={
            <Select
              value={sttModel}
              onValueChange={(v) => update({ stt_model: v as WhisperModelSize })}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="base">
                  {t('settings.captures.transcription.model.base', { tail: t('settings.captures.transcription.model.tail.fast') })}
                </SelectItem>
                <SelectItem value="small">
                  {t('settings.captures.transcription.model.small', { tail: t('settings.captures.transcription.model.tail.balanced') })}
                </SelectItem>
                <SelectItem value="medium">
                  {t('settings.captures.transcription.model.medium', { tail: t('settings.captures.transcription.model.tail.higher') })}
                </SelectItem>
                <SelectItem value="large">
                  {t('settings.captures.transcription.model.large', { tail: t('settings.captures.transcription.model.tail.best') })}
                </SelectItem>
                <SelectItem value="turbo">
                  {t('settings.captures.transcription.model.turbo', { tail: t('settings.captures.transcription.model.tail.nearBest') })}
                </SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <SettingRow
          title={t('settings.captures.transcription.language.title')}
          description={t('settings.captures.transcription.language.description')}
          action={
            <Select value={language} onValueChange={(v) => update({ language: v })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t('settings.captures.transcription.language.auto')}</SelectItem>
                <SelectItem value="en">{t('settings.captures.transcription.language.en')}</SelectItem>
                <SelectItem value="es">{t('settings.captures.transcription.language.es')}</SelectItem>
                <SelectItem value="fr">{t('settings.captures.transcription.language.fr')}</SelectItem>
                <SelectItem value="de">{t('settings.captures.transcription.language.de')}</SelectItem>
                <SelectItem value="ja">{t('settings.captures.transcription.language.ja')}</SelectItem>
                <SelectItem value="zh">{t('settings.captures.transcription.language.zh')}</SelectItem>
                <SelectItem value="hi">{t('settings.captures.transcription.language.hi')}</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <SettingRow
          title={t('settings.captures.transcription.translate.title', 'Translate to English')}
          description={t(
            'settings.captures.transcription.translate.description',
            'Automatically translate non-English spoken speech directly into English via Whisper.'
          )}
          htmlFor="translateToEnglish"
          action={
            <Toggle
              id="translateToEnglish"
              checked={translateToEnglish}
              onCheckedChange={(v) => update({ translate_to_english: v })}
            />
          }
        />

        <SettingRow
          title={t('settings.captures.transcription.fillerWords.title', 'Remove Filler Words')}
          description={t(
            'settings.captures.transcription.fillerWords.description',
            'Instant rule-based removal of filler words ("um", "uh", "er", "ah", "hmm") with zero latency.'
          )}
          htmlFor="removeFillerWords"
          action={
            <Toggle
              id="removeFillerWords"
              checked={removeFillerWords}
              onCheckedChange={(v) => update({ remove_filler_words: v })}
            />
          }
        />

        <SettingRow
          title={t('settings.captures.transcription.unloadTimeout.title', 'Model Idle Unload Timeout')}
          description={t(
            'settings.captures.transcription.unloadTimeout.description',
            'Automatically unload Whisper from memory when idle to free VRAM and RAM.'
          )}
          action={
            <Select
              value={String(modelUnloadTimeoutMinutes)}
              onValueChange={(v) => update({ model_unload_timeout_minutes: Number(v) })}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Never (keep in memory)</SelectItem>
                <SelectItem value="2">2 minutes</SelectItem>
                <SelectItem value="5">5 minutes (recommended)</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </SettingSection>

      <SettingSection
        title={t('settings.captures.dictionary.title', 'Custom Words & Vocabulary')}
        description={t(
          'settings.captures.dictionary.description',
          'Add domain-specific jargon, names, or acronyms (e.g. "Rheo", "FastAPI", "Kubernetes") to auto-correct phonetic STT misrecognitions.'
        )}
      >
        <SettingRow
          title={t('settings.captures.dictionary.words.title', 'Custom Words')}
          description={t(
            'settings.captures.dictionary.words.description',
            'Words and proper nouns to match and preserve during transcription.'
          )}
        >
          <div className="space-y-3 w-full">
            <div className="flex gap-2">
              <Input
                placeholder="Add custom word or phrase..."
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddWord();
                  }
                }}
                className="max-w-xs"
              />
              <Button size="sm" onClick={handleAddWord} disabled={!newWord.trim()}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
            {customWords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {customWords.map((word) => (
                  <Badge
                    key={word}
                    variant="secondary"
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium"
                  >
                    <span>{word}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWord(word)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title={`Remove ${word}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No custom words added yet. Add names, acronyms, or technical terms above.
              </p>
            )}
          </div>
        </SettingRow>

        <SettingRow
          title={t('settings.captures.dictionary.threshold.title', 'Correction Similarity Threshold')}
          description={t(
            'settings.captures.dictionary.threshold.description',
            'Minimum similarity (50% - 100%) required for fuzzy matching words against your custom dictionary.'
          )}
          action={
            <div className="flex items-center gap-3 w-[240px]">
              <Slider
                min={50}
                max={100}
                step={5}
                value={[Math.round(wordCorrectionThreshold * 100)]}
                onValueChange={([val]) => update({ word_correction_threshold: val / 100 })}
                className="flex-1"
              />
              <span className="font-mono text-xs text-muted-foreground w-10 text-right">
                {Math.round(wordCorrectionThreshold * 100)}%
              </span>
            </div>
          }
        />
      </SettingSection>

      <SettingSection
        title={t('settings.captures.refinement.title')}
        description={t('settings.captures.refinement.description')}
      >
        <SettingRow
          title={t('settings.captures.refinement.auto.title')}
          description={t('settings.captures.refinement.auto.description')}
          htmlFor="autoRefine"
          action={
            <Toggle
              id="autoRefine"
              checked={autoRefine}
              onCheckedChange={(v) => update({ auto_refine: v })}
            />
          }
        />

        <SettingRow
          title={t('settings.captures.refinement.model.title')}
          description={t('settings.captures.refinement.model.description')}
          action={
            <Select
              value={llmModel}
              onValueChange={(v) => update({ llm_model: v as Qwen3ModelSize })}
              disabled={!autoRefine}
            >
              <SelectTrigger className="w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.6B">
                  {t('settings.captures.refinement.model.size06', { tail: t('settings.captures.refinement.model.tail.veryFast') })}
                </SelectItem>
                <SelectItem value="1.7B">
                  {t('settings.captures.refinement.model.size17', { tail: t('settings.captures.refinement.model.tail.fast') })}
                </SelectItem>
                <SelectItem value="4B">
                  {t('settings.captures.refinement.model.size40', { tail: t('settings.captures.refinement.model.tail.fullQuality') })}
                </SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <SettingRow
          title={t('settings.captures.refinement.smartCleanup.title')}
          description={t('settings.captures.refinement.smartCleanup.description')}
          htmlFor="smartCleanup"
          action={
            <Toggle
              id="smartCleanup"
              checked={smartCleanup}
              onCheckedChange={(v) => update({ smart_cleanup: v })}
              disabled={!autoRefine}
            />
          }
        />

        <SettingRow
          title={t('settings.captures.refinement.selfCorrection.title')}
          description={t('settings.captures.refinement.selfCorrection.description')}
          htmlFor="selfCorrection"
          action={
            <Toggle
              id="selfCorrection"
              checked={selfCorrection}
              onCheckedChange={(v) => update({ self_correction: v })}
              disabled={!autoRefine}
            />
          }
        />

        <SettingRow
          title={t('settings.captures.refinement.preserveTechnical.title')}
          description={t('settings.captures.refinement.preserveTechnical.description')}
          htmlFor="preserveTechnical"
          action={
            <Toggle
              id="preserveTechnical"
              checked={preserveTechnical}
              onCheckedChange={(v) => update({ preserve_technical: v })}
              disabled={!autoRefine}
            />
          }
        />
      </SettingSection>

      <SettingSection
        title={t('settings.captures.playback.title')}
        description={t('settings.captures.playback.description')}
      >
        <SettingRow
          title={t('settings.captures.playback.defaultVoice.title')}
          description={t('settings.captures.playback.defaultVoice.description')}
          action={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 min-w-[220px] justify-between"
                  disabled={voices.length === 0}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {defaultVoice ? (
                      <span className="truncate">{defaultVoice.name}</span>
                    ) : (
                      <span className="truncate text-muted-foreground">
                        {voices.length === 0
                          ? t('settings.captures.playback.defaultVoice.noClonedVoices')
                          : t('settings.captures.playback.defaultVoice.noneSelected')}
                      </span>
                    )}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {t('settings.captures.playback.defaultVoice.clonedVoices')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {voices.map((v) => (
                  <DropdownMenuItem
                    key={v.id}
                    onClick={() => update({ default_playback_voice_id: v.id })}
                    className="gap-2.5 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{v.name}</div>
                      {v.description ? (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {v.description}
                        </div>
                      ) : null}
                    </div>
                    {v.id === defaultVoiceId && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      </SettingSection>

      <SettingSection
        title={t('settings.captures.storage.title')}
        description={t('settings.captures.storage.description')}
      >
        <SettingRow
          title={t('settings.captures.storage.folder.title')}
          description={capturesPath ?? t('settings.captures.storage.folder.description')}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={openCapturesFolder}
              disabled={opening || !capturesPath}
            >
              <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
              {t('settings.captures.storage.folder.open')}
            </Button>
          }
        />

        <SettingRow
          title={t('settings.captures.storage.retention.title', 'Audio Retention Policy')}
          description={t(
            'settings.captures.storage.retention.description',
            'Automatically prune audio recordings to preserve disk space.'
          )}
          action={
            <Select
              value={recordingRetentionPeriod}
              onValueChange={(v) => update({ recording_retention_period: v as any })}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preserve_limit">Keep within history limit</SelectItem>
                <SelectItem value="3_days">Keep for 3 days</SelectItem>
                <SelectItem value="2_weeks">Keep for 2 weeks</SelectItem>
                <SelectItem value="3_months">Keep for 3 months</SelectItem>
                <SelectItem value="never">Never save audio (ephemeral)</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <SettingRow
          title={t('settings.captures.storage.historyLimit.title', 'Maximum History Count')}
          description={t(
            'settings.captures.storage.historyLimit.description',
            'Maximum number of capture entries to retain. Oldest entries are purged when exceeded.'
          )}
          action={
            <Select
              value={String(historyLimit)}
              onValueChange={(v) => update({ history_limit: Number(v) })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 captures</SelectItem>
                <SelectItem value="100">100 captures</SelectItem>
                <SelectItem value="200">200 captures</SelectItem>
                <SelectItem value="500">500 captures</SelectItem>
                <SelectItem value="1000">1000 captures</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </SettingSection>
      </div>

      <aside className="hidden lg:block w-[280px] shrink-0 space-y-6 sticky top-0">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t('settings.captures.sidebar.aboutTitle')}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('settings.captures.sidebar.aboutBody')}
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t('settings.captures.sidebar.differencesTitle')}</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2.5">
              <Lock className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
              <span className="leading-relaxed">
                <span className="text-foreground font-medium">{t('settings.captures.sidebar.local.title')}</span>{' '}
                {t('settings.captures.sidebar.local.body')}
              </span>
            </li>
            <li className="flex gap-2.5">
              <Volume2 className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
              <span className="leading-relaxed">
                <span className="text-foreground font-medium">
                  {t('settings.captures.sidebar.playAs.title')}
                </span>{' '}
                {t('settings.captures.sidebar.playAs.body')}
              </span>
            </li>
            <li className="flex gap-2.5">
              <Laptop className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
              <span className="leading-relaxed">
                <span className="text-foreground font-medium">
                  {t('settings.captures.sidebar.crossPlatform.title')}
                </span>{' '}
                {t('settings.captures.sidebar.crossPlatform.body')}
              </span>
            </li>
          </ul>
          {isWindows && (
            <div className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2.5">
              <div className="flex items-start gap-2.5">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    {t('settings.captures.sidebar.windowsCaveat.title')}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t('settings.captures.sidebar.windowsCaveat.body')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Same six-gate checklist the CapturesTab empty state uses.
            Surfaces missing models / permissions persistently while
            users configure this page, so a red gate can't hide behind
            a green toggle. Hidden once every gate is green — no value
            in real estate full of checkmarks. */}
        {!readiness.allReady && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{t('captures.readiness.title')}</h3>
            <DictationReadinessChecklist readiness={readiness} compact />
          </div>
        )}
      </aside>
    </div>
  );
}
