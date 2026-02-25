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
  updateUser: (updates: Partial<User>) => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CSRF_TOKEN_KEY = 'csrf_token';
const USER_KEY = 'auth_user';

// Refresh access token every 10 minutes (tokens last 15 minutes)
const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Refresh the access token using the refresh token cookie.
   * The browser sends the refresh_token cookie automatically.
   */
  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn('Token refresh failed with status:', response.status);
        return false;
      }

      const data = await response.json();

      setUser(data.user);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      return true;
    } catch (error) {
      console.warn('Error refreshing token (keeping session):', error);
      return false;
    }
  };

  useEffect(() => {
    // Check for existing session and refresh token if needed
    const initializeAuth = async () => {
      const savedUser = localStorage.getItem(USER_KEY);

      if (savedUser) {
        // Restore the user from localStorage immediately for instant UI
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
        } catch (e) {
          console.error('Failed to parse saved user:', e);
        }

        // Then try to refresh the token in the background
        try {
          const response = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          } else if (response.status === 401) {
            // Refresh token is definitely invalid — clear session
            console.warn('Refresh token rejected (401), clearing session');
            localStorage.removeItem(CSRF_TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setUser(null);
          } else {
            // For other errors (404, 500, etc.), keep the existing session
            console.warn('Refresh endpoint error, keeping existing session:', response.status);
          }
        } catch (error) {
          console.error('Error refreshing token on load (keeping session):', error);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing access token...');
      refreshToken();
    }, REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, [user]);

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

    // If server returned a generic "check your email" message (existing user or new user),
    // handle it without crashing — only set user if data.user exists
    if (data.user) {
      setUser(data.user);
      if (data.csrfToken) {
        localStorage.setItem(CSRF_TOKEN_KEY, data.csrfToken);
      }
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      // Redirect to pricing to purchase a plan
      navigate('/pricing');
    } else {
      // Generic "check your email" response — redirect to login
      navigate('/login', { state: { message: data.message || 'Please check your email to verify your account.' } });
    }
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

    setUser(data.user);
    if (data.csrfToken) {
      localStorage.setItem(CSRF_TOKEN_KEY, data.csrfToken);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    navigate('/dashboard');
  };

  const updateUser = (updates: Partial<User>) => {
    const updatedUser = user ? { ...user, ...updates } : null;
    setUser(updatedUser);
    if (updatedUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    }
  };

  const logout = async () => {
    // Call backend to revoke refresh tokens and clear cookies
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Even if the API call fails, clear local state
    }

    setUser(null);
    localStorage.removeItem(CSRF_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
