// Firebase Cloud Messaging Service Worker
// This file must be in the public folder and served from the root  
// VERSION: 6.0 - Fixed locked/closed app notifications with data-only payload
//
// CRITICAL FIXES:
// 1. Service worker explicitly registered before FCM token generation
// 2. Data-only payload handling (no notification payload from server)
// 3. Service worker handles ALL notification display
// 4. Works when app is closed, locked, or in background
//
// ARCHITECTURE:
// - Firebase messaging SDK loaded (required for FCM token generation)
// - onBackgroundMessage NOT used (unreliable on Android Chrome)
// - ALL notification display handled by custom 'push' event handler
// - Data-only payload ensures consistent behavior across platforms
// - Service worker ALWAYS calls showNotification() to prevent Chrome fallback

importScripts('https://www.gstatic.com/firebasejs/11.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.11.0/firebase-messaging-compat.js');

// Take control immediately
self.addEventListener('install', (event) => {
  console.log('[SW v6.0] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW v6.0] Activating...');
  event.waitUntil(
    (async () => {
      // Enable navigation preload for better performance
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
      // Take control of all clients immediately
      await clients.claim();
      console.log('[SW v6.0] ✅ Activated and controlling clients');
    })()
  );
});

// Handle skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW v6.0] Skip waiting requested');
    self.skipWaiting();
  }
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
const messaging = firebase.messaging();

// Track shown notifications to prevent duplicates
const shownNotifications = new Set();

// Clean up old notification IDs every 5 minutes
setInterval(() => {
  shownNotifications.clear();
}, 5 * 60 * 1000);

// IMPORTANT: Do NOT use onBackgroundMessage - it's unreliable
// Our push handler below handles ALL notification display
messaging.onBackgroundMessage((payload) => {
  console.log('[SW v6.0] onBackgroundMessage fired (ignored):', JSON.stringify(payload));
  // Do nothing - let push handler display the notification
});

/**
 * Build notification options from FCM data payload
 * UPDATED: Handles data-only payload (no notification object from server)
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
 * CRITICAL FIXES:
 * 1. Handles data-only payload (no notification object from server)
 * 2. Works when app is closed, locked, or in background
 * 3. Chrome REQUIRES event.waitUntil(showNotification()) or shows fallback
 * 4. Every code path MUST call showNotification() - no exceptions!
 */
self.addEventListener('push', (event) => {
  console.log('[SW v6.0] ===== PUSH EVENT RECEIVED =====');
  console.log('[SW v6.0] App state: closed/locked/background');

  const notificationPromise = (async () => {
    try {
      // Validate push data exists
      if (!event.data) {
        console.log('[SW v6.0] ⚠️ No push data - showing default notification');
        return self.registration.showNotification('JPCO Dashboard', {
          body: 'You have a new notification',
          icon: '/images/logo/logo-icon.svg',
          badge: '/images/logo/logo-icon.svg',
          tag: 'jpco-nodata-' + Date.now(),
          requireInteraction: true,
          vibrate: [300, 100, 300, 100, 300],
        });
      }

      // Parse push payload with validation
      let payload;
      try {
        payload = event.data.json();
        if (!payload) {
          throw new Error('Empty payload');
        }
      } catch (e) {
        console.log('[SW v6.0] ⚠️ JSON parse failed:', e.message);
        const text = event.data.text();
        console.log('[SW v6.0] Text payload:', text);
        return self.registration.showNotification('JPCO Dashboard', {
          body: text || 'You have a new notification',
          icon: '/images/logo/logo-icon.svg',
          badge: '/images/logo/logo-icon.svg',
          tag: 'jpco-text-' + Date.now(),
          requireInteraction: true,
          vibrate: [300, 100, 300, 100, 300],
        });
      }

      console.log('[SW v6.0] Raw payload:', JSON.stringify(payload));
      console.log('[SW v6.0] Payload keys:', Object.keys(payload));

      // UPDATED: Handle data-only payload
      // Server now sends: { data: { title, body, icon, url, ... }, from: "...", fcmMessageId: "..." }
      const data = payload.data || payload || {};
      
      // Extract title and body from data payload
      const title = data.title || 'JPCO Dashboard';
      const body = data.body || 'You have a new notification';

      console.log('[SW v6.0] Extracted title:', title);
      console.log('[SW v6.0] Extracted body:', body);

      const options = buildNotificationOptions(data);

      // Check for duplicate notification
      const notificationId = options.tag;
      if (shownNotifications.has(notificationId)) {
        console.log('[SW v6.0] ⚠️ Duplicate notification detected:', notificationId);
        // IMPORTANT: Still must call showNotification() to prevent Chrome fallback
        // Just update the tag to make it unique
        options.tag = notificationId + '-dup-' + Date.now();
        console.log('[SW v6.0] 🔄 Showing with new tag:', options.tag);
      }

      // Mark as shown
      shownNotifications.add(notificationId);

      console.log('[SW v6.0] 🔔 Displaying notification');
      console.log('[SW v6.0] 🔔 Title:', title);
      console.log('[SW v6.0] 🔔 Body:', options.body);
      console.log('[SW v6.0] 🔔 Tag:', options.tag);
      console.log('[SW v6.0] 🔔 URL:', options.data.url);

      return self.registration.showNotification(title, options);

    } catch (error) {
      console.error('[SW v6.0] ❌ Push handler error:', error.message || error);
      console.error('[SW v6.0] ❌ Stack:', error.stack);
      // CRITICAL: Even on error, must show notification to prevent Chrome fallback
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
  console.log('[SW v6.0] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'close') {
    console.log('[SW v6.0] Notification dismissed by user');
    return;
  }

  const urlToOpen = event.notification.data?.url || '/notifications';
  console.log('[SW v6.0] Opening URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Try to focus existing window with same URL
        for (const client of windowClients) {
          try {
            const clientUrl = new URL(client.url);
            const targetUrl = new URL(urlToOpen, self.location.origin);
            if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
              console.log('[SW v6.0] Focusing existing window');
              return client.focus();
            }
          } catch (e) { 
            console.error('[SW v6.0] URL comparison error:', e.message);
          }
        }
        
        // Navigate existing window if available
        if (windowClients.length > 0 && windowClients[0].navigate) {
          console.log('[SW v6.0] Navigating existing window');
          return windowClients[0].navigate(urlToOpen).then(c => c?.focus());
        }
        
        // Open new window
        if (clients.openWindow) {
          console.log('[SW v6.0] Opening new window');
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((e) => console.error('[SW v6.0] Click handler error:', e.message || e))
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW v6.0] Notification closed:', event.notification.tag);
});

console.log('[SW v6.0] ✅ Service worker loaded and ready');
