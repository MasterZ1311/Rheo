import { Link, useMatchRoute, useNavigate } from '@tanstack/react-router';
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Home,
  LogOut,
  Mic2,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';
import * as React from 'react';
import rheoLogo from '@/assets/logo.png';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useServerHealth } from '@/lib/hooks/useServer';
import { cn } from '@/lib/utils/cn';
import { usePlatform } from '@/platform/PlatformContext';
import { usePlayerStore } from '@/stores/playerStore';
import { useServerStore } from '@/stores/serverStore';
import { useUIStore } from '@/stores/uiStore';

interface SidebarProps {
  isMacOS?: boolean;
}

interface NavItemConfig {
  id: string;
  to: string;
  title: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut: string;
  badge?: number;
}

export function Sidebar({ isMacOS }: SidebarProps) {
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();
  const platform = usePlatform();

  // Stores
  const isPlayerOpen = !!usePlayerStore((s) => s.audioUrl);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setProfileDialogOpen = useUIStore((s) => s.setProfileDialogOpen);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const setUserNameModalOpen = useUIStore((s) => s.setUserNameModalOpen);
  const userName = useUIStore((s) => s.userName) || 'MasterZ1311';
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const dashboardTasks = useUIStore((s) => s.dashboardTasks);
  const serverUrl = useServerStore((s) => s.serverUrl);
  const serverMode = useServerStore((s) => s.mode);

  // Server health hook
  const { data: health, isLoading: isHealthLoading, isError: isHealthError } = useServerHealth();

  // Pending tasks count as notification badge
  const pendingTasksCount = React.useMemo(
    () => dashboardTasks.filter((t) => !t.completed).length,
    [dashboardTasks],
  );

  // Active route checks
  const isHomeActive = !!matchRoute({ to: '/', fuzzy: false });
  const isStudioActive = !!matchRoute({ to: '/studio', fuzzy: true });
  const isTimelineActive = !!matchRoute({ to: '/stories', fuzzy: true });
  const isVoicesActive = !!matchRoute({ to: '/voices', fuzzy: true });
  const isMetricsActive = !!matchRoute({ to: '/settings/gpu', fuzzy: true });
  const isSettingsActive = !!matchRoute({ to: '/settings', fuzzy: true }) && !isMetricsActive;

  // Primary Navigation Stack
  const navItems: NavItemConfig[] = [
    {
      id: 'home',
      to: '/',
      title: 'Stream Matrix (Dashboard)',
      label: 'Stream Matrix',
      icon: Home,
      shortcut: '⌘1',
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
    },
    {
      id: 'studio',
      to: '/studio',
      title: 'Voice Studio',
      label: 'Voice Studio',
      icon: Mic2,
      shortcut: '⌘2',
    },
    {
      id: 'stories',
      to: '/stories',
      title: 'Resonance Timeline',
      label: 'Resonance Timeline',
      icon: Calendar,
      shortcut: '⌘3',
    },
    {
      id: 'voices',
      to: '/voices',
      title: 'Voice Profiles',
      label: 'Voice Profiles',
      icon: Users,
      shortcut: '⌘4',
    },
    {
      id: 'harmonics',
      to: '/settings/gpu',
      title: 'Harmonics & Inference',
      label: 'Harmonics & GPU',
      icon: Cpu,
      shortcut: '⌘5',
    },
  ];

  // Cycle theme
  const handleCycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  // Safe window close handler
  const handleExit = async () => {
    if (platform.metadata.isTauri) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
        return;
      } catch (err) {
        console.warn('Tauri window close failed, falling back:', err);
      }
    }
    try {
      window.close();
    } catch {
      // Fallback
    }
  };

  // Keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isModifier = e.metaKey || e.ctrlKey;
      if (!isModifier) return;

      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      } else if (e.key === '1') {
        e.preventDefault();
        navigate({ to: '/' });
      } else if (e.key === '2') {
        e.preventDefault();
        navigate({ to: '/studio' });
      } else if (e.key === '3') {
        e.preventDefault();
        navigate({ to: '/stories' });
      } else if (e.key === '4') {
        e.preventDefault();
        navigate({ to: '/voices' });
      } else if (e.key === '5') {
        e.preventDefault();
        navigate({ to: '/settings/gpu' });
      } else if (e.key === ',') {
        e.preventDefault();
        navigate({ to: '/settings' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, setCommandPaletteOpen, navigate]);

  // Server health state evaluation
  const serverStatus = React.useMemo(() => {
    if (isHealthLoading) {
      return {
        label: 'Connecting...',
        color: 'bg-amber-400',
        pulse: true,
        details: 'Checking connection to neural inference engine',
      };
    }
    if (isHealthError || !health) {
      return {
        label: 'Server Disconnected',
        color: 'bg-rose-500',
        pulse: false,
        details: 'Python backend offline or unreachable',
      };
    }
    if (health.model_loaded) {
      return {
        label: 'Engine Active',
        color: 'bg-emerald-400',
        pulse: true,
        details: `Loaded on ${health.gpu_available ? (health.gpu_type || 'GPU') : 'CPU'}`,
      };
    }
    return {
      label: 'Ready · On Demand',
      color: 'bg-emerald-500',
      pulse: false,
      details: 'Synthesizer ready to instantiate on generation',
    };
  }, [health, isHealthLoading, isHealthError]);

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 bg-[#141724] border-r border-white/[0.08] flex flex-col z-40 select-none shadow-2xl transition-[width] duration-300 ease-in-out',
          sidebarOpen ? 'w-60' : 'w-16 items-center',
          isMacOS && 'pt-9',
        )}
        role="navigation"
        aria-label="Rheo Studio Navigation"
      >
        {/* Top Header: Logo + Brand + Collapse Toggle */}
        <div
          className={cn(
            'flex items-center py-4 border-b border-white/[0.06]',
            sidebarOpen ? 'px-4 justify-between' : 'justify-center px-2',
          )}
        >
          <Link
            to="/"
            className="group flex items-center gap-3 cursor-pointer overflow-hidden"
            title="Rheo · Stream Matrix"
            aria-label="Rheo Home"
          >
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center group-hover:scale-105 transition-transform">
              <img
                src={rheoLogo}
                alt="Rheo"
                className="h-8 w-8 object-contain rounded-full shadow-md"
              />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', serverStatus.color)} />
                <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', serverStatus.color)} />
              </span>
            </div>

            {sidebarOpen && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-white">
                    Rheo
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F97316]/20 text-[#F97316] font-semibold border border-[#F97316]/30">
                    v0.5.0
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#8E95A5] truncate">
                  Sovereign Studio
                </span>
              </div>
            )}
          </Link>

          {sidebarOpen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8E95A5] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="flex items-center gap-1.5">
                  Collapse sidebar <kbd className="font-mono text-[10px] bg-white/10 px-1 rounded">⌘B</kbd>
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Quick Search / Command Trigger */}
        <div className={cn('pt-3 pb-2', sidebarOpen ? 'px-3' : 'px-2')}>
          {sidebarOpen ? (
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs text-[#8E95A5] hover:text-white transition-all cursor-pointer group"
              title="Search and commands (⌘K)"
              aria-label="Quick Search"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 group-hover:text-[#F97316] transition-colors" />
                <span>Search & Commands</span>
              </div>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/[0.08] text-slate-300">
                ⌘K
              </kbd>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setCommandPaletteOpen(true)}
                  className="relative w-10 h-10 rounded-xl flex items-center justify-center text-[#8E95A5] hover:text-white hover:bg-white/[0.06] transition-all group cursor-pointer"
                  title="Search & Commands (⌘K)"
                  aria-label="Quick Search"
                >
                  <Search className="h-4 w-4 group-hover:scale-110 group-hover:text-[#F97316] transition-all" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="flex items-center gap-1.5">
                  Search & Commands <kbd className="font-mono text-[10px] bg-white/10 px-1 rounded">⌘K</kbd>
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Main Navigation Stack */}
        <nav className={cn('flex flex-col gap-1.5 flex-1 overflow-y-auto px-2 py-1', sidebarOpen && 'px-3')}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === '/'
                ? isHomeActive
                : item.to === '/studio'
                ? isStudioActive
                : item.to === '/stories'
                ? isTimelineActive
                : item.to === '/voices'
                ? isVoicesActive
                : item.to === '/settings/gpu'
                ? isMetricsActive
                : false;

            const buttonContent = (
              <Link
                key={item.id}
                to={item.to}
                title={item.title}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative rounded-xl flex items-center transition-all duration-200 group cursor-pointer',
                  sidebarOpen
                    ? 'w-full px-3 py-2.5 gap-3'
                    : 'w-10 h-10 justify-center mx-auto',
                  isActive
                    ? 'text-[#F97316] bg-[#F97316]/10 font-semibold shadow-xs'
                    : 'text-[#8E95A5] hover:text-white hover:bg-white/[0.05]',
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0 transition-transform group-hover:scale-110', isActive && 'text-[#F97316]')} />

                {sidebarOpen && (
                  <span className="text-xs truncate font-medium flex-1 text-left">
                    {item.label}
                  </span>
                )}

                {/* Left Active Pill Indicator */}
                {isActive && (
                  <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#F97316]" />
                )}

                {/* Notification Badge */}
                {typeof item.badge === 'number' && (
                  <span
                    className={cn(
                      'rounded-full bg-[#F97316] text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-sm animate-pulse',
                      sidebarOpen
                        ? 'px-1.5 py-0.5'
                        : 'absolute -top-1 -right-1 h-4 w-4',
                    )}
                  >
                    {item.badge}
                  </span>
                )}

                {sidebarOpen && (
                  <kbd className="hidden lg:inline-flex text-[9px] font-mono text-[#8E95A5] opacity-50 group-hover:opacity-100 transition-opacity">
                    {item.shortcut}
                  </kbd>
                )}
              </Link>
            );

            if (sidebarOpen) {
              return buttonContent;
            }

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                <TooltipContent side="right">
                  <p className="flex items-center gap-1.5">
                    {item.label} <kbd className="font-mono text-[10px] bg-white/10 px-1 rounded">{item.shortcut}</kbd>
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Action Button: Create New Voice Profile */}
          <div className="pt-2">
            {sidebarOpen ? (
              <button
                type="button"
                onClick={() => setProfileDialogOpen(true)}
                title="New Voice Profile"
                aria-label="New Voice Profile"
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#EA580C] to-[#FB923C] text-white text-xs font-semibold shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />
                <span className="truncate">New Voice Profile</span>
              </button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setProfileDialogOpen(true)}
                    title="New Voice Profile"
                    aria-label="New Voice Profile"
                    className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-tr from-[#EA580C] to-[#FB923C] text-white hover:brightness-110 transition-all shadow-md group cursor-pointer mx-auto"
                  >
                    <Plus className="h-5 w-5 stroke-[2.5] group-hover:scale-110 transition-transform" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="flex items-center gap-1.5">
                    New Voice Profile <kbd className="font-mono text-[10px] bg-white/10 px-1 rounded">⌘N</kbd>
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </nav>

        {/* Bottom Utility Stack */}
        <div
          className={cn(
            'flex flex-col gap-2 pt-3 border-t border-white/[0.06] bg-[#10131F]/60',
            sidebarOpen ? 'px-3 pb-3' : 'px-2 pb-3 items-center',
          )}
          style={{ paddingBottom: isPlayerOpen ? '6.5rem' : undefined }}
        >
          {/* Server Health / Telemetry Indicator */}
          <Popover>
            <PopoverTrigger asChild>
              {sidebarOpen ? (
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] text-[11px] text-[#8E95A5] hover:text-white transition-colors cursor-pointer group"
                  aria-label="Server status and telemetry"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('h-2 w-2 rounded-full shrink-0', serverStatus.color, serverStatus.pulse && 'animate-pulse')} />
                    <span className="truncate font-medium">{serverStatus.label}</span>
                  </div>
                  <Activity className="h-3.5 w-3.5 text-[#8E95A5] group-hover:text-emerald-400 transition-colors" />
                </button>
              ) : (
                <button
                  type="button"
                  className="relative w-10 h-10 rounded-xl flex items-center justify-center text-[#8E95A5] hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer group"
                  title={`Backend: ${serverStatus.label}`}
                  aria-label="Backend status"
                >
                  <span className={cn('h-2.5 w-2.5 rounded-full', serverStatus.color, serverStatus.pulse && 'animate-pulse')} />
                </button>
              )}
            </PopoverTrigger>
            <PopoverContent side="right" className="w-64 bg-[#141724] border-white/10 text-slate-100 p-3.5 shadow-2xl rounded-2xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#F97316]" /> Inference Telemetry
                  </span>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium text-white', serverStatus.color)}>
                    {serverStatus.label}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#8E95A5]">
                  <div className="flex justify-between">
                    <span>Engine Mode:</span>
                    <span className="text-slate-200 capitalize font-mono text-[11px]">{serverMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Server Host:</span>
                    <span className="text-slate-200 font-mono text-[11px] truncate max-w-[120px]">{serverUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hardware:</span>
                    <span className="text-slate-200 font-medium">
                      {health?.gpu_available ? (health.gpu_type || 'Dedicated GPU') : 'CPU Core'}
                    </span>
                  </div>
                  {typeof health?.vram_used_mb === 'number' && (
                    <div className="flex justify-between">
                      <span>VRAM Allocation:</span>
                      <span className="text-emerald-400 font-mono font-medium">{health.vram_used_mb} MB</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/[0.08]">
                  <Link
                    to="/settings/gpu"
                    className="w-full inline-flex items-center justify-center py-1.5 px-3 rounded-lg bg-[#F97316]/10 text-[#F97316] hover:bg-[#F97316]/20 text-xs font-medium transition-colors"
                  >
                    View GPU & Model Harmonics &rarr;
                  </Link>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Theme Toggle Button */}
          {sidebarOpen ? (
            <button
              type="button"
              onClick={handleCycleTheme}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#8E95A5] hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer group"
              title={`Theme: ${theme}`}
              aria-label="Toggle theme appearance"
            >
              <div className="flex items-center gap-2.5">
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4 group-hover:text-amber-300 transition-colors" />
                ) : theme === 'light' ? (
                  <Sun className="h-4 w-4 group-hover:text-amber-400 transition-colors" />
                ) : (
                  <Activity className="h-4 w-4 group-hover:text-sky-400 transition-colors" />
                )}
                <span className="capitalize">{theme} Theme</span>
              </div>
              <span className="text-[10px] text-[#8E95A5] font-mono">Switch</span>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleCycleTheme}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8E95A5] hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer group"
                  title={`Toggle Theme (${theme})`}
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Moon className="h-4 w-4 group-hover:text-amber-300 transition-transform group-hover:scale-110" />
                  ) : theme === 'light' ? (
                    <Sun className="h-4 w-4 group-hover:text-amber-400 transition-transform group-hover:scale-110" />
                  ) : (
                    <Activity className="h-4 w-4 group-hover:text-sky-400 transition-transform group-hover:scale-110" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Toggle Theme ({theme})</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Settings Link */}
          {sidebarOpen ? (
            <Link
              to="/settings"
              title="Settings"
              aria-label="Settings"
              aria-current={isSettingsActive ? 'page' : undefined}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer group',
                isSettingsActive
                  ? 'text-[#F97316] bg-[#F97316]/10 font-semibold'
                  : 'text-[#8E95A5] hover:text-white hover:bg-white/[0.05]',
              )}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="h-4 w-4 group-hover:rotate-45 transition-transform" />
                <span>Settings</span>
              </div>
              <kbd className="font-mono text-[10px] text-[#8E95A5]">⌘,</kbd>
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/settings"
                  title="Settings"
                  aria-label="Settings"
                  aria-current={isSettingsActive ? 'page' : undefined}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all group cursor-pointer',
                    isSettingsActive
                      ? 'text-[#F97316] bg-[#F97316]/10 font-semibold'
                      : 'text-[#8E95A5] hover:text-white hover:bg-white/[0.05]',
                  )}
                >
                  <Settings className="h-5 w-5 group-hover:rotate-45 transition-transform" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="flex items-center gap-1.5">
                  Settings <kbd className="font-mono text-[10px] bg-white/10 px-1 rounded">⌘,</kbd>
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* User Profile Pill */}
          {sidebarOpen ? (
            <div
              onClick={() => setUserNameModalOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.04] transition-all cursor-pointer group"
              title={`Signed in as ${userName} · Click to edit`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#EA580C] to-[#FB923C] text-white font-bold text-xs shadow-xs">
                  {userName.charAt(0).toUpperCase()}
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-[#141724]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-white truncate group-hover:text-[#F97316] transition-colors">
                    {userName}
                  </span>
                  <span className="text-[10px] text-[#8E95A5] truncate">Studio Lead</span>
                </div>
              </div>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setUserNameModalOpen(true)}
                  className="relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/[0.05] transition-all cursor-pointer group"
                  title={`User Profile: ${userName}`}
                  aria-label="User Profile"
                >
                  <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#EA580C] to-[#FB923C] text-white font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
                    {userName.charAt(0).toUpperCase()}
                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-[#141724]" />
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Profile: {userName}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Disconnect / Exit Button */}
          {sidebarOpen ? (
            <button
              type="button"
              onClick={handleExit}
              title="Disconnect / Exit"
              aria-label="Exit"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#8E95A5] hover:text-[#EF4444] hover:bg-red-500/10 transition-colors cursor-pointer group"
            >
              <LogOut className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              <span>Disconnect & Exit</span>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleExit}
                  title="Disconnect / Exit"
                  aria-label="Disconnect / Exit"
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8E95A5] hover:text-[#EF4444] hover:bg-red-500/10 transition-all cursor-pointer group"
                >
                  <LogOut className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Disconnect / Exit</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Expand Sidebar Trigger Button when Collapsed */}
          {!sidebarOpen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8E95A5] hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="flex items-center gap-1.5">
                  Expand sidebar <kbd className="font-mono text-[10px] bg-white/10 px-1 rounded">⌘B</kbd>
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
