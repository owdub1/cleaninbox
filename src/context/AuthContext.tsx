import React, { useEffect, useState, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
type User = {
  name: string;
  email: string;
  subscription: {
    plan: string;
    status: string;
    nextBilling: string;
    price: string;
    period: string;
    emailLimit: number;
  };
};
type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => void;
  logout: () => void;
};
const defaultUser: User = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  subscription: {
    plan: 'Pro',
    status: 'Active',
    nextBilling: '2025-06-15',
    price: '$19.99',
    period: 'monthly',
    emailLimit: 2
  }
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({
  children
}) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);
  const login = (email: string, password: string) => {
    // In a real app, you would authenticate with a backend
    // For demo purposes, we'll just set the mock user
    setUser(defaultUser);
    localStorage.setItem('user', JSON.stringify(defaultUser));
    navigate('/dashboard');
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/');
  };
  return <AuthContext.Provider value={{
    user,
    isAuthenticated: !!user,
    login,
    logout
  }}>
      {children}
    </AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};