'use client';

import { Coffee, Github } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { DONATE_URL, GITHUB_REPO } from '@/lib/constants';

function formatStarCount(count: number): string {
  if (count >= 1000) {
    const k = count / 1000;
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return count.toString();
}

export function Navbar() {
  const [starCount, setStarCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/stars')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch stars');
        return res.json();
      })
      .then((data) => {
        if (typeof data.count === 'number') setStarCount(data.count);
      })
      .catch((error) => {
        console.error('Failed to fetch star count:', error);
      });
  }, []);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-2xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-x-6">
        {/* Logo + wordmark */}
        <a href="/" className="flex items-center gap-3 justify-self-start group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.08] p-1 border border-white/15 shadow-sm group-hover:scale-105 group-hover:border-white/30 transition-all">
            <Image
              src="/rheo-logo-white.png"
              alt="Rheo"
              width={24}
              height={24}
              priority
              className="object-contain"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-bold tracking-tight text-white">Rheo</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[9px] font-medium text-zinc-200">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                Active
              </span>
            </div>
          </div>
        </a>

        {/* Nav links - centered */}
        <div className="hidden sm:flex items-center gap-1 justify-self-center">
          <a
            href="/#features"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Clone
          </a>
          <a
            href="/capture"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Capture
            <span className="rounded-full bg-accent/15 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
              New
            </span>
          </a>
          <a
            href="/#mcp"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            MCP
          </a>
          <a
            href="/#about"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Models
          </a>
          <a
            href="/pricing"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </a>
          <a
            href="/blog"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Blog
          </a>
          <a
            href="https://github.com/MasterZ1311/Rheo/tree/MZ-Main/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </a>
        </div>

        {/* Donate + GitHub star buttons */}
        <div className="flex items-center gap-2 justify-self-end">
          <a
            href={DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-white hover:border-white/30"
            aria-label="Donate via Buy Me a Coffee"
          >
            <Coffee className="h-4 w-4 text-zinc-300" />
            <span className="text-[13px] font-medium">Donate</span>
          </a>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:text-white hover:border-white/40"
          >
            <Github className="h-4 w-4 text-white" />
            <span className="text-[13px] font-medium">Star</span>
            {starCount !== null && (
              <span className="border-l border-white/20 pl-2 text-[13px] font-semibold text-white">
                {formatStarCount(starCount)}
              </span>
            )}
          </a>
        </div>
      </div>
    </nav>
  );
}
