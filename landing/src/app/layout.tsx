import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://rheo.sh'),
  title: 'Rheo — Sovereign AI Voice Studio & Local Speech Engine',
  description:
    'Near-perfect voice cloning with multiple neural TTS engines, zero-latency system dictation, and speech-driven AI agent workflows. Running 100% locally on your machine. Architected by masterz1311.',
  authors: [{ name: 'masterz1311', url: 'https://github.com/masterz1311' }],
  creator: 'masterz1311',
  publisher: 'masterz1311',
  keywords: [
    'Rheo',
    'voice cloning',
    'TTS',
    'multi-engine speech',
    'desktop app',
    'AI voice',
    'open source',
    'text to speech',
    'masterz1311',
    'Whisper dictation',
  ],
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Rheo — Sovereign AI Voice Studio',
    description: 'Open source voice cloning & local dictation. 100% private. Created by masterz1311.',
    type: 'website',
    url: 'https://github.com/MasterZ1311/Rheo',
    images: [{ url: '/rheo-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rheo — Sovereign AI Voice Studio',
    description: 'Open source voice cloning & local dictation. 100% private. Created by masterz1311.',
    images: ['/rheo-logo.png'],
  },
  other: {
    'x-project-origin': 'https://github.com/MasterZ1311/Rheo',
    'x-engine-architect': 'masterz1311',
    'x-license': 'AGPL-3.0-or-later',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <meta name="author" content="MasterZ1311" />
        <meta name="creator" content="MasterZ1311" />
        <meta name="x-project-origin" content="https://github.com/MasterZ1311/Rheo" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="relative min-h-screen bg-background font-sans">{children}</div>
      </body>
    </html>
  );
}
