import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Volume2,
  Mic,
  Activity,
  Cpu,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Zap,
  Shield,
  Layers,
} from 'lucide-react';
import rheoLogo from '@/assets/logo.png';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils/cn';

interface TourStep {
  title: string;
  subtitle: string;
  description: string;
  highlights: Array<{ icon: any; title: string; desc: string }>;
  badge: string;
}

const steps: TourStep[] = [
  {
    title: 'Welcome to Rheo',
    subtitle: 'ῥέω · "To Flow" · Sovereign Voice Computing',
    description:
      'Rheo is an open-source, local-first voice computing studio. By running neural models directly on your GPU and hardware, your voice data, cloned profiles, and dictations never touch cloud servers.',
    highlights: [
      {
        icon: Shield,
        title: '100% Offline Sovereignty',
        desc: 'Zero data leakage, no cloud telemetry, no subscriptions.',
      },
      {
        icon: Zap,
        title: 'Neural Engine Acceleration',
        desc: 'Optimized for NVIDIA CUDA, Apple Silicon MLX, and modern CPUs.',
      },
      {
        icon: Layers,
        title: '7 Neural TTS Engines',
        desc: 'Switch between multi-engine speech synthesizers instantly.',
      },
    ],
    badge: 'Step 1 of 6 · Introduction',
  },
  {
    title: 'Studio Voice Generation',
    subtitle: 'High-Fidelity Neural Speech Synthesis',
    description:
      'Generate ultra-realistic speech with granular control over pacing, inflection, and emotional delivery. Type or paste your script, select an active voice profile, and hear it speak.',
    highlights: [
      {
        icon: Volume2,
        title: 'Dynamic Speech Generation',
        desc: 'Interactive waveform generation with live audio player controls.',
      },
      {
        icon: Layers,
        title: 'Multi-Voice Stories',
        desc: 'Compose complex multi-track dialogues and full-cast podcasts.',
      },
      {
        icon: Zap,
        title: 'Audio Effects Suite',
        desc: 'Apply parametric EQ, reverb, pitch shifting, and compression.',
      },
    ],
    badge: 'Step 2 of 6 · Generation',
  },
  {
    title: 'Instant Voice Cloning',
    subtitle: 'Recreate Any Voice in Seconds',
    description:
      'Train a custom voice clone using just 5 to 10 seconds of clear speech reference. Rheo extracts acoustic phoneme embeddings and replicates vocal identity with high fidelity.',
    highlights: [
      {
        icon: Mic,
        title: 'Three Capture Modes',
        desc: 'Record with your mic, upload an audio file, or capture system audio.',
      },
      {
        icon: Shield,
        title: 'Local Privacy Guarantee',
        desc: 'Cloned profiles remain exclusively on your local filesystem.',
      },
      {
        icon: Sparkles,
        title: 'Sharable Voice Packs',
        desc: 'Export and import sovereign .rheo.zip voice packages freely.',
      },
    ],
    badge: 'Step 3 of 6 · Voice Cloning',
  },
  {
    title: 'Zero-Latency Dictation',
    subtitle: 'Universal System-Wide Speech-to-Text',
    description:
      'Press your custom global hotkey from anywhere in your operating system to dictate directly into any active application with real-time feedback and smart punctuation.',
    highlights: [
      {
        icon: Activity,
        title: 'Global System Hotkey',
        desc: 'Activate recording over any window with zero window-switching lag.',
      },
      {
        icon: Zap,
        title: 'Smart Dictionary & Corrections',
        desc: 'Add custom vocabulary, technical terms, and acronym auto-expansion.',
      },
      {
        icon: Shield,
        title: 'Complete System Privacy',
        desc: 'Your microphone input is transcribed strictly by local neural models.',
      },
    ],
    badge: 'Step 4 of 6 · Dictation',
  },
  {
    title: 'Neural Engines & MCP Agents',
    subtitle: 'Give Autonomous AI Agents a Real Voice',
    description:
      'Rheo integrates with AI development environments (Cursor, Claude Desktop, Ollama) using the Model Context Protocol (MCP), allowing external agents to speak in cloned voices.',
    highlights: [
      {
        icon: Cpu,
        title: 'Model Context Protocol (MCP)',
        desc: 'Built-in MCP server exposes voice synthesis tools to AI agents.',
      },
      {
        icon: Layers,
        title: 'Automated Model Manager',
        desc: 'Download, verify, and switch between weights with one click.',
      },
      {
        icon: Shield,
        title: 'Local REST API',
        desc: 'Integrate Rheo into your Python, Rust, or Node.js workflows.',
      },
    ],
    badge: 'Step 5 of 6 · Agent Ecosystem',
  },
  {
    title: "You're Ready to Flow",
    subtitle: 'Everything You Need to Begin',
    description:
      'You are all set to experience sovereign voice computing. Choose your first action below, or jump directly into the studio.',
    highlights: [
      {
        icon: Volume2,
        title: 'Generate Your First Speech',
        desc: 'Open the main studio and synthesize your first sentence.',
      },
      {
        icon: Mic,
        title: 'Create a Custom Voice',
        desc: 'Record a sample or upload a reference audio file.',
      },
      {
        icon: Zap,
        title: 'Revisit Tour Anytime',
        desc: 'Click the "Tour" button in the top navigation bar at any point.',
      },
    ],
    badge: 'Step 6 of 6 · Ready to Flow',
  },
];

export function OnboardingTour() {
  const navigate = useNavigate();
  const tourOpen = useUIStore((s) => s.tourOpen);
  const setTourOpen = useUIStore((s) => s.setTourOpen);
  const tourCompleted = useUIStore((s) => s.tourCompleted);
  const setTourCompleted = useUIStore((s) => s.setTourCompleted);
  const setProfileDialogOpen = useUIStore((s) => s.setProfileDialogOpen);

  const [currentStep, setCurrentStep] = useState(0);

  // Auto-launch tour on first visit
  useEffect(() => {
    if (!tourCompleted) {
      const timer = setTimeout(() => {
        setTourOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [tourCompleted, setTourOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!tourOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tourOpen, currentStep]);

  if (!tourOpen) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleComplete = () => {
    setTourCompleted(true);
    setTourOpen(false);
  };

  const handleClose = () => {
    setTourCompleted(true);
    setTourOpen(false);
  };

  const handleAction = (action: 'generate' | 'voice' | 'settings') => {
    handleComplete();
    if (action === 'generate') {
      navigate({ to: '/' });
    } else if (action === 'voice') {
      navigate({ to: '/voices' });
      setProfileDialogOpen(true);
    } else if (action === 'settings') {
      navigate({ to: '/settings' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in-0 duration-200">
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-white/20 bg-background/95 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transition-all duration-300 animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
      >
        {/* Top Header Banner */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <img src={rheoLogo} alt="Rheo" className="h-5 w-5 object-contain" />
            <span className="text-xs font-semibold tracking-wider uppercase text-foreground/80">
              Rheo Quick Guide
            </span>
            <span className="text-xs text-muted-foreground/60">&middot;</span>
            <span className="text-xs font-mono text-muted-foreground">{step.badge}</span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            title="Close tutorial (Esc)"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-7 space-y-6 flex-1 overflow-y-auto max-h-[70vh]">
          {/* Visual Header */}
          <div className="flex items-start gap-4">
            <div className="relative shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl bg-foreground/10 border border-foreground/20 shadow-inner">
              {isFirst ? (
                <img src={rheoLogo} alt="Rheo" className="h-8 w-8 object-contain" />
              ) : isLast ? (
                <Sparkles className="h-7 w-7 text-foreground" />
              ) : currentStep === 1 ? (
                <Volume2 className="h-7 w-7 text-foreground" />
              ) : currentStep === 2 ? (
                <Mic className="h-7 w-7 text-foreground" />
              ) : currentStep === 3 ? (
                <Activity className="h-7 w-7 text-foreground" />
              ) : (
                <Cpu className="h-7 w-7 text-foreground" />
              )}
            </div>

            <div className="space-y-1">
              <h2 id="tour-title" className="text-2xl font-bold tracking-tight text-foreground">
                {step.title}
              </h2>
              <p className="text-xs font-medium text-muted-foreground">{step.subtitle}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-muted-foreground/90">{step.description}</p>

          {/* Feature Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {step.highlights.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border/50 bg-card/50 p-3.5 space-y-2 hover:border-foreground/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-foreground/5 text-foreground">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-xs font-semibold text-foreground leading-none">{item.title}</h3>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Final Step Quick Actions */}
          {isLast && (
            <div className="pt-2 border-t border-border/40">
              <span className="text-xs font-semibold text-foreground block mb-2.5">
                Quick Actions to Start:
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleAction('generate')}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors text-center cursor-pointer"
                >
                  Open Studio
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('voice')}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors text-center cursor-pointer"
                >
                  Create Voice
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('settings')}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors text-center cursor-pointer"
                >
                  App Settings
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-border/40 bg-muted/20 flex items-center justify-between">
          {/* Progress Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Jump to step ${idx + 1}`}
                className={cn(
                  'h-2 rounded-full transition-all duration-200 cursor-pointer',
                  idx === currentStep
                    ? 'w-6 bg-foreground'
                    : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60',
                )}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!isLast && (
              <button
                type="button"
                onClick={handleComplete}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Skip Tour
              </button>
            )}

            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted/60 transition-colors text-foreground cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <span>{isLast ? 'Get Started' : 'Next Step'}</span>
              {isLast ? <Check className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
