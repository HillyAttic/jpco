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

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'New Notification',
    body: 'You have a new notification',
    icon: '/images/logo/logo-icon.svg',
    badge: '/images/logo/logo-icon.svg',
    data: {
      url: '/',
    },
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.message || data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: {
          url: data.actionUrl || data.url || '/',
          notificationId: data.notificationId,
        },
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      actions: [
        {
          action: 'open',
          title: 'View',
        },
        {
          action: 'close',
          title: 'Dismiss',
        },
      ],
    }
  );

  event.waitUntil(promiseChain);
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

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
