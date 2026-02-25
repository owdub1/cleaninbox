import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../AuthContext';
import '@testing-library/jest-dom';

// Helper component that renders auth state
function AuthDisplay() {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div data-testid="loading">Loading...</div>;
  return (
    <div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>
    </div>
  );
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts with loading true then resolves', async () => {
    renderWithProviders(<AuthDisplay />);

    // Eventually loading finishes and auth state renders
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
    });
  });

  it('is not authenticated when no stored tokens', async () => {
    renderWithProviders(<AuthDisplay />);

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user-email')).toHaveTextContent('none');
  });

  it('restores user from localStorage', async () => {
    localStorage.setItem('auth_user', JSON.stringify({ id: '1', email: 'test@test.com' }));

    // Mock the refresh call to fail (but user should still be restored)
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as any;

    renderWithProviders(<AuthDisplay />);

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@test.com');
  });

  it('clears user on 401 refresh response', async () => {
    localStorage.setItem('auth_user', JSON.stringify({ id: '1', email: 'test@test.com' }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as any;

    renderWithProviders(<AuthDisplay />);

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(
        <MemoryRouter>
          <AuthDisplay />
        </MemoryRouter>
      );
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
