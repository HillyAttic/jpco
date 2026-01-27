// Service Worker for JPCO Dashboard
// CACHING DISABLED - Network-only mode
// All requests go directly to the network, no caching

const CACHE_NAME = 'jpco-dashboard-disabled';

// Install event - skip caching
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing (caching disabled)...');
  self.skipWaiting();
});

// Activate event - clean up ALL caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating (clearing all caches)...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('Service Worker: Deleting cache', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        console.log('Service Worker: All caches cleared, activated');
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

console.log('Service Worker: Loaded (caching disabled, network-only mode)');
