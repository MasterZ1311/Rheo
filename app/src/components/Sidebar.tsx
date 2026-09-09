import { Link, useMatchRoute } from '@tanstack/react-router';
import {
  Calendar,
  Compass,
  Home,
  LogOut,
  PieChart,
  PlusSquare,
  Settings,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils/cn';
import { usePlatform } from '@/platform/PlatformContext';
import { usePlayerStore } from '@/stores/playerStore';
import { useUIStore } from '@/stores/uiStore';
import rheoLogo from '@/assets/logo.png';

interface SidebarProps {
  isMacOS?: boolean;
}

export function Sidebar({ isMacOS }: SidebarProps) {
  const { t } = useTranslation();
  const matchRoute = useMatchRoute();
  const isPlayerOpen = !!usePlayerStore((s) => s.audioUrl);
  const setProfileDialogOpen = useUIStore((s) => s.setProfileDialogOpen);
  const platform = usePlatform();

  const isHomeActive = matchRoute({ to: '/', fuzzy: false });
  const isTimelineActive = matchRoute({ to: '/stories', fuzzy: true });
  const isStudioActive = matchRoute({ to: '/studio', fuzzy: true });
  const isMetricsActive = matchRoute({ to: '/settings/gpu', fuzzy: true });
  const isSettingsActive = matchRoute({ to: '/settings', fuzzy: true }) && !isMetricsActive;

  const handleExit = () => {
    if (typeof window !== 'undefined' && 'window' in platform) {
      // In Tauri or browser environment, trigger window close or minimize
      try {
        window.close();
      } catch {
        // Fallback
      }
    }
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 w-16 bg-[#141724] border-r border-white/[0.06] flex flex-col items-center py-5 z-40 select-none shadow-2xl transition-all',
        isMacOS && 'pt-9',
      )}
    >
      {/* Top App Mark */}
      <Link to="/" className="mb-6 group cursor-pointer" title="Rheo · Stream Matrix">
        <div className="relative flex h-9 w-9 items-center justify-center group-hover:scale-105 transition-transform">
          <img
            src={rheoLogo}
            alt="Rheo"
            className="h-8 w-8 object-contain rounded-full shadow-md"
          />
        </div>
      </Link>

      {/* Main Navigation Stack */}
      <nav className="flex flex-col items-center gap-4 flex-1">
        {/* 1. Stream Matrix (Home / Dashboard) */}
        <Link
          to="/"
          className={cn(
            'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group',
            isHomeActive
              ? 'text-[#F97316] bg-[#F97316]/10'
              : 'text-[#8E95A5] hover:text-white hover:bg-white/[0.05]',
          )}
          title="Stream Matrix (Dashboard)"
          aria-label="Stream Matrix"
        >
          <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
          {isHomeActive && (
            <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#F97316]" />
          )}
        </Link>

        {/* 2. Timeline (Calendar & Capture History) */}
        <Link
          to="/stories"
          className={cn(
            'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group',
            isTimelineActive
              ? 'text-[#F97316] bg-[#F97316]/10'
              : 'text-[#8E95A5] hover:text-white hover:bg-white/[0.05]',
          )}
          title="Resonance Timeline"
          aria-label="Resonance Timeline"
        >
          <Calendar className="h-5 w-5 group-hover:scale-110 transition-transform" />
          {isTimelineActive && (
            <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#F97316]" />
          )}
        </Link>

        {/* 3. Voice Studio (Speech Synthesis) */}
        <Link
          to="/studio"
          className={cn(
            'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group',
            isStudioActive
              ? 'text-[#F97316] bg-[#F97316]/10'
              : 'text-[#8E95A5] hover:text-white hover:bg-white/[0.05]',
          )}
          title="Voice Studio"
          aria-label="Voice Studio"
        >
          <Compass className="h-5 w-5 group-hover:scale-110 transition-transform" />
          {isStudioActive && (
            <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#F97316]" />
          )}
        </Link>

        {/* 4. Harmonics (GPU & Metrics) */}
        <Link
          to="/settings/gpu"
          className={cn(
            'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group',
            isMetricsActive
              ? 'text-[#F97316] bg-[#F97316]/10'
              : 'text-[#8E95A5] hover:text-white hover:bg-white/[0.05]',
          )}
          title="Harmonics & Inference"
          aria-label="Harmonics"
        >
          <PieChart className="h-5 w-5 group-hover:scale-110 transition-transform" />
          {isMetricsActive && (
            <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#F97316]" />
          )}
        </Link>

        {/* 5. New Voice (Create Trigger) */}
        <button
          type="button"
          onClick={() => setProfileDialogOpen(true)}
          className="relative w-10 h-10 rounded-xl flex items-center justify-center text-[#8E95A5] hover:text-white hover:bg-white/[0.05] transition-all duration-200 group cursor-pointer"
          title="New Voice Profile"
          aria-label="Create Voice"
        >
          <PlusSquare className="h-5 w-5 group-hover:scale-110 transition-transform" />
        </button>
      </nav>

      {/* Bottom Stack: Settings & Exit */}
      <div
        className="flex flex-col items-center gap-3 pt-3"
        style={{ paddingBottom: isPlayerOpen ? '6.5rem' : undefined }}
      >
        {/* Settings */}
        <Link
          to="/settings"
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group',
            isSettingsActive
              ? 'text-[#F97316] bg-[#F97316]/10'
              : 'text-[#8E95A5] hover:text-white hover:bg-white/[0.05]',
          )}
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5 group-hover:rotate-45 transition-transform" />
        </Link>

        {/* Exit / Disconnect */}
        <button
          type="button"
          onClick={handleExit}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8E95A5] hover:text-[#EF4444] hover:bg-red-500/10 transition-all duration-200 group cursor-pointer"
          title="Disconnect / Exit"
          aria-label="Exit"
        >
          <LogOut className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </aside>
  );
}
