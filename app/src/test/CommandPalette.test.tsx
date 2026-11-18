import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandPalette } from '@/components/CommandPalette/CommandPalette';
import { useUIStore } from '@/stores/uiStore';

// Mock Tanstack Router
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

describe('CommandPalette Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({
      commandPaletteOpen: true,
      sidebarOpen: false,
      theme: 'dark',
    });
  });

  it('renders search input and commands list when open', () => {
    render(<CommandPalette />);

    expect(
      screen.getByPlaceholderText('Type a command, page name, or action...'),
    ).toBeInTheDocument();
    expect(screen.getByText('Stream Matrix')).toBeInTheDocument();
    expect(screen.getByText('Voice Studio')).toBeInTheDocument();
    expect(screen.getByText('Resonance Timeline')).toBeInTheDocument();
    expect(screen.getByText('Create Voice Profile')).toBeInTheDocument();
  });

  it('filters commands as user types in the search query', () => {
    render(<CommandPalette />);

    const input = screen.getByPlaceholderText('Type a command, page name, or action...');
    fireEvent.change(input, { target: { value: 'gpu' } });

    expect(screen.getByText('Harmonics & Inference')).toBeInTheDocument();
    expect(screen.queryByText('Voice Studio')).not.toBeInTheDocument();
  });

  it('navigates when a command item is clicked', () => {
    render(<CommandPalette />);

    const studioItem = screen.getByText('Voice Studio');
    fireEvent.click(studioItem);

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/studio' });
    expect(useUIStore.getState().commandPaletteOpen).toBe(false);
  });

  it('triggers quick action when an action item is clicked', () => {
    render(<CommandPalette />);

    const toggleSidebarItem = screen.getByText('Toggle Sidebar Expansion');
    fireEvent.click(toggleSidebarItem);

    expect(useUIStore.getState().sidebarOpen).toBe(true);
    expect(useUIStore.getState().commandPaletteOpen).toBe(false);
  });
});
