import React, { useEffect, useState, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
}

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean, captchaToken?: string) => Promise<void>;
  signup: (email: string, password: string, firstName: string, lastName: string, captchaToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  updateUser: (updates: Partial<User>, newToken?: string) => void;
  loading: boolean;
  token: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const CSRF_TOKEN_KEY = 'csrf_token';
const USER_KEY = 'auth_user';

// Refresh token once per day (tokens last 7 days, refresh at day 6)
const REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Refresh the access token using the refresh token
   * Does NOT logout on failure - keeps existing session to avoid disruption
   */
  const refreshToken = async (): Promise<boolean> => {
    const savedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!savedRefreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: savedRefreshToken }),
      });

      if (!response.ok) {
        // Don't logout on refresh failure - token might still be valid
        // Only log the error and return false
        console.warn('Token refresh failed with status:', response.status);
        return false;
      }

      const data = await response.json();

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      return true;
    } catch (error) {
      // Network error - don't logout, just log and return false
      console.warn('Error refreshing token (keeping session):', error);
      return false;
    }
  };

  useEffect(() => {
    // Check for existing session and refresh token if needed
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);

      if (savedRefreshToken && savedUser) {
        // First, restore the user from localStorage immediately
        // This allows OAuth callbacks to work without waiting for refresh
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          if (savedToken) {
            setToken(savedToken);
          }
        } catch (e) {
          console.error('Failed to parse saved user:', e);
        }

        // Then try to refresh the token in the background
        try {
          const response = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ refreshToken: savedRefreshToken }),
          });

          if (response.ok) {
            const data = await response.json();
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          } else if (response.status === 401) {
            // Only clear on explicit 401 (unauthorized) - token is definitely invalid
            console.warn('Refresh token rejected (401), clearing session');
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            localStorage.removeItem(CSRF_TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setUser(null);
            setToken(null);
          } else {
            // For other errors (404, 500, etc.), keep the existing session
            // The token might still be valid, refresh endpoint might just be down
            console.warn('Refresh endpoint error, keeping existing session:', response.status);
          }
        } catch (error) {
          // Network error - keep existing session, don't clear tokens
          console.error('Error refreshing token on load (keeping session):', error);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!token || !user) return;

    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing access token...');
      refreshToken();
    }, REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, [token, user]);

  const signup = async (email: string, password: string, firstName: string, lastName: string, captchaToken?: string) => {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, firstName, lastName, captchaToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    const data = await response.json();

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(CSRF_TOKEN_KEY, data.csrfToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    // Redirect to pricing to purchase a plan
    navigate('/pricing');
  };

  const login = async (email: string, password: string, rememberMe: boolean = false, captchaToken?: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, rememberMe, captchaToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(CSRF_TOKEN_KEY, data.csrfToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    navigate('/dashboard');
  };

  const updateUser = (updates: Partial<User>, newToken?: string) => {
    const updatedUser = user ? { ...user, ...updates } : null;
    setUser(updatedUser);
    if (updatedUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    }
    if (newToken) {
      setToken(newToken);
      localStorage.setItem(TOKEN_KEY, newToken);
    }
  };

  const logout = async () => {
    // TODO: Call API to revoke refresh token in database
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(CSRF_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshToken,
        updateUser,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
