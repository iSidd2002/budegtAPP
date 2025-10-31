// Service Worker for Budget App PWA
const CACHE_NAME = 'budget-app-v3';
const OFFLINE_URL = '/offline.html';

// Only pre-cache the minimal static assets needed for offline UX
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
];

function shouldCache(request) {
  try {
    const url = new URL(request.url);
    // Only cache same-origin requests
    if (url.origin !== self.location.origin) return false;

    // Never cache API requests or auth endpoints
    if (url.pathname.startsWith('/api/')) return false;

    // Avoid caching dev hot-update assets
    if (url.pathname.startsWith('/_next/static/webpack')) return false;

    // Cache hashed build assets/icon/manifest/offline only
    if (url.pathname.startsWith('/_next/')) return true; // hashed, safe to cache
    if (url.pathname.startsWith('/icons/')) return true;
    if (url.pathname === '/manifest.json') return true;
    if (url.pathname === '/offline.html') return true;

    // Do NOT cache app pages like '/' or '/dashboard' to avoid auth staleness
    return false;
  } catch {
    return false;
  }
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching minimal assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error('[Service Worker] Cache addAll error:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip non-http(s) requests (extensions, etc.)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses only when we explicitly allow it
        if (response.status === 200 && shouldCache(event.request)) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        // Network failed, try cache
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;

        // If requesting a page and not in cache, show offline page
        if (event.request.mode === 'navigate') {
          const offline = await cache.match(OFFLINE_URL);
          if (offline) return offline;
        }

        // For other requests, return a basic response
        return new Response('Offline - content not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' }),
        });
      })
  );
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
