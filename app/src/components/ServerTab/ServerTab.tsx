import { Link, Outlet, useMatchRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Sliders,
  Volume2,
  Captions,
  Bot,
  Cpu,
  Terminal,
  Sparkles,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { BOTTOM_SAFE_AREA_PADDING } from '@/lib/constants/ui';
import { cn } from '@/lib/utils/cn';
import { usePlatform } from '@/platform/PlatformContext';
import { usePlayerStore } from '@/stores/playerStore';

interface SettingsTab {
  labelKey?: string;
  label?: string;
  icon: LucideIcon;
  path:
    | '/settings'
    | '/settings/generation'
    | '/settings/captures'
    | '/settings/mcp'
    | '/settings/gpu'
    | '/settings/logs'
    | '/settings/changelog'
    | '/settings/about';
  tauriOnly?: boolean;
}

const tabs: SettingsTab[] = [
  { labelKey: 'settings.tabs.general', icon: Sliders, path: '/settings' },
  { labelKey: 'settings.tabs.generation', icon: Volume2, path: '/settings/generation' },
  { labelKey: 'settings.tabs.captures', icon: Captions, path: '/settings/captures' },
  { labelKey: 'settings.tabs.mcp', icon: Bot, path: '/settings/mcp' },
  { labelKey: 'settings.tabs.gpu', icon: Cpu, path: '/settings/gpu', tauriOnly: true },
  { labelKey: 'settings.tabs.logs', icon: Terminal, path: '/settings/logs', tauriOnly: true },
  { labelKey: 'settings.tabs.changelog', icon: Sparkles, path: '/settings/changelog' },
  { labelKey: 'settings.tabs.about', icon: Info, path: '/settings/about' },
];

export function SettingsLayout() {
  const { t } = useTranslation();
  const platform = usePlatform();
  const isPlayerVisible = !!usePlayerStore((state) => state.audioUrl);
  const matchRoute = useMatchRoute();

  return (
    <div className="flex flex-col h-full min-h-0 py-4">
      <nav className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.03)] shrink-0 overflow-x-auto mb-4">
        {tabs.map((tab) => {
          if (tab.tauriOnly && !platform.metadata.isTauri) return null;

          const Icon = tab.icon;
          const isActive =
            tab.path === '/settings'
              ? matchRoute({ to: tab.path, fuzzy: false })
              : matchRoute({ to: tab.path });

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer',
                isActive
                  ? 'bg-[#F97316] text-white shadow-xs font-semibold'
                  : 'text-[#6B7280] hover:text-[#111827] hover:bg-black/[0.04]',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label ?? (tab.labelKey ? t(tab.labelKey) : '')}</span>
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          'flex-1 overflow-y-auto pb-6',
          isPlayerVisible && BOTTOM_SAFE_AREA_PADDING,
        )}
      >
        <Outlet />
      </div>
    </div>
  );
}
