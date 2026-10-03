import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BentoDashboard } from '@/components/Dashboard/BentoDashboard';
import { useUIStore } from '@/stores/uiStore';

// Mock Tanstack Router useNavigate
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock hooks to provide predictable data
vi.mock('@/lib/hooks/useProfiles', () => ({
  useProfiles: () => ({
    data: [
      { id: 'p1', name: 'Acoustic Model Alpha', language: 'en', generation_count: 5, sample_count: 2 },
      { id: 'p2', name: 'Neural Voice Beta', language: 'de', generation_count: 3, sample_count: 1 },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/lib/hooks/useHistory', () => ({
  useHistory: () => ({
    data: {
      items: [
        { id: 'h1', profile_name: 'Acoustic Model Alpha', text: 'Synthesized greeting sample', created_at: new Date().toISOString() },
      ],
      total: 1,
    },
    isLoading: false,
  }),
}));

describe('BentoDashboard Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useUIStore.setState({
      userName: 'Creator',
      dashboardTasks: [
        { id: 't1', title: 'Calibrate neural clone', tag: 'Today', completed: false },
      ],
    });
  });

  const renderDashboard = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BentoDashboard />
      </QueryClientProvider>,
    );

  it('renders all 5 bento card headings', () => {
    renderDashboard();

    expect(screen.getByText('Priority Streams')).toBeInTheDocument();
    expect(screen.getByText('Voice Streams Directory')).toBeInTheDocument();
    expect(screen.getByText('Studio Activity')).toBeInTheDocument();
    expect(screen.getByText('Voice Personas')).toBeInTheDocument();
  });

  it('displays live profiles in directory and personas', () => {
    renderDashboard();

    expect(screen.getAllByText('Acoustic Model Alpha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Neural Voice Beta').length).toBeGreaterThan(0);
  });

  it('toggles task completion status', () => {
    renderDashboard();

    const taskTitle = screen.getByText('Calibrate neural clone');
    expect(taskTitle).not.toHaveClass('line-through');

    fireEvent.click(taskTitle);
    expect(taskTitle).toHaveClass('line-through');
  });
});
