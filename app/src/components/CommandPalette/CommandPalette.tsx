import { useNavigate } from '@tanstack/react-router';
import {
  Activity,
  Bot,
  Calendar,
  Compass,
  Cpu,
  HardDrive,
  Home,
  Info,
  Mic2,
  Moon,
  PlusSquare,
  Search,
  Settings,
  Sliders,
  Sparkles,
  Sun,
  Terminal,
  User,
  Users,
  Volume2,
  Wand2,
} from 'lucide-react';
import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useUIStore } from '@/stores/uiStore';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Actions' | 'Theme';
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  onSelect: () => void;
}

export function CommandPalette() {
  const navigate = useNavigate();
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setProfileDialogOpen = useUIStore((s) => s.setProfileDialogOpen);
  const setUserNameModalOpen = useUIStore((s) => s.setUserNameModalOpen);
  const setTourOpen = useUIStore((s) => s.setTourOpen);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Close palette and execute action
  const runAction = React.useCallback(
    (action: () => void) => {
      setOpen(false);
      setQuery('');
      action();
    },
    [setOpen],
  );

  const items: CommandItem[] = React.useMemo(
    () => [
      // Navigation
      {
        id: 'nav-home',
        title: 'Stream Matrix',
        subtitle: 'Main Dashboard & Workspace Hub',
        category: 'Navigation',
        icon: Home,
        shortcut: '⌘1',
        onSelect: () => runAction(() => navigate({ to: '/' })),
      },
      {
        id: 'nav-studio',
        title: 'Voice Studio',
        subtitle: 'Neural Speech Synthesis & Text-to-Speech',
        category: 'Navigation',
        icon: Mic2,
        shortcut: '⌘2',
        onSelect: () => runAction(() => navigate({ to: '/studio' })),
      },
      {
        id: 'nav-stories',
        title: 'Resonance Timeline',
        subtitle: 'Multi-Track Audio Timeline & Stories',
        category: 'Navigation',
        icon: Calendar,
        shortcut: '⌘3',
        onSelect: () => runAction(() => navigate({ to: '/stories' })),
      },
      {
        id: 'nav-voices',
        title: 'Voice Profiles',
        subtitle: 'Manage & Clone Custom Neural Voices',
        category: 'Navigation',
        icon: Users,
        shortcut: '⌘4',
        onSelect: () => runAction(() => navigate({ to: '/voices' })),
      },
      {
        id: 'nav-gpu',
        title: 'Harmonics & Inference',
        subtitle: 'GPU Acceleration, VRAM & Model Benchmarks',
        category: 'Navigation',
        icon: Cpu,
        shortcut: '⌘5',
        onSelect: () => runAction(() => navigate({ to: '/settings/gpu' })),
      },
      {
        id: 'nav-captures',
        title: 'Zero-Latency Captures',
        subtitle: 'System Audio Recording & Dictation',
        category: 'Navigation',
        icon: Volume2,
        onSelect: () => runAction(() => navigate({ to: '/captures' })),
      },
      {
        id: 'nav-effects',
        title: 'Voice Effects Matrix',
        subtitle: 'DSP Chain, Pitch, Reverb & Parametric EQ',
        category: 'Navigation',
        icon: Wand2,
        onSelect: () => runAction(() => navigate({ to: '/effects' })),
      },
      {
        id: 'nav-models',
        title: 'Neural Model Depot',
        subtitle: 'Download & Switch TTS Core Engines',
        category: 'Navigation',
        icon: HardDrive,
        onSelect: () => runAction(() => navigate({ to: '/models' })),
      },
      {
        id: 'nav-settings',
        title: 'Settings',
        subtitle: 'Audio Engine, MCP, Storage & Preferences',
        category: 'Navigation',
        icon: Settings,
        shortcut: '⌘,',
        onSelect: () => runAction(() => navigate({ to: '/settings' })),
      },
      {
        id: 'nav-logs',
        title: 'Backend Diagnostics & Logs',
        subtitle: 'Inspect Realtime Python Server Output',
        category: 'Navigation',
        icon: Terminal,
        onSelect: () => runAction(() => navigate({ to: '/settings/logs' })),
      },
      {
        id: 'nav-mcp',
        title: 'Model Context Protocol (MCP)',
        subtitle: 'Configure AI Agents & External Clients',
        category: 'Navigation',
        icon: Bot,
        onSelect: () => runAction(() => navigate({ to: '/settings/mcp' })),
      },
      {
        id: 'nav-changelog',
        title: "What's New & Release Notes",
        subtitle: 'Explore Recent Updates & Improvements',
        category: 'Navigation',
        icon: Sparkles,
        onSelect: () => runAction(() => navigate({ to: '/settings/changelog' })),
      },
      {
        id: 'nav-about',
        title: 'About Rheo',
        subtitle: 'Version Info, Architecture & Sovereign Licenses',
        category: 'Navigation',
        icon: Info,
        onSelect: () => runAction(() => navigate({ to: '/settings/about' })),
      },

      // Actions
      {
        id: 'action-new-voice',
        title: 'Create Voice Profile',
        subtitle: 'Clone or design a new custom voice',
        category: 'Actions',
        icon: PlusSquare,
        shortcut: '⌘N',
        onSelect: () => runAction(() => setProfileDialogOpen(true)),
      },
      {
        id: 'action-toggle-sidebar',
        title: 'Toggle Sidebar Expansion',
        subtitle: 'Collapse or expand navigation rail',
        category: 'Actions',
        icon: Sliders,
        shortcut: '⌘B',
        onSelect: () => runAction(() => toggleSidebar()),
      },
      {
        id: 'action-profile-name',
        title: 'Edit User Identity',
        subtitle: 'Customize active profile display name',
        category: 'Actions',
        icon: User,
        onSelect: () => runAction(() => setUserNameModalOpen(true)),
      },
      {
        id: 'action-tour',
        title: 'Launch Interactive Tour',
        subtitle: 'Walk through studio features step by step',
        category: 'Actions',
        icon: Compass,
        onSelect: () => runAction(() => setTourOpen(true)),
      },

      // Theme
      {
        id: 'theme-dark',
        title: 'Theme: Dark Mode',
        subtitle: theme === 'dark' ? 'Currently Active' : 'Switch to Dark Palette',
        category: 'Theme',
        icon: Moon,
        onSelect: () => runAction(() => setTheme('dark')),
      },
      {
        id: 'theme-light',
        title: 'Theme: Light Mode',
        subtitle: theme === 'light' ? 'Currently Active' : 'Switch to Light Palette',
        category: 'Theme',
        icon: Sun,
        onSelect: () => runAction(() => setTheme('light')),
      },
      {
        id: 'theme-system',
        title: 'Theme: Match Operating System',
        subtitle: theme === 'system' ? 'Currently Active' : 'Follow OS Appearance',
        category: 'Theme',
        icon: Activity,
        onSelect: () => runAction(() => setTheme('system')),
      },
    ],
    [
      navigate,
      runAction,
      setProfileDialogOpen,
      setTourOpen,
      setUserNameModalOpen,
      toggleSidebar,
      theme,
      setTheme,
    ],
  );

  // Filter items based on query
  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return items;
    const lower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        item.subtitle?.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower),
    );
  }, [items, query]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].onSelect();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredItems, selectedIndex]);

  // Focus input on open
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden bg-[#141724]/95 backdrop-blur-2xl border-white/[0.1] text-slate-100 shadow-2xl">
        <DialogTitle className="sr-only">Command Palette & Quick Navigation</DialogTitle>
        <DialogDescription className="sr-only">
          Search commands, navigate studio pages, and run quick actions
        </DialogDescription>

        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
          <Search className="h-5 w-5 text-[#8E95A5] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, page name, or action..."
            className="w-full bg-transparent text-sm text-white placeholder-[#8E95A5] focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-[#8E95A5] bg-white/[0.05] rounded border border-white/[0.08]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#8E95A5]">
              No commands or pages matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#F97316] text-white shadow-sm'
                      : 'text-[#C5CAD4] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-white/[0.06] text-[#8E95A5]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-medium truncate ${isSelected ? 'text-white' : 'text-slate-100'}`}>
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p
                          className={`text-[11px] truncate ${
                            isSelected ? 'text-white/80' : 'text-[#8E95A5]'
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-white/[0.04] text-[#8E95A5]'
                      }`}
                    >
                      {item.category}
                    </span>
                    {item.shortcut && (
                      <kbd
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-black/30 text-white'
                            : 'bg-white/[0.08] text-slate-300'
                        }`}
                      >
                        {item.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06] bg-black/20 text-[11px] text-[#8E95A5]">
          <div className="flex items-center gap-3">
            <span>&uarr;&darr; Navigate</span>
            <span>&crarr; Select</span>
            <span>ESC Close</span>
          </div>
          <span className="font-mono text-[10px]">Rheo Studio Sovereign AI</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
