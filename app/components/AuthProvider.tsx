'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { storage } from '@/lib/storage';

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

  useEffect(() => {
    // Function to refresh access token
    const refreshAccessToken = async () => {
      try {
        console.log('[AuthProvider] ===== STARTING TOKEN REFRESH =====');
        // Get refresh token from persistent storage (IndexedDB + localStorage for PWA)
        const refreshToken = await storage.getItem('refreshToken');

        console.log('[AuthProvider] Attempting token refresh...');
        console.log('[AuthProvider] Has refreshToken in storage:', !!refreshToken);
        console.log('[AuthProvider] RefreshToken length:', refreshToken?.length || 0);

        if (!refreshToken) {
          console.log('[AuthProvider] No refresh token available, cannot refresh');
          console.log('[AuthProvider] ===== TOKEN REFRESH FAILED (NO TOKEN) =====');
          return false;
        }

        console.log('[AuthProvider] Calling /api/auth/refresh...');
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }), // Send refresh token in body as fallback
        });

        console.log('[AuthProvider] Refresh response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('[AuthProvider] Refresh response data keys:', Object.keys(data));

          if (data.accessToken) {
            await storage.setItem('accessToken', data.accessToken);
            console.log('[AuthProvider] New access token stored successfully');

            // Store refresh token in persistent storage for PWA compatibility
            if (data.refreshToken) {
              await storage.setItem('refreshToken', data.refreshToken);
              console.log('[AuthProvider] New refreshToken stored in persistent storage');
            }
            console.log('[AuthProvider] ===== TOKEN REFRESH SUCCESS =====');
            return true;
          } else {
            console.error('[AuthProvider] No accessToken in refresh response');
            console.log('[AuthProvider] ===== TOKEN REFRESH FAILED (NO ACCESS TOKEN) =====');
            return false;
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.log('[AuthProvider] Token refresh failed:', response.status, errorData);
          // Clear tokens on failure
          console.log('[AuthProvider] Clearing invalid tokens...');
          await storage.removeItem('accessToken');
          await storage.removeItem('refreshToken');
          console.log('[AuthProvider] ===== TOKEN REFRESH FAILED =====');
          return false;
        }
      } catch (error) {
        console.error('[AuthProvider] Token refresh error:', error);
        console.log('[AuthProvider] ===== TOKEN REFRESH ERROR =====');
        return false;
      }
    };

    // Function to verify if access token is valid
    const verifyToken = async (token: string): Promise<boolean> => {
      try {
        console.log('[AuthProvider] Verifying token with /api/auth/verify...');
        // Use dedicated verify endpoint for cleaner token validation
        const response = await fetch('/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });

        console.log('[AuthProvider] Verify response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('[AuthProvider] Verify response data:', data);
          const isValid = data.valid === true;
          console.log('[AuthProvider] Token is valid:', isValid);
          return isValid;
        }
        console.log('[AuthProvider] Token verification failed - response not ok');
        return false;
      } catch (error) {
        console.error('[AuthProvider] Token verification error:', error);
        return false;
      }
    };

    // Function to send keepalive ping to prevent iOS storage deletion
    const sendKeepalive = async () => {
      try {
        const token = await storage.getItem('accessToken');
        if (!token) return;

        console.log('[AuthProvider] Sending keepalive ping...');
        const response = await fetch('/api/auth/keepalive', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (response.ok) {
          console.log('[AuthProvider] Keepalive successful');
        } else {
          console.log('[AuthProvider] Keepalive failed:', response.status);
        }
      } catch (error) {
        console.error('[AuthProvider] Keepalive error:', error);
      }
    };

    // Function to check if user is authenticated
    const checkAuth = async () => {
      console.log('[AuthProvider] ===== STARTING AUTH CHECK =====');
      console.log('[AuthProvider] Current pathname:', pathname);
      console.log('[AuthProvider] Current isAuthenticated:', isAuthenticated);
      console.log('[AuthProvider] Current isLoading:', isLoading);
      console.log('[AuthProvider] Browser session storage available:', !!window.sessionStorage);
      console.log('[AuthProvider] Browser local storage available:', !!window.localStorage);
      console.log('[AuthProvider] IndexedDB available:', !!window.indexedDB);

      // Always check for existing tokens, even on login page
      // If user has valid tokens, redirect to dashboard

      const accessToken = await storage.getItem('accessToken');
      const refreshToken = await storage.getItem('refreshToken');
      console.log('[AuthProvider] Storage check - accessToken:', !!accessToken, accessToken ? `(${accessToken.length} chars)` : '(null)');
      console.log('[AuthProvider] Storage check - refreshToken:', !!refreshToken, refreshToken ? `(${refreshToken.length} chars)` : '(null)');

      // If no access token, try to refresh
      if (!accessToken) {
        console.log('[AuthProvider] No access token found');
        if (!refreshToken) {
          console.log('[AuthProvider] No refresh token either, redirecting to login');
          setIsAuthenticated(false);
          setIsLoading(false);
          router.push('/');
          return;
        } else {
          console.log('[AuthProvider] No access token but have refresh token, attempting refresh...');
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            console.log('[AuthProvider] Refresh failed, redirecting to login');
            setIsAuthenticated(false);
            setIsLoading(false);
            router.push('/');
          } else {
            console.log('[AuthProvider] Successfully refreshed from no-access-token state');
            setIsAuthenticated(true);
            setIsLoading(false);
            await sendKeepalive();
          }
          return;
        }
      }

      // If token exists, verify it's still valid
      console.log('[AuthProvider] Verifying access token...');
      const isValid = await verifyToken(accessToken);

      if (!isValid) {
        console.log('[AuthProvider] Access token invalid/expired, attempting refresh...');
        const refreshed = await refreshAccessToken();

        if (!refreshed) {
          console.log('[AuthProvider] Refresh failed, redirecting to login');
          setIsAuthenticated(false);
          setIsLoading(false);
          router.push('/');
        } else {
          console.log('[AuthProvider] Successfully refreshed token');
          setIsAuthenticated(true);
          setIsLoading(false);
          // Send keepalive after successful refresh
          await sendKeepalive();
        }
      } else {
        console.log('[AuthProvider] Access token is valid');
        setIsAuthenticated(true);
        setIsLoading(false);
        // Send keepalive to prevent iOS storage deletion
        await sendKeepalive();
      }

      console.log('[AuthProvider] ===== AUTH CHECK COMPLETE =====');
    };

    // Check auth on mount and when pathname changes
    checkAuth();

    // Set up automatic token refresh every 10 minutes
    const refreshInterval = setInterval(async () => {
      const token = await storage.getItem('accessToken');
      if (token && pathname !== '/') {
        console.log('[AuthProvider] Auto-refreshing token...');
        await refreshAccessToken();
      }
    }, 10 * 60 * 1000); // 10 minutes

    // iOS PWA: Send keepalive when app comes back to foreground
    // This is CRITICAL for preventing iOS from deleting storage
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && pathname !== '/') {
        console.log('[AuthProvider] App became visible, sending keepalive...');
        await sendKeepalive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up interval and event listener on unmount
    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname, router]);

  const logout = async () => {
    console.log('[AuthProvider] Logging out...');
    try {
      const token = await storage.getItem('accessToken');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('[AuthProvider] Logout API error:', error);
    }

    // Clear all auth data
    await storage.removeItem('accessToken');
    await storage.removeItem('refreshToken');

    setIsAuthenticated(false);
    setIsLoading(false);
    router.push('/');
  };

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

