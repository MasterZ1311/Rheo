import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { UserNameModal } from '@/components/Onboarding/UserNameModal';
import { useUIStore } from '@/stores/uiStore';

describe('UserNameModal Component', () => {
  beforeEach(() => {
    useUIStore.setState({
      userName: null,
      userNameModalOpen: false,
    });
  });

  it('renders onboarding prompt when user has no name set', () => {
    render(<UserNameModal />);
    expect(screen.getByText('Welcome to Rheo Studio')).toBeInTheDocument();
    expect(
      screen.getByText(/What should we call you\? Enter your name to personalize your acoustic workspace\./i),
    ).toBeInTheDocument();
  });

  it('updates userName in uiStore upon submission', () => {
    render(<UserNameModal />);
    const input = screen.getByPlaceholderText('Your name (e.g. Juliana)');
    fireEvent.change(input, { target: { value: 'Alex Morgan' } });

    const submitBtn = screen.getByRole('button', { name: /Enter Studio/i });
    fireEvent.click(submitBtn);

    expect(useUIStore.getState().userName).toBe('Alex Morgan');
  });
});
