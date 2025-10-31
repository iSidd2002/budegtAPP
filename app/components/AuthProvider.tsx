'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { storage } from '@/lib/storage';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Function to refresh access token
    const refreshAccessToken = async () => {
      try {
        // Get refresh token from persistent storage (IndexedDB + localStorage for PWA)
        const refreshToken = await storage.getItem('refreshToken');

        console.log('[AuthProvider] Attempting token refresh...');
        console.log('[AuthProvider] Has refreshToken in storage:', !!refreshToken);
        console.log('[AuthProvider] RefreshToken length:', refreshToken?.length || 0);

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
          await storage.setItem('accessToken', data.accessToken);
          // Store refresh token in persistent storage for PWA compatibility
          if (data.refreshToken) {
            await storage.setItem('refreshToken', data.refreshToken);
            console.log('[AuthProvider] New refreshToken stored in persistent storage');
          }
          console.log('[AuthProvider] Token refreshed successfully');
          return true;
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.log('[AuthProvider] Token refresh failed:', errorData);
          // Clear tokens on failure
          await storage.removeItem('accessToken');
          await storage.removeItem('refreshToken');
          return false;
        }
      } catch (error) {
        console.error('[AuthProvider] Token refresh error:', error);
        return false;
      }
    };

    // Function to verify if access token is valid
    const verifyToken = async (token: string): Promise<boolean> => {
      try {
        // Make a test API call to verify token is valid
        const response = await fetch('/api/budget?month=1&year=2025', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });
        return response.ok;
      } catch {
        return false;
      }
    };

    // Function to check if user is authenticated
    const checkAuth = async () => {
      // If on login page, no need to check auth
      if (pathname === '/') {
        console.log('[AuthProvider] On login page, skipping auth check');
        return;
      }

      const token = await storage.getItem('accessToken');
      console.log('[AuthProvider] Checking auth on pathname:', pathname);
      console.log('[AuthProvider] Has access token:', !!token);

      // If no token, try to refresh
      if (!token) {
        console.log('[AuthProvider] No access token found, attempting refresh...');
        const refreshed = await refreshAccessToken();

        if (!refreshed) {
          console.log('[AuthProvider] Refresh failed, redirecting to login');
          router.push('/');
        }
        return;
      }

      // If token exists, verify it's still valid
      console.log('[AuthProvider] Verifying access token...');
      const isValid = await verifyToken(token);

      if (!isValid) {
        console.log('[AuthProvider] Access token invalid/expired, attempting refresh...');
        const refreshed = await refreshAccessToken();

        if (!refreshed) {
          console.log('[AuthProvider] Refresh failed, redirecting to login');
          router.push('/');
        }
      } else {
        console.log('[AuthProvider] Access token is valid');
      }
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

    // Clean up interval on unmount
    return () => clearInterval(refreshInterval);
  }, [pathname, router]);

  return <>{children}</>;
}

