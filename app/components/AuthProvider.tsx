'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Function to refresh access token
    const refreshAccessToken = async () => {
      try {
        // Get refresh token from localStorage (fallback for PWA)
        const refreshToken = localStorage.getItem('refreshToken');

        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }), // Send refresh token in body as fallback
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('accessToken', data.accessToken);
          // Store refresh token in localStorage for PWA compatibility
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
          console.log('[AuthProvider] Token refreshed successfully');
          return true;
        } else {
          console.log('[AuthProvider] Token refresh failed');
          // Clear tokens on failure
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          return false;
        }
      } catch (error) {
        console.error('[AuthProvider] Token refresh error:', error);
        return false;
      }
    };

    // Function to check if user is authenticated
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');

      // If on login page, no need to check auth
      if (pathname === '/') {
        return;
      }

      // If no token, try to refresh
      if (!token) {
        console.log('[AuthProvider] No access token found, attempting refresh...');
        const refreshed = await refreshAccessToken();

        if (!refreshed) {
          console.log('[AuthProvider] Refresh failed, redirecting to login');
          router.push('/');
        }
      }
    };

    // Check auth on mount and when pathname changes
    checkAuth();

    // Set up automatic token refresh every 10 minutes
    const refreshInterval = setInterval(async () => {
      const token = localStorage.getItem('accessToken');
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

