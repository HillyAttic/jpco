// Enhanced Service Worker for JPCO Dashboard
// VERSION: 2.0.0
// Provides: Offline support, caching strategies, background sync
// UPDATED: Performance fix - removed API response caching, bumped version to force cache refresh

const CACHE_VERSION = 'jpco-v2.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Resources to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/offline.html',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing enhanced service worker v1.1.0');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Install failed:', err))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating enhanced service worker');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('jpco-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== IMAGE_CACHE)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip Firebase and external API calls
  if (url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com')) {
    return;
  }

  // NEVER cache the notifications page - always fetch fresh
  if (url.pathname === '/notifications' || url.pathname.startsWith('/notifications/')) {
    return; // Let browser handle it, no caching
  }

  // NEVER cache API responses - they must always be fresh
  // Caching API responses causes stale data on mobile devices
  if (url.pathname.startsWith('/api/')) {
    return; // Let browser handle it, no caching
  }

  // Handle different resource types with appropriate strategies
  if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Use stale-while-revalidate for JS bundles to allow updates
    event.respondWith(staleWhileRevalidateStrategy(request, STATIC_CACHE));
  } else {
    event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE));
  }
});

// Cache First Strategy - for static assets and images
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    return caches.match('/offline.html');
  }
}

// Network First Strategy - for API calls
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network first strategy failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Stale While Revalidate Strategy - for pages
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(error => {
      console.error('[SW] Stale while revalidate fetch failed:', error);
      return caches.match('/offline.html');
    });

  return cachedResponse || fetchPromise;
}

// Background Sync - retry failed requests
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'sync-offline-requests') {
    event.waitUntil(syncOfflineRequests());
  }
});

async function syncOfflineRequests() {
  try {
    // Get offline queue from IndexedDB or localStorage
    const queue = JSON.parse(localStorage.getItem('offline-queue') || '[]');

    for (const item of queue) {
      try {
        await fetch(item.url, {
          method: item.method,
          body: item.body ? JSON.stringify(item.body) : undefined,
          headers: item.headers
        });
      } catch (error) {
        console.error('[SW] Failed to sync request:', error);
      }
    }

    // Clear the queue after successful sync
    localStorage.setItem('offline-queue', '[]');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Periodic Background Sync - fetch fresh data periodically
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync event:', event.tag);

  if (event.tag === 'update-dashboard-data') {
    event.waitUntil(updateDashboardData());
  }
});

async function updateDashboardData() {
  try {
    // Fetch fresh dashboard data
    const response = await fetch('/api/dashboard/summary');
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put('/api/dashboard/summary', response);
    }
  } catch (error) {
    console.error('[SW] Periodic sync failed:', error);
  }
}

// Message handler - for communication with the app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then(cache => cache.addAll(event.data.urls))
    );
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then(names => Promise.all(names.map(name => caches.delete(name))))
    );
  }
});

console.log('[SW] Enhanced service worker loaded v1.1.0');
