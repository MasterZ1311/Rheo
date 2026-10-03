import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from '@/components/Sidebar';

// Mock Tanstack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <a href="#" title={title}>
      {children}
    </a>
  ),
  useMatchRoute: () => () => false,
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// Mock usePlatform
vi.mock('@/platform/PlatformContext', () => ({
  usePlatform: () => ({
    metadata: { isTauri: false },
    lifecycle: {},
  }),
}));

describe('Sidebar Component', () => {
  it('renders all key navigation buttons and branding icon', () => {
    render(<Sidebar />);

    expect(screen.getByRole('img', { name: 'Rheo' })).toBeInTheDocument();
    expect(screen.getByTitle('Stream Matrix (Dashboard)')).toBeInTheDocument();
    expect(screen.getByTitle('Resonance Timeline')).toBeInTheDocument();
    expect(screen.getByTitle('Voice Studio')).toBeInTheDocument();
    expect(screen.getByTitle('Harmonics & Inference')).toBeInTheDocument();
    expect(screen.getByTitle('New Voice Profile')).toBeInTheDocument();
    expect(screen.getByTitle('Settings')).toBeInTheDocument();
    expect(screen.getByTitle('Disconnect / Exit')).toBeInTheDocument();
  });
});
