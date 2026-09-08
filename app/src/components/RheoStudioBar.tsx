import { Activity, Compass, Cpu, ShieldCheck } from 'lucide-react';
import rheoLogo from '@/assets/logo.png';
import { useUIStore } from '@/stores/uiStore';
import { version } from '../../package.json';

export function RheoStudioBar() {
  const setTourOpen = useUIStore((s) => s.setTourOpen);

  return (
    <header
      data-tauri-drag-region
      className="w-full h-11 border-b border-border/40 bg-background/80 backdrop-blur-xl px-5 flex items-center justify-between select-none shrink-0 z-40"
    >
      {/* Brand Identity & Engine Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <img
            src={rheoLogo}
            alt="Rheo"
            className="h-6 w-6 object-contain rounded-full shadow-xs shrink-0"
          />
          <span className="text-xs font-semibold tracking-tight text-foreground">
            Rheo Studio
          </span>
        </div>

        <div className="h-3 w-px bg-border/60" />

        {/* Live Engine Beacon */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-foreground/5 border border-border/60 text-[10px] font-medium text-foreground/80">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
          <span>Engine Active</span>
        </div>
      </div>

      {/* Central Studio Capabilities Telemetry */}
      <div className="hidden md:flex items-center gap-3 text-[11px] text-muted-foreground/80">
        <div className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-foreground/70" />
          <span>Local Neural Inference</span>
        </div>
        <span>&middot;</span>
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-foreground/70" />
          <span>Zero-Latency Dictation</span>
        </div>
        <span>&middot;</span>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-foreground/70" />
          <span>100% Offline Sovereign</span>
        </div>
      </div>

      {/* Right Controls: Tour, Version & Author */}
      <div className="flex items-center gap-3">
        {/* Quick Guide / Tour Trigger */}
        <button
          type="button"
          onClick={() => setTourOpen(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-foreground/5 hover:bg-foreground/10 border border-border/60 text-[10px] font-medium text-foreground/90 transition-all active:scale-95 cursor-pointer"
          title="Start interactive app tutorial"
        >
          <Compass className="h-3 w-3 text-foreground" />
          <span>Quick Tour</span>
        </button>

        <div className="h-3 w-px bg-border/60" />

        {/* Release Version & Author */}
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground/70">
          <span className="font-medium text-foreground/80">v{version}</span>
          <span>&middot;</span>
          <a
            href="https://github.com/MasterZ1311"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors hover:underline"
            title="Architected by MasterZ1311"
          >
            MasterZ1311
          </a>
        </div>
      </div>
    </header>
  );
}
