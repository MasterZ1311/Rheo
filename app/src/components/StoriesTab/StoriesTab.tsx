import { FloatingGenerateBox } from '@/components/Generation/FloatingGenerateBox';
import { usePlayerStore } from '@/stores/playerStore';
import { StoryContent } from './StoryContent';
import { StoryList } from './StoryList';

export function StoriesTab() {
  const audioUrl = usePlayerStore((state) => state.audioUrl);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden py-4">
      {/* Main content area */}
      <div className="flex-1 min-h-0 flex gap-6 overflow-hidden relative">
        {/* Left Column - Story List Card */}
        <div className="bg-white dark:bg-[#171A27] rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] border border-black/[0.04] dark:border-white/[0.08] flex flex-col min-h-0 overflow-hidden w-full max-w-[360px] shrink-0">
          <StoryList />
        </div>

        {/* Right Column - Story Content Card */}
        <div className="bg-white dark:bg-[#171A27] rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] border border-black/[0.04] dark:border-white/[0.08] flex flex-col min-h-0 overflow-hidden flex-1">
          <StoryContent />
        </div>

        {/* Floating Generate Box - position is managed via storyStore.trackEditorHeight */}
        <FloatingGenerateBox showVoiceSelector isPlayerOpen={!!audioUrl} />
      </div>
    </div>
  );
}
