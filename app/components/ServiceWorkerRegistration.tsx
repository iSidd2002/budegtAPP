'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    const ENABLE_SW =
      process.env.NODE_ENV === 'production' ||
      process.env.NEXT_PUBLIC_ENABLE_SW === 'true';

    if (!('serviceWorker' in navigator)) {
      return;
    }

    // In development (unless explicitly enabled), actively unregister existing SW and clear caches
    if (!ENABLE_SW) {
      (async () => {
        let hadAny = false;
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          if (regs.length > 0) {
            hadAny = true;
            await Promise.allSettled(regs.map((r) => r.unregister()));
          }
        } catch (e) {
          console.warn('[SW] Unregister error (dev):', e);
        }
        if ('caches' in window) {
          try {
            const keys = await caches.keys();
            await Promise.allSettled(
              keys
                .filter((k) => k.startsWith('budget-app-'))
                .map((k) => caches.delete(k))
            );
            if (keys.length > 0) hadAny = true;
          } catch (e) {
            console.warn('[SW] Cache cleanup error (dev):', e);
          }
        }
        // If we removed a controlling SW or cache, force a one-time hard reload to drop any stale chunks
        if (hadAny && !sessionStorage.getItem('__sw_dev_cleared')) {
          sessionStorage.setItem('__sw_dev_cleared', '1');
          // Add a query to avoid bfcache and ensure new assets
          const url = new URL(window.location.href);
          url.searchParams.set('no-sw', Date.now().toString());
          window.location.replace(url.toString());
        }
      })();
      return;
    }

    // Production (or explicitly enabled): register SW on load
    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration.scope);

          // Check for updates periodically
          const interval = setInterval(() => {
            registration.update();
          }, 60000); // Check every minute

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New service worker available');
                  if (confirm('A new version is available! Reload to update?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });

          // Clean up interval on controller change or unmount
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Service Worker controller changed');
            clearInterval(interval);
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}

