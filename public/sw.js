// Progressive Web App Service Worker
// This service worker handles caching, offline functionality, and PWA installation

const CACHE_NAME = 'jpco-dashboard-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/logo/logo-192.png',
  '/images/logo/logo-512.png',
  '/images/logo/logo-maskable-192.png',
  '/images/logo/logo-maskable-512.png',
  '/images/icons/dashboard-96.png',
  '/images/icons/tasks-96.png',
  '/images/icons/employees-96.png',
  '/images/screenshots/desktop-dashboard.png',
  '/images/screenshots/mobile-dashboard.png',
  '/styles/main.css',
  '/scripts/main.js',
  '/scripts/vendor.js',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip browser extensions and non-GET requests
  if (event.request.url.startsWith('chrome-extension://') ||
      event.request.url.startsWith('moz-extension://')) {
    return;
  }

  // For API requests, use network first with cache fallback
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If response is good, cache it
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // For static assets, use cache first
  if (STATIC_ASSETS.some(asset => event.request.url.includes(asset))) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // If cached, return it
          if (response) {
            return response;
          }

          // Otherwise fetch from network and cache it
          return fetch(event.request).then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          });
        })
        .catch(() => {
          // If everything fails, return offline page
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // For all other requests, try network first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If response is good, cache it
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request);
      })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-requests') {
    event.waitUntil(
      processOfflineQueue()
    );
  }
});

// Process offline queue
async function processOfflineQueue() {
  const queue = await getOfflineQueue();

  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        body: item.body ? JSON.stringify(item.body) : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...item.headers
        }
      });

      if (response.ok) {
        await removeFromOfflineQueue(item);
      }
    } catch (error) {
      console.error('[SW] Failed to process offline queue item:', error);
      // Stop processing if one fails
      break;
    }
  }
}

// Get offline queue from localStorage
async function getOfflineQueue() {
  const queue = localStorage.getItem('offline-queue');
  return queue ? JSON.parse(queue) : [];
}

// Remove item from offline queue
async function removeFromOfflineQueue(item) {
  const queue = await getOfflineQueue();
  const filteredQueue = queue.filter(queueItem =>
    !(queueItem.url === item.url &&
      queueItem.method === item.method &&
      queueItem.timestamp === item.timestamp)
  );
  localStorage.setItem('offline-queue', JSON.stringify(filteredQueue));
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const title = data.title || 'JPCO Dashboard';
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/images/logo/logo-192.png',
      badge: '/images/logo/logo-72.png',
      data: { url: data.url || '/' },
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification was closed', event.notification);
});

// Periodic background sync for token refresh
const TOKEN_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

setInterval(() => {
  self.registration.pushManager.getSubscription()
    .then((subscription) => {
      if (subscription) {
        // Trigger token refresh
        self.registration.active?.postMessage({ type: 'token_refresh' });
      }
    });
}, TOKEN_REFRESH_INTERVAL);

console.log('[SW] Service worker loaded successfully');