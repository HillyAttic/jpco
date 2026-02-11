// Service Worker for JPCO Dashboard
// CACHING DISABLED - Network-only mode
// All requests go directly to the network, no caching
// NOTE: Push notifications are handled EXCLUSIVELY by firebase-messaging-sw.js
// This SW should NOT register push/notification handlers to avoid conflicts

const CACHE_NAME = 'jpco-dashboard-disabled';

// Install event - skip caching
self.addEventListener('install', (event) => {
  console.log('Service Worker (sw.js): Installing (caching disabled)...');
  self.skipWaiting();
});

// Activate event - clean up ALL caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker (sw.js): Activating (clearing all caches)...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('Service Worker (sw.js): Deleting cache', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        console.log('Service Worker (sw.js): All caches cleared, activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - NO CACHING, all requests go to network
self.addEventListener('fetch', (event) => {
  // All requests go directly to network, no caching
  // This ensures fresh data on every request
  event.respondWith(fetch(event.request));
});

console.log('Service Worker (sw.js): Loaded (caching disabled, network-only mode, NO push handlers)');

// Background sync event (for offline support)
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Sync notifications when back online
      fetch('/api/notifications/sync')
        .then((response) => response.json())
        .then((data) => {
          console.log('Notifications synced:', data);
        })
        .catch((error) => {
          console.error('Sync failed:', error);
        })
    );
  }
});
