// Firebase Cloud Messaging Service Worker
// This file must be in the public folder and served from the root
// VERSION: 4.0 - FIXED: Reliable background notifications for Android PWA
//
// KEY FIX: On Android Chrome PWA, onBackgroundMessage() is unreliable.
// Chrome requires that the 'push' event handler calls showNotification()
// DIRECTLY via event.waitUntil(). If it doesn't, Chrome shows a generic
// "Tap to copy the URL for this app" fallback notification.
//
// Solution: Handle ALL notification display in the 'push' event handler.
// Do NOT use onBackgroundMessage() for display.

importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

// Take control immediately on install/activate
self.addEventListener('install', (event) => {
  console.log('[SW v4.0] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW v4.0] Activating...');
  event.waitUntil(clients.claim());
});

// Initialize Firebase in the service worker
// (needed for FCM token management, NOT for notification display)
firebase.initializeApp({
  apiKey: "AIzaSyBkxT1xMRCj2iAoig87tBkFXSGcoZyuQDw",
  authDomain: "jpcopanel.firebaseapp.com",
  projectId: "jpcopanel",
  storageBucket: "jpcopanel.firebasestorage.app",
  messagingSenderId: "492450530050",
  appId: "1:492450530050:web:174cf5cec2a9bdaeb8381b",
  measurementId: "G-GNT1N7174R"
});

// Initialize messaging (required for token generation on the client side)
const messaging = firebase.messaging();

// DO NOT use onBackgroundMessage for showing notifications!
// It is unreliable on Android Chrome PWA and causes the generic
// "Tap to copy the URL" fallback notification.
// Instead, we handle EVERYTHING in the 'push' event handler below.
//
// We keep onBackgroundMessage ONLY for logging (no showNotification call):
messaging.onBackgroundMessage((payload) => {
  console.log('[SW v4.0] onBackgroundMessage fired (logging only):', JSON.stringify(payload));
  // DO NOT call showNotification() here - the push handler handles it
});

/**
 * Build notification options from data payload
 */
function buildNotificationOptions(data) {
  const tag = data.notificationId || data.taskId || ('jpco-' + Date.now());

  return {
    body: data.body || data.message || 'You have a new notification',
    icon: data.icon || '/images/logo/logo-icon.svg',
    badge: data.badge || '/images/logo/logo-icon.svg',
    tag: tag,
    data: {
      url: data.url || data.actionUrl || '/notifications',
      taskId: data.taskId || '',
      type: data.type || 'general',
      notificationId: data.notificationId || '',
    },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'close', title: 'Dismiss' },
    ],
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    silent: false,
    timestamp: parseInt(data.timestamp) || Date.now(),
    renotify: true,
  };
}

/**
 * MAIN PUSH HANDLER - This is the ONLY place that calls showNotification()
 *
 * Chrome on Android requires that event.waitUntil() is called with a
 * showNotification() promise DIRECTLY in the 'push' event handler.
 * If this doesn't happen, Chrome shows the generic fallback notification.
 *
 * This handler fires for EVERY push message (FCM or otherwise).
 */
self.addEventListener('push', (event) => {
  console.log('[SW v4.0] Push event received');

  // CRITICAL: We MUST call event.waitUntil() with showNotification()
  // If we don't, Chrome shows "Tap to copy the URL for this app"
  const notificationPromise = (async () => {
    try {
      if (!event.data) {
        console.log('[SW v4.0] No push data, showing default notification');
        return self.registration.showNotification('JPCO Dashboard', {
          body: 'You have a new notification',
          icon: '/images/logo/logo-icon.svg',
          badge: '/images/logo/logo-icon.svg',
          tag: 'jpco-default-' + Date.now(),
        });
      }

      let payload;
      try {
        payload = event.data.json();
      } catch (e) {
        // If JSON parsing fails, try text
        const text = event.data.text();
        console.log('[SW v4.0] Push data (text):', text);
        return self.registration.showNotification('JPCO Dashboard', {
          body: text || 'You have a new notification',
          icon: '/images/logo/logo-icon.svg',
          badge: '/images/logo/logo-icon.svg',
          tag: 'jpco-text-' + Date.now(),
        });
      }

      console.log('[SW v4.0] Push payload:', JSON.stringify(payload));

      // Extract notification data
      // FCM data-only messages put everything in payload.data
      // FCM notification messages put display info in payload.notification
      const data = payload.data || {};

      // Get title - check data first (data-only), then notification (legacy)
      const title = data.title
        || payload.notification?.title
        || 'New Notification';

      // Merge notification fields into data if present
      if (!data.body && payload.notification?.body) {
        data.body = payload.notification.body;
      }
      if (!data.icon && payload.notification?.icon) {
        data.icon = payload.notification.icon;
      }

      const options = buildNotificationOptions(data);

      console.log('[SW v4.0] Showing notification:', title, JSON.stringify(options));

      return self.registration.showNotification(title, options);
    } catch (error) {
      console.error('[SW v4.0] Error in push handler:', error);
      // ALWAYS show SOMETHING to prevent Chrome's fallback
      return self.registration.showNotification('JPCO Dashboard', {
        body: 'You have a new notification',
        icon: '/images/logo/logo-icon.svg',
        badge: '/images/logo/logo-icon.svg',
        tag: 'jpco-error-' + Date.now(),
      });
    }
  })();

  // CRITICAL: event.waitUntil() MUST be called with the showNotification promise
  event.waitUntil(notificationPromise);
});

/**
 * Handle notification click events
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW v4.0] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/notifications';
  console.log('[SW v4.0] Opening URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Try to find and focus an existing window
        for (const client of windowClients) {
          try {
            const clientUrl = new URL(client.url);
            const targetUrl = new URL(urlToOpen, self.location.origin);
            if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
              return client.focus();
            }
          } catch (e) {
            // URL parsing failed, skip
          }
        }

        // Navigate an existing window to the target URL
        if (windowClients.length > 0 && windowClients[0].navigate) {
          return windowClients[0].navigate(urlToOpen).then(client => client?.focus());
        }

        // Open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((error) => {
        console.error('[SW v4.0] Error handling click:', error);
      })
  );
});

/**
 * Handle notification close events
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[SW v4.0] Notification dismissed');
});
