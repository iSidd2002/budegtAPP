'use client';

import { useEffect, useState, createContext, useContext, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { storage } from '@/lib/storage';

// Debug logging only in development
const DEBUG = process.env.NODE_ENV === 'development';
const log = DEBUG ? console.log.bind(console, '[Auth]') : () => {};

// Token refresh configuration
const ACCESS_TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const MIN_REFRESH_INTERVAL = 30 * 1000; // Minimum 30 seconds between refreshes to prevent spam
const BACKGROUND_REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh if backgrounded > 5 minutes

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>; // Expose for manual refresh if needed
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Track last refresh time and background time to prevent refresh spam
  const lastRefreshTime = useRef<number>(0);
  const backgroundStartTime = useRef<number>(0);
  const isRefreshing = useRef<boolean>(false);

  // Function to refresh access token with debouncing
  const refreshAccessToken = useCallback(async (force = false): Promise<boolean> => {
    // Prevent concurrent refreshes
    if (isRefreshing.current) {
      log('Refresh already in progress, skipping');
      return true; // Assume success if already refreshing
    }

    // Debounce: prevent refresh spam (unless forced)
    const now = Date.now();
    if (!force && now - lastRefreshTime.current < MIN_REFRESH_INTERVAL) {
      log('Too soon since last refresh, skipping');
      return true;
    }

    try {
      isRefreshing.current = true;
      const refreshToken = await storage.getItem('refreshToken');

      if (!refreshToken) {
        log('No refresh token available');
        return false;
      }

      log('Refreshing access token...');
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.accessToken) {
          await storage.setItem('accessToken', data.accessToken);
          lastRefreshTime.current = Date.now();
          log('Access token refreshed successfully');

          // Store new refresh token for PWA compatibility (token rotation)
          if (data.refreshToken) {
            await storage.setItem('refreshToken', data.refreshToken);
            log('Refresh token rotated');
          }
          return true;
        }
        return false;
      } else {
        log('Token refresh failed with status:', response.status);
        // Only clear tokens on 401 (unauthorized), not on network errors
        if (response.status === 401) {
          await storage.removeItem('accessToken');
          await storage.removeItem('refreshToken');
        }
        return false;
      }
    } catch (error) {
      if (DEBUG) console.error('[Auth] Token refresh error:', error);
      // Don't clear tokens on network errors - user might be offline temporarily
      return false;
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  // Function to verify if access token is valid
  const verifyToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        return data.valid === true;
      }
      return false;
    } catch (error) {
      if (DEBUG) console.error('[Auth] Token verification error:', error);
      return false;
    }
  }, []);

  // Function to send keepalive ping to prevent iOS storage deletion
  const sendKeepalive = useCallback(async (): Promise<void> => {
    try {
      const token = await storage.getItem('accessToken');
      if (!token) return;

      await fetch('/api/auth/keepalive', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });
    } catch {
      // Silently fail keepalive - not critical
    }
  }, []);

  useEffect(() => {
    // Function to check if user is authenticated
    const checkAuth = async () => {
      log('Checking authentication...');

      const accessToken = await storage.getItem('accessToken');
      const refreshToken = await storage.getItem('refreshToken');

      // If no access token, try to refresh
      if (!accessToken) {
        if (!refreshToken) {
          setIsAuthenticated(false);
          setIsLoading(false);
          if (pathname !== '/') {
            router.push('/');
          }
          return;
        } else {
          log('No access token, attempting refresh...');
          const refreshed = await refreshAccessToken(true); // Force refresh
          if (!refreshed) {
            setIsAuthenticated(false);
            setIsLoading(false);
            router.push('/');
          } else {
            setIsAuthenticated(true);
            setIsLoading(false);
            lastRefreshTime.current = Date.now();
          }
          return;
        }
      }

      // If token exists, verify it's still valid
      const isValid = await verifyToken(accessToken);

      if (!isValid) {
        log('Access token invalid, attempting refresh...');
        const refreshed = await refreshAccessToken(true); // Force refresh

        if (!refreshed) {
          setIsAuthenticated(false);
          setIsLoading(false);
          router.push('/');
        } else {
          setIsAuthenticated(true);
          setIsLoading(false);
        }
      } else {
        setIsAuthenticated(true);
        setIsLoading(false);
        // Send keepalive to maintain session
        sendKeepalive();
      }
    };

    // Check auth on mount and when pathname changes
    checkAuth();

    // Set up automatic token refresh every 10 minutes
    const refreshInterval = setInterval(async () => {
      if (pathname !== '/') {
        log('Periodic token refresh...');
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          // Token refresh failed - check if we have a valid session
          const token = await storage.getItem('accessToken');
          if (token) {
            const isValid = await verifyToken(token);
            if (!isValid) {
              log('Session expired, logging out');
              setIsAuthenticated(false);
              router.push('/');
            }
          }
        }
      }
    }, ACCESS_TOKEN_REFRESH_INTERVAL);

    // iOS PWA: Handle visibility changes properly
    // This is CRITICAL for PWA auth persistence
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // App going to background - record the time
        backgroundStartTime.current = Date.now();
        log('App going to background');
      } else if (document.visibilityState === 'visible' && pathname !== '/') {
        // App coming to foreground
        const backgroundDuration = Date.now() - backgroundStartTime.current;
        log(`App returning from background after ${Math.round(backgroundDuration / 1000)}s`);

        // Always send keepalive first
        sendKeepalive();

        // If backgrounded for more than threshold, proactively refresh token
        if (backgroundDuration > BACKGROUND_REFRESH_THRESHOLD) {
          log('Long background period detected, refreshing token...');
          const refreshed = await refreshAccessToken(true); // Force refresh
          if (!refreshed) {
            // Refresh failed - verify current token
            const token = await storage.getItem('accessToken');
            if (token) {
              const isValid = await verifyToken(token);
              if (!isValid) {
                log('Token expired after background, logging out');
                setIsAuthenticated(false);
                router.push('/');
              }
            } else {
              // No token at all, logout
              setIsAuthenticated(false);
              router.push('/');
            }
          }
        } else {
          // Short background - just verify token is still valid
          const token = await storage.getItem('accessToken');
          if (token) {
            const isValid = await verifyToken(token);
            if (!isValid) {
              // Token expired during short background, try refresh
              const refreshed = await refreshAccessToken(true);
              if (!refreshed) {
                setIsAuthenticated(false);
                router.push('/');
              }
            }
          }
        }
      }
    };

    // iOS PWA: Handle page focus (additional trigger for foreground)
    const handleFocus = async () => {
      if (pathname !== '/') {
        sendKeepalive();
      }
    };

    // iOS PWA: Handle online/offline status
    const handleOnline = async () => {
      log('Network came online, refreshing token...');
      if (pathname !== '/') {
        await refreshAccessToken();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    // Clean up interval and event listeners on unmount
    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [pathname, router, refreshAccessToken, verifyToken, sendKeepalive]);

  const logout = useCallback(async () => {
    log('Logging out...');
    try {
      const token = await storage.getItem('accessToken');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Continue with local logout even if API fails
    }

    // Clear all auth data
    await storage.removeItem('accessToken');
    await storage.removeItem('refreshToken');

    setIsAuthenticated(false);
    setIsLoading(false);
    router.push('/');
  }, [router]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated and not on login page
  if (!isAuthenticated && pathname !== '/') {
    router.push('/');
    return null;
  }

  // Redirect to dashboard if authenticated and on login page
  if (isAuthenticated && pathname === '/') {
    router.push('/dashboard');
    return null;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, logout, refreshToken: refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

