'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { setupTokenRefresh, isTokenExpired, refreshAccessToken } from '../utils/auth';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setMounted(true);
    
    const initAuth = async () => {
      logger.info('[Auth Context] Initializing authentication...');
      
      if (typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        
        logger.info('[Auth Context] Tokens found:', {
          hasAccessToken: !!storedToken,
          hasRefreshToken: !!refreshToken
        });
        
        if (storedToken) {
          // Check if token is expired or about to expire
          if (isTokenExpired(storedToken)) {
            logger.info('[Auth Context] Token expired or expiring soon, attempting refresh...');
            
            if (refreshToken) {
              // Try to refresh the token
              const newTokenInfo = await refreshAccessToken();
              
              if (newTokenInfo) {
                logger.info('[Auth Context] Token refresh successful');
                setTokenState(newTokenInfo.accessToken);
                // Set up automatic token refresh
                cleanupRef.current = setupTokenRefresh();
              } else {
                // Refresh failed, clear auth
                logger.info('[Auth Context] Token refresh failed, clearing auth');
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
              }
            } else {
              logger.info('[Auth Context] No refresh token available, cannot refresh');
            }
          } else {
            // Token is valid
            logger.info('[Auth Context] Token is valid, setting up refresh');
            setTokenState(storedToken);
            // Set up automatic token refresh
            cleanupRef.current = setupTokenRefresh();
          }
        } else {
          logger.info('[Auth Context] No access token found');
        }
      }
      setLoading(false);
    };
    
    initAuth();
    
    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('access_token', newToken);
      // Set up automatic refresh when new token is set
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      cleanupRef.current = setupTokenRefresh();
    } else {
      localStorage.removeItem('access_token');
      // Clear automatic refresh
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    }
    setTokenState(newToken);
  };

  const logout = () => {
    // Clear all auth-related data
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setTokenState(null);
    router.push('/login');
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <AuthContext.Provider
        value={{
          token: null,
          isAuthenticated: false,
          loading: true,
          setToken,
          logout,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        loading,
        setToken,
        logout,
      }}
    >
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