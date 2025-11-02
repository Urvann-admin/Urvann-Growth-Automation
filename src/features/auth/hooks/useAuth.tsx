'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { authService } from '@/shared/services/api';
import { storage } from '@/shared/utils';
import { STORAGE_KEYS } from '@/shared/constants';
import type { AuthContextType, AuthUser, LoginCredentials, RegisterData } from '../types';
import type { ApiResponse, LoginResponse, RegisterResponse, RefreshTokenResponse } from '@/shared/types/api';

// Create a typed context with default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: async () => { throw new Error('AuthContext not initialized') },
  register: async () => { throw new Error('AuthContext not initialized') },
  logout: async () => { throw new Error('AuthContext not initialized') },
  refreshToken: async () => { throw new Error('AuthContext not initialized') },
  clearError: () => { throw new Error('AuthContext not initialized') },
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        console.log('Storage keys:', STORAGE_KEYS);
        
        // Check what's actually in localStorage
        console.log('All localStorage keys:', Object.keys(localStorage));
        console.log('urvann-user:', localStorage.getItem('urvann-user'));
        console.log('urvann-token:', localStorage.getItem('urvann-token'));
        
        const storedUser = storage.get<AuthUser>(STORAGE_KEYS.user);
        const storedToken = storage.get<string>(STORAGE_KEYS.token);
        
        console.log('Stored user:', storedUser);
        console.log('Stored token:', storedToken ? 'exists' : 'missing');

        if (storedUser && storedToken) {
          console.log('Setting user from storage');
          setUser(storedUser);
          // Set auth token for API calls
          const { apiService } = await import('@/shared/services/api');
          apiService.setAuthToken(storedToken);
        } else {
          console.log('No stored user or token found');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      const response: ApiResponse<LoginResponse> = await authService.login(credentials);
      
      if (response.success) {
        const { user: userData, token } = response.data;
        
        console.log('Login successful, user data:', userData);
        console.log('Token:', token ? 'exists' : 'missing');
        
        setUser(userData);
        storage.set(STORAGE_KEYS.user, userData);
        storage.set(STORAGE_KEYS.token, token);
        
        console.log('User data stored in localStorage');
        
        // Set auth token for API calls
        const { apiService } = await import('@/shared/services/api');
        apiService.setAuthToken(token);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response: ApiResponse<RegisterResponse> = await authService.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      
      if (response.success) {
        const { user: userData, token } = response.data;
        
        setUser(userData);
        storage.set(STORAGE_KEYS.user, userData);
        storage.set(STORAGE_KEYS.token, token);
        
        // Set auth token for API calls
        // apiService.setAuthToken(token);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user...');
      await authService.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      console.log('Clearing user data from storage');
      setUser(null);
      storage.remove(STORAGE_KEYS.user);
      storage.remove(STORAGE_KEYS.token);
      // apiService.removeAuthToken();
    }
  };

  const refreshToken = async () => {
    try {
      const response: ApiResponse<RefreshTokenResponse> = await authService.refreshToken();
      
      if (response.success) {
        const { token } = response.data;
        storage.set(STORAGE_KEYS.token, token);
        // apiService.setAuthToken(token);
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      // If refresh fails, logout user
      await logout();
    }
  };

  const clearError = () => {
    setError(null);
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshToken,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
