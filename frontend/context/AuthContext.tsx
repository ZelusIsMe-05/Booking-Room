'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types/user';
import { authService } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => void | Promise<void>;
  refreshProfile: () => Promise<void>;
  loginWithOAuth: (provider: string, code: string, redirectUri: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearStoredCredentials = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  };

  const refreshProfile = async () => {
    try {
      const response = await authService.getMe();
      if (response && response.data && response.data.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error);
      // If error (meaning refresh token is also expired or invalid), clean credentials
      clearStoredCredentials();
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      try {
        if (token) {
          await Promise.race([
            refreshProfile(),
            new Promise((_, reject) =>
              window.setTimeout(
                () => reject(new Error('Auth profile request timed out')),
                6000
              )
            ),
          ]);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        clearStoredCredentials();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (identifier: string, password: string): Promise<User> => {
    const response = await authService.login(identifier, password);
    const { accessToken, refreshToken, user: loggedInUser } = response.data;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
    
    setUser(loggedInUser);
    return loggedInUser;
  };

  const loginWithOAuth = async (provider: string, code: string, redirectUri: string) => {
    const response = await authService.loginWithOAuth(provider, code, redirectUri);
    const { accessToken, refreshToken, user: loggedInUser } = response.data;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
    
    setUser(loggedInUser);
    return response.data;
  };

  const logout = async () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

    // Call backend API in the background (while tokens are still in localStorage)
    let apiCall: Promise<any> = Promise.resolve();
    if (refreshToken) {
      apiCall = authService.logout(refreshToken);
    }

    // Instantly clear local storage and state for reactive UI responsiveness
    clearStoredCredentials();
    setUser(null);

    // Catch any error from the background API call so it never bubbles up or breaks the client
    try {
      await apiCall;
    } catch (error: any) {
      const isUnauthorized = error?.response?.status === 401 || error?.status === 401;
      if (!isUnauthorized) {
        console.error('Failed to revoke tokens on backend during logout:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile, loginWithOAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
