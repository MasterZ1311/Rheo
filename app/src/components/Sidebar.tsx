import { Link, useMatchRoute } from '@tanstack/react-router';
import { AudioLines, Box, Captions, type LucideIcon, Mic, Settings, Volume2, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils/cn';
import { usePlatform } from '@/platform/PlatformContext';
import type { UpdateStatus } from '@/platform/types';
import { usePlayerStore } from '@/stores/playerStore';
import { version } from '../../package.json';

interface SidebarProps {
  isMacOS?: boolean;
}

const tabs: Array<{
  id: string;
  path: string;
  icon: LucideIcon;
  labelKey?: string;
  label?: string;
}> = [
  { id: 'main', path: '/', icon: Volume2, labelKey: 'nav.generate' },
  { id: 'stories', path: '/stories', icon: AudioLines, labelKey: 'nav.stories' },
  { id: 'captures', path: '/captures', icon: Captions, labelKey: 'nav.captures' },
  { id: 'voices', path: '/voices', icon: Mic, labelKey: 'nav.voices' },
  { id: 'effects', path: '/effects', icon: Wand2, labelKey: 'nav.effects' },
  { id: 'models', path: '/models', icon: Box, labelKey: 'nav.models' },
  { id: 'settings', path: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export function Sidebar({ isMacOS }: SidebarProps) {
  const { t } = useTranslation();
  const matchRoute = useMatchRoute();
  const isPlayerOpen = !!usePlayerStore((s) => s.audioUrl);
  const platform = usePlatform();

  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(platform.updater.getStatus());
  useEffect(() => platform.updater.subscribe(setUpdateStatus), [platform.updater]);

  return (
    <aside
      className={cn(
        'fixed left-3 top-14 bottom-3 w-16 rounded-2xl bg-sidebar/80 border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col items-center py-5 gap-5 z-30 transition-all',
        isMacOS && 'top-16',
      )}
    >
      {/* Rheo Monogram Mark */}
      <div className="mb-1 group cursor-pointer" title="Rheo by MasterZ1311">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background p-0.5 border border-border shadow-sm group-hover:scale-105 transition-transform">
          <span className="font-mono font-black text-sm tracking-tighter">
            R
          </span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col gap-2.5">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive =
            tab.path === '/'
              ? matchRoute({ to: '/', fuzzy: false })
              : matchRoute({ to: tab.path, fuzzy: true });

          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={cn(
                'relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group',
                isActive
                  ? 'bg-foreground/10 text-foreground shadow-sm backdrop-blur-md border border-foreground/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
              )}
              title={tab.label ?? (tab.labelKey ? t(tab.labelKey) : tab.id)}
              aria-label={tab.label ?? (tab.labelKey ? t(tab.labelKey) : tab.id)}
            >
              <Icon className="h-5 w-5 relative z-10 group-hover:scale-110 transition-transform" />
            </Link>
          );
        })}
      </div>

      {/* Version Footer */}
      <div
        className="mt-auto flex flex-col items-center gap-1 transition-all duration-300 text-center"
        style={{ paddingBottom: isPlayerOpen ? '6.5rem' : undefined }}
      >
        <span className="text-[9px] font-mono text-muted-foreground/60">v{version}</span>
        <a
          href="https://github.com/MasterZ1311"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[8px] font-mono text-cyan-400/50 hover:text-cyan-300 transition-colors tracking-tighter"
          title="MasterZ1311"
        >
          MasterZ1311
        </a>
        {updateStatus.available && (
          <Link
            to="/settings"
            className="text-[8px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded-full bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
          >
            {t('nav.updateBadge')}
          </Link>
        )}
      </div>
    </aside>
  );
}
