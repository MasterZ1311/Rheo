import { ArrowUpRight } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import rheoLogo from '@/assets/logo.png';
import { usePlatform } from '@/platform/PlatformContext';

function FadeIn({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  return (
    <div
      className="animate-[fadeInUp_0.5s_ease_both]"
      style={{ animationDelay: `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function AboutPage() {
  const { t } = useTranslation();
  const platform = usePlatform();
  const [version, setVersion] = useState('');

  useEffect(() => {
    platform.metadata
      .getVersion()
      .then(setVersion)
      .catch(() => setVersion(''));
  }, [platform]);

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div className="max-w-md mx-auto h-full flex items-center">
        <div className="flex flex-col items-center text-center space-y-5">
          <FadeIn delay={0}>
            <img src={rheoLogo} alt="Rheo" className="w-20 h-20 object-contain" />
          </FadeIn>

          <FadeIn delay={80}>
            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold">Rheo</h1>
              <p className="text-xs text-muted-foreground/60 h-4">
                {version ? `v${version} \u00B7 AGPL-3.0` : '\u00A0'}
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={160}>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Sovereign AI voice studio & local neural speech synthesis engine.
            </p>
          </FadeIn>

          <FadeIn delay={240}>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>{t('settings.about.createdBy')}</span>
              <a
                href="https://github.com/MasterZ1311"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground font-medium hover:underline"
              >
                MasterZ1311
              </a>
            </div>
          </FadeIn>

          <FadeIn delay={320}>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <a
                href="https://github.com/MasterZ1311/Rheo"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-lg border border-border/60 px-4 py-2 text-sm transition-colors hover:bg-muted/50"
              >
                Rheo Repository
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </a>
              <a
                href="https://github.com/MasterZ1311"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-lg border border-border/60 px-4 py-2 text-sm transition-colors hover:bg-muted/50"
              >
                Creator Profile
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </a>
            </div>
          </FadeIn>

          <FadeIn delay={400}>
            <p className="text-xs text-muted-foreground/40 pt-4">
              Licensed under the{' '}
              <a
                href="https://github.com/MasterZ1311/Rheo/blob/MZ-Main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 hover:opacity-80"
              >
                GNU Affero General Public License v3.0
              </a>
              . Architected by MasterZ1311.
            </p>
          </FadeIn>
        </div>
      </div>
    </>
  );
}
