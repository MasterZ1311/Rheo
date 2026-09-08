import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  DONATE_URL,
  GITHUB_REPO,
} from '@/lib/constants';

export function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.08] border border-white/15 p-0.5 shadow-sm">
                <Image
                  src="/rheo-logo-white.png"
                  alt="Rheo"
                  width={22}
                  height={22}
                  className="object-contain"
                />
              </div>
              <span className="text-base font-bold tracking-tight text-white">Rheo</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Sovereign voice studio & local neural speech synthesis. 100% private, free forever.
            </p>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-400 transition-colors hover:text-white hover:border-white/30"
              aria-label="Star on GitHub"
            >
              <span className="text-[13px] font-medium">GitHub Repository</span>
            </a>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/#features" className="hover:text-foreground transition-colors">
                  Clone
                </a>
              </li>
              <li>
                <a href="/capture" className="hover:text-foreground transition-colors">
                  Capture & Dictate
                </a>
              </li>
              <li>
                <a href="/#mcp" className="hover:text-foreground transition-colors">
                  MCP Speech
                </a>
              </li>
              <li>
                <a href="/#models" className="hover:text-foreground transition-colors">
                  Models
                </a>
              </li>
              <li>
                <a href="/download" className="hover:text-foreground transition-colors">
                  Download
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/blog" className="hover:text-foreground transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <Link
                  href="https://github.com/MasterZ1311/Rheo/tree/MZ-Main/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Source Code
                </Link>
              </li>
              <li>
                <Link
                  href={`${GITHUB_REPO}/releases`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Releases
                </Link>
              </li>
              <li>
                <Link
                  href={`${GITHUB_REPO}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Issues
                </Link>
              </li>
            </ul>
          </div>

          {/* Author & Community */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Community</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://github.com/MasterZ1311"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-medium text-foreground hover:text-white transition-colors"
                >
                  MasterZ1311
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/MasterZ1311/Rheo/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  GitHub Discussions
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/MasterZ1311/Rheo/blob/MZ-Main/CONTRIBUTING.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Contributing Guide
                </a>
              </li>
              <li>
                <a
                  href={DONATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Sponsor & Donate
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Rheo &middot; Architected by{' '}
            <a
              href="https://github.com/MasterZ1311"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline font-medium"
            >
              MasterZ1311
            </a>
            . Licensed under AGPL-3.0.
          </p>
        </div>
      </div>
    </footer>
  );
}
