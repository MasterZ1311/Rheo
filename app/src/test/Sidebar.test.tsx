import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from '@/components/Sidebar';
import { useUIStore } from '@/stores/uiStore';

// Mock Tanstack Router
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  Link: React.forwardRef<
    HTMLAnchorElement,
    { children: React.ReactNode; title?: string; to?: string }
  >(({ children, title, to, ...props }, ref) => (
    <a ref={ref} href={to || '#'} title={title} {...props}>
      {children}
    </a>
  )),
  useMatchRoute: () => () => false,
  useNavigate: () => mockNavigate,
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

// Mock useServerHealth
vi.mock('@/lib/hooks/useServer', () => ({
  useServerHealth: () => ({
    data: {
      status: 'healthy',
      model_loaded: true,
      gpu_available: true,
      gpu_type: 'NVIDIA RTX 4090',
      vram_used_mb: 2450,
    },
    isLoading: false,
    isError: false,
  }),
}));

describe('Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({
      sidebarOpen: false,
      userName: 'MasterZ1311',
      theme: 'dark',
      commandPaletteOpen: false,
    });
  });

  it('renders all key navigation buttons and branding icon in collapsed mode', () => {
    render(<Sidebar />);

    expect(screen.getByRole('img', { name: 'Rheo' })).toBeInTheDocument();
    expect(screen.getByTitle('Stream Matrix (Dashboard)')).toBeInTheDocument();
    expect(screen.getByTitle('Resonance Timeline')).toBeInTheDocument();
    expect(screen.getByTitle('Voice Studio')).toBeInTheDocument();
    expect(screen.getByTitle('Voice Profiles')).toBeInTheDocument();
    expect(screen.getByTitle('Harmonics & Inference')).toBeInTheDocument();
    expect(screen.getByTitle('New Voice Profile')).toBeInTheDocument();
    expect(screen.getByTitle('Settings')).toBeInTheDocument();
    expect(screen.getByTitle('Disconnect / Exit')).toBeInTheDocument();
  });

  it('renders search and command trigger', () => {
    render(<Sidebar />);
    expect(screen.getByTitle('Search & Commands (⌘K)')).toBeInTheDocument();
  });

  it('toggles sidebar expansion when collapse/expand button is clicked', () => {
    const { rerender } = render(<Sidebar />);

    // Initially collapsed, find expand button
    const expandButton = screen.getByRole('button', { name: 'Expand sidebar' });
    expect(expandButton).toBeInTheDocument();

    // Click expand
    fireEvent.click(expandButton);
    expect(useUIStore.getState().sidebarOpen).toBe(true);

    // Re-render in expanded state
    rerender(<Sidebar />);

    // Check expanded elements
    expect(screen.getByText('Rheo')).toBeInTheDocument();
    expect(screen.getByText('v0.5.0')).toBeInTheDocument();
    expect(screen.getByText('Sovereign Studio')).toBeInTheDocument();
    expect(screen.getByText('Stream Matrix')).toBeInTheDocument();
    expect(screen.getByText('Voice Studio')).toBeInTheDocument();
    expect(screen.getByText('MasterZ1311')).toBeInTheDocument();

    // Collapse button should now be present
    const collapseButton = screen.getByRole('button', { name: 'Collapse sidebar' });
    expect(collapseButton).toBeInTheDocument();

    fireEvent.click(collapseButton);
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('opens command palette when search button is clicked', () => {
    render(<Sidebar />);

    const searchButton = screen.getByTitle('Search & Commands (⌘K)');
    fireEvent.click(searchButton);

    expect(useUIStore.getState().commandPaletteOpen).toBe(true);
  });

  it('cycles theme when theme toggle button is clicked', () => {
    useUIStore.setState({ theme: 'dark' });
    render(<Sidebar />);

    const themeButton = screen.getByTitle('Toggle Theme (dark)');
    fireEvent.click(themeButton);

    expect(useUIStore.getState().theme).toBe('light');

    fireEvent.click(themeButton);
    expect(useUIStore.getState().theme).toBe('system');

    fireEvent.click(themeButton);
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('opens profile create dialog when new voice button is clicked', () => {
    render(<Sidebar />);

    const newVoiceButton = screen.getByTitle('New Voice Profile');
    fireEvent.click(newVoiceButton);

    expect(useUIStore.getState().profileDialogOpen).toBe(true);
  });

  it('handles global keyboard navigation shortcuts', () => {
    render(<Sidebar />);

    // ⌘1 -> Home
    fireEvent.keyDown(window, { key: '1', metaKey: true });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });

    // ⌘2 -> Studio
    fireEvent.keyDown(window, { key: '2', metaKey: true });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/studio' });

    // ⌘3 -> Stories
    fireEvent.keyDown(window, { key: '3', metaKey: true });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/stories' });

    // ⌘4 -> Voices
    fireEvent.keyDown(window, { key: '4', metaKey: true });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/voices' });

    // ⌘5 -> Harmonics/GPU
    fireEvent.keyDown(window, { key: '5', metaKey: true });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/settings/gpu' });

    // ⌘, -> Settings
    fireEvent.keyDown(window, { key: ',', metaKey: true });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/settings' });

    // ⌘K -> Open command palette
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(useUIStore.getState().commandPaletteOpen).toBe(true);

    // ⌘B -> Toggle sidebar
    const initialOpen = useUIStore.getState().sidebarOpen;
    fireEvent.keyDown(window, { key: 'b', metaKey: true });
    expect(useUIStore.getState().sidebarOpen).toBe(!initialOpen);
  });
});
