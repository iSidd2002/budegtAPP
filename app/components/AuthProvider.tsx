'use client';

import { useEffect, useState, createContext, useContext, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { storage } from '@/lib/storage';

// Debug logging only in development
const DEBUG = process.env.NODE_ENV === 'development';
const log = DEBUG ? console.log.bind(console, '[Auth]') : () => {};

// Token refresh configuration
const ACCESS_TOKEN_REFRESH_INTERVAL = 90 * 60 * 1000; // 90 minutes (token lives 2h, refresh at 90min)
const MIN_REFRESH_INTERVAL = 60 * 1000; // Minimum 60 seconds between refreshes
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
  // cookieOnly=true: skip storage lookup, send empty body — server uses httpOnly cookie (iOS recovery)
  const refreshAccessToken = useCallback(async (force = false, cookieOnly = false): Promise<boolean> => {
    // Prevent concurrent refreshes
    if (isRefreshing.current) {
      log('Refresh already in progress, skipping');
      return true; // Assume success if already refreshing
    }

    // Debounce: prevent refresh spam (unless forced or doing cookie recovery)
    const now = Date.now();
    if (!force && !cookieOnly && now - lastRefreshTime.current < MIN_REFRESH_INTERVAL) {
      log('Too soon since last refresh, skipping');
      return true;
    }

    try {
      isRefreshing.current = true;

      let bodyToken: string | null = null;
      if (!cookieOnly) {
        bodyToken = await storage.getItem('refreshToken');
        if (!bodyToken) {
          log('No refresh token available');
          return false;
        }
      }

      log(cookieOnly ? 'Cookie-only refresh (storage recovery)...' : 'Refreshing access token...');
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: cookieOnly ? '{}' : JSON.stringify({ refreshToken: bodyToken }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.accessToken) {
          await storage.setItem('accessToken', data.accessToken);
          lastRefreshTime.current = Date.now();
          log('Access token refreshed successfully');

          if (data.refreshToken) {
            await storage.setItem('refreshToken', data.refreshToken);
            log('Refresh token stored' + (cookieOnly ? ' (cookie recovery)' : ' (rotated)'));
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
    // Decode JWT exp claim without verifying signature (client-side only)
    const getTokenExpiry = (token: string): number | null => {
      try {
        const [, payload] = token.split('.');
        const { exp } = JSON.parse(atob(payload));
        return typeof exp === 'number' ? exp : null;
      } catch { return null; }
    };

    // Function to check if user is authenticated
    const checkAuth = async () => {
      log('Checking authentication...');

      let accessToken = await storage.getItem('accessToken');
      const refreshToken = await storage.getItem('refreshToken');

      // If no access token, try to refresh
      if (!accessToken) {
        if (!refreshToken) {
          // Storage may have been wiped by iOS 7-day eviction — try cookie-based recovery
          log('Storage empty, attempting httpOnly cookie recovery...');
          const recovered = await refreshAccessToken(true, true); // force + cookieOnly
          if (!recovered) {
            setIsAuthenticated(false);
            setIsLoading(false);
            if (pathname !== '/') router.push('/');
            return;
          }
          // Recovery succeeded — tokens are now back in IndexedDB
          accessToken = await storage.getItem('accessToken');
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

      // Offline guard: when there's no network, trust a recently-expired token
      // rather than booting the user to the login screen
      if (!navigator.onLine && accessToken) {
        const exp = getTokenExpiry(accessToken);
        const nowSec = Date.now() / 1000;
        if (exp !== null && (nowSec < exp || nowSec - exp < 86400)) {
          log('Offline: granting 24h grace period for expired token');
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
      }

      // If token exists, verify it's still valid
      const isValid = await verifyToken(accessToken!);

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

    // Storage keepalive: re-write access token once per day to reset iOS 7-day eviction clock.
    // iOS only evicts storage that hasn't been *written* in 7 days, reads don't count.
    const STORAGE_KEEPALIVE_MS = 24 * 60 * 60 * 1000;
    const keepaliveId = setInterval(async () => {
      const tok = await storage.getItem('accessToken');
      if (tok) {
        await storage.setItem('accessToken', tok);
        log('Storage keepalive: re-wrote access token to reset iOS eviction clock');
      }
    }, STORAGE_KEEPALIVE_MS);

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
      clearInterval(keepaliveId);
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-apple-blue to-apple-indigo flex items-center justify-center shadow-apple-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-apple-blue animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-apple-blue animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-apple-blue animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
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

