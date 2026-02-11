// Firebase Cloud Messaging Service Worker
// This file must be in the public folder and served from the root
// VERSION: 2.0 - Data-only messages for full notification control

importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

// Take control immediately on install/activate
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installing (v2.0)...');
  self.skipWaiting(); // Activate immediately, don't wait for old SW to stop
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activating (v2.0)...');
  event.waitUntil(clients.claim()); // Take control of all pages immediately
});

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyBkxT1xMRCj2iAoig87tBkFXSGcoZyuQDw",
  authDomain: "jpcopanel.firebaseapp.com",
  projectId: "jpcopanel",
  storageBucket: "jpcopanel.firebasestorage.app",
  messagingSenderId: "492450530050",
  appId: "1:492450530050:web:174cf5cec2a9bdaeb8381b",
  measurementId: "G-GNT1N7174R"
});

const messaging = firebase.messaging();

/**
 * Build notification options from data payload
 * Since we use DATA-ONLY FCM messages, title/body come from data, not notification
 */
function buildNotificationOptions(data) {
  return {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/images/logo/logo-icon.svg',
    badge: data.badge || '/images/logo/logo-icon.svg',
    // Use notificationId or taskId as tag for grouping
    tag: data.notificationId || data.taskId || ('jpco-' + Date.now()),
    data: {
      url: data.url || '/notifications',
      taskId: data.taskId || '',
      type: data.type || 'general',
      notificationId: data.notificationId || '',
    },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'close', title: 'Dismiss' },
    ],
    // CRITICAL for lock screen / heads-up:
    requireInteraction: true,   // Keep notification visible until user interacts
    vibrate: [300, 100, 300, 100, 300],  // Strong vibration pattern
    silent: false,              // Play sound
    timestamp: parseInt(data.timestamp) || Date.now(),
    renotify: true,             // Re-alert even if same tag exists
  };
}

/**
 * Handle background messages from FCM SDK
 * This fires for DATA-ONLY messages when the page is not in foreground
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', JSON.stringify(payload));

  // With data-only messages, everything is in payload.data
  const data = payload.data || {};
  const title = data.title || 'New Notification';
  const options = buildNotificationOptions(data);

  console.log('[firebase-messaging-sw.js] Showing background notification:', title, options);
  return self.registration.showNotification(title, options);
});

/**
 * Handle raw push events (fallback + direct push)
 * This fires for ALL push messages and is our safety net
 */
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received');

  if (!event.data) {
    console.log('[firebase-messaging-sw.js] No push data, skipping');
    return;
  }

  try {
    const payload = event.data.json();
    console.log('[firebase-messaging-sw.js] Push payload:', JSON.stringify(payload));

    // Data-only messages: everything is in payload.data
    const data = payload.data || {};

    // If there's no title in data, check if FCM auto-added notification
    // (shouldn't happen with data-only, but just in case)
    const title = data.title || payload.notification?.title || 'New Notification';

    // Merge any notification fields into data for buildNotificationOptions
    if (!data.body && payload.notification?.body) {
      data.body = payload.notification.body;
    }
    if (!data.icon && payload.notification?.icon) {
      data.icon = payload.notification.icon;
    }

    const options = buildNotificationOptions(data);

    console.log('[firebase-messaging-sw.js] Showing push notification:', title);

    event.waitUntil(
      self.registration.showNotification(title, options)
        .then(() => {
          console.log('[firebase-messaging-sw.js] ✅ Notification displayed successfully');
        })
        .catch((error) => {
          console.error('[firebase-messaging-sw.js] ❌ Error showing notification:', error);
        })
    );
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error parsing push data:', error);
  }
});

/**
 * Handle notification click events
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.action);

  event.notification.close();

  // If user clicked "Dismiss", do nothing
  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/notifications';
  console.log('[firebase-messaging-sw.js] Opening URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Try to find and focus an existing window with the same path
        for (const client of windowClients) {
          try {
            const clientUrl = new URL(client.url);
            const targetUrl = new URL(urlToOpen, self.location.origin);
            if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
              return client.focus();
            }
          } catch (e) {
            // URL parsing failed, skip this client
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
        console.error('[firebase-messaging-sw.js] Error handling click:', error);
      })
  );
});

/**
 * Handle notification close events (for analytics/tracking)
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw.js] Notification dismissed by user');
});
