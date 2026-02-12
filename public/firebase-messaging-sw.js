// Firebase Cloud Messaging Service Worker
// This file must be in the public folder and served from the root  
// VERSION: 5.1 - Reliable background notifications for Android PWA
//
// ARCHITECTURE:
// - Firebase messaging SDK is loaded (required for FCM token generation via getToken())
// - onBackgroundMessage is NOT used (it's unreliable on Android Chrome)
// - ALL notification display is handled by our custom 'push' event handler
// - Every push event ALWAYS calls showNotification() to prevent Chrome's fallback

importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

// Take control immediately
self.addEventListener('install', (event) => {
  console.log('[SW v5.1] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW v5.1] Activating...');
  event.waitUntil(clients.claim());
});

// Initialize Firebase (required for FCM push subscription management)
firebase.initializeApp({
  apiKey: "AIzaSyBkxT1xMRCj2iAoig87tBkFXSGcoZyuQDw",
  authDomain: "jpcopanel.firebaseapp.com",
  projectId: "jpcopanel",
  storageBucket: "jpcopanel.firebasestorage.app",
  messagingSenderId: "492450530050",
  appId: "1:492450530050:web:174cf5cec2a9bdaeb8381b",
  measurementId: "G-GNT1N7174R"
});

// Initialize messaging - required for getToken() to work on client side
// The SDK registers its own push handler, but we override notification display
const messaging = firebase.messaging();

// IMPORTANT: Register onBackgroundMessage but return FALSE to tell Firebase
// SDK that we did NOT handle the notification display.
// This prevents Firebase from "consuming" the push event silently.
messaging.onBackgroundMessage((payload) => {
  console.log('[SW v5.1] onBackgroundMessage fired:', JSON.stringify(payload));
  // Return undefined/void - do NOT return a showNotification promise here
  // Our push handler below will display the notification
});

/**
 * Build notification options from FCM data payload
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
 * PUSH EVENT HANDLER - Main notification display logic
 * 
 * Chrome REQUIRES event.waitUntil(showNotification()) or it shows
 * "Tap to copy the URL for this app" fallback.
 * 
 * Every code path MUST call showNotification().
 */
self.addEventListener('push', (event) => {
  console.log('[SW v5.1] ===== PUSH EVENT =====');

  const notificationPromise = (async () => {
    try {
      if (!event.data) {
        console.log('[SW v5.1] No push data');
        return self.registration.showNotification('JPCO Dashboard', {
          body: 'You have a new notification',
          icon: '/images/logo/logo-icon.svg',
          badge: '/images/logo/logo-icon.svg',
          tag: 'jpco-nodata-' + Date.now(),
          requireInteraction: true,
          vibrate: [300, 100, 300, 100, 300],
        });
      }

      // Parse push payload
      let payload;
      try {
        payload = event.data.json();
      } catch (e) {
        const text = event.data.text();
        console.log('[SW v5.1] Text payload:', text);
        return self.registration.showNotification('JPCO Dashboard', {
          body: text || 'You have a new notification',
          icon: '/images/logo/logo-icon.svg',
          badge: '/images/logo/logo-icon.svg',
          tag: 'jpco-text-' + Date.now(),
          requireInteraction: true,
          vibrate: [300, 100, 300, 100, 300],
        });
      }

      console.log('[SW v5.1] Payload keys:', Object.keys(payload));

      // Extract data from FCM message
      // Data-only: { data: { title, body, ... }, from: "..." }
      // Notification: { notification: { title, body }, data: { ... } }
      // Firebase wrapped: { data: { ... }, fcmMessageId: "..." }
      const data = payload.data || {};
      const notification = payload.notification || {};

      const title = data.title || notification.title || 'JPCO Dashboard';

      // Merge notification fields into data for buildNotificationOptions
      if (!data.body && notification.body) data.body = notification.body;
      if (!data.icon && notification.icon) data.icon = notification.icon;

      const options = buildNotificationOptions(data);

      console.log('[SW v5.1] 🔔 Title:', title);
      console.log('[SW v5.1] 🔔 Body:', options.body);

      return self.registration.showNotification(title, options);

    } catch (error) {
      console.error('[SW v5.1] Error:', error);
      return self.registration.showNotification('JPCO Dashboard', {
        body: 'You have a new notification',
        icon: '/images/logo/logo-icon.svg',
        badge: '/images/logo/logo-icon.svg',
        tag: 'jpco-error-' + Date.now(),
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300],
      });
    }
  })();

  event.waitUntil(notificationPromise);
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW v5.1] Click:', event.action);
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          try {
            const clientUrl = new URL(client.url);
            const targetUrl = new URL(urlToOpen, self.location.origin);
            if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
              return client.focus();
            }
          } catch (e) { /* skip */ }
        }
        if (windowClients.length > 0 && windowClients[0].navigate) {
          return windowClients[0].navigate(urlToOpen).then(c => c?.focus());
        }
        if (clients.openWindow) return clients.openWindow(urlToOpen);
      })
      .catch((e) => console.error('[SW v5.1] Click error:', e))
  );
});

self.addEventListener('notificationclose', () => {
  console.log('[SW v5.1] Dismissed');
});

console.log('[SW v5.1] Loaded');
