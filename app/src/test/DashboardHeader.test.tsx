import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader';
import { useUIStore } from '@/stores/uiStore';

describe('DashboardHeader Component', () => {
  it('renders default user name and subtitle', () => {
    useUIStore.setState({ userName: 'TestUser' });
    const setSearchQuery = vi.fn();
    render(<DashboardHeader searchQuery="" setSearchQuery={setSearchQuery} />);

    expect(screen.getByText('Welcome, TestUser!')).toBeInTheDocument();
    expect(screen.getByText(/Here is your voice stream agenda for today/i)).toBeInTheDocument();
  });

  it('handles search input changes correctly', () => {
    const setSearchQuery = vi.fn();
    render(<DashboardHeader searchQuery="" setSearchQuery={setSearchQuery} />);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'acoustic' } });

    expect(setSearchQuery).toHaveBeenCalledWith('acoustic');
  });

  it('triggers name edit modal on avatar click', () => {
    useUIStore.setState({ userName: 'TestUser', userNameModalOpen: false });
    const setSearchQuery = vi.fn();
    render(<DashboardHeader searchQuery="" setSearchQuery={setSearchQuery} />);

    const avatar = screen.getByTitle(/Signed in as TestUser/i);
    fireEvent.click(avatar);

    expect(useUIStore.getState().userNameModalOpen).toBe(true);
  });
});
