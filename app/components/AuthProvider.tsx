'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { storage } from '@/lib/storage';

// Debug logging only in development
const DEBUG = process.env.NODE_ENV === 'development';
const log = DEBUG ? console.log.bind(console, '[Auth]') : () => {};

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
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

  // Function to refresh access token
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = await storage.getItem('refreshToken');

      if (!refreshToken) {
        log('No refresh token available');
        return false;
      }

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

          // Store new refresh token for PWA compatibility
          if (data.refreshToken) {
            await storage.setItem('refreshToken', data.refreshToken);
          }
          return true;
        }
        return false;
      } else {
        // Clear tokens on failure
        await storage.removeItem('accessToken');
        await storage.removeItem('refreshToken');
        return false;
      }
    } catch (error) {
      if (DEBUG) console.error('[Auth] Token refresh error:', error);
      return false;
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
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            setIsAuthenticated(false);
            setIsLoading(false);
            router.push('/');
          } else {
            setIsAuthenticated(true);
            setIsLoading(false);
            await sendKeepalive();
          }
          return;
        }
      }

      // If token exists, verify it's still valid
      const isValid = await verifyToken(accessToken);

      if (!isValid) {
        const refreshed = await refreshAccessToken();

        if (!refreshed) {
          setIsAuthenticated(false);
          setIsLoading(false);
          router.push('/');
        } else {
          setIsAuthenticated(true);
          setIsLoading(false);
          await sendKeepalive();
        }
      } else {
        setIsAuthenticated(true);
        setIsLoading(false);
        await sendKeepalive();
      }
    };

    // Check auth on mount and when pathname changes
    checkAuth();

    // Set up automatic token refresh every 10 minutes
    const refreshInterval = setInterval(async () => {
      const token = await storage.getItem('accessToken');
      if (token && pathname !== '/') {
        await refreshAccessToken();
      }
    }, 10 * 60 * 1000); // 10 minutes

    // iOS PWA: Send keepalive when app comes back to foreground
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && pathname !== '/') {
        await sendKeepalive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up interval and event listener on unmount
    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
    <AuthContext.Provider value={{ isAuthenticated, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

