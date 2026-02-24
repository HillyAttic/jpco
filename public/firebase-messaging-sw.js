// Firebase Cloud Messaging Service Worker
// This file must be in the public folder and served from the root  
// VERSION: 7.0 - MOBILE FIX: Enhanced background notification handling
//
// CRITICAL FIXES FOR MOBILE (iOS/Android):
// 1. Proper notification payload extraction (supports both data and notification objects)
// 2. Enhanced notification options with actions and vibration
// 3. Notification click handling with proper URL navigation
// 4. Token refresh handling
// 5. Works when app is closed, locked, or in background on mobile devices
//
// ARCHITECTURE:
// - Firebase messaging SDK loaded (required for FCM token generation)
// - onBackgroundMessage handles ALL notification display (Firebase intercepts push events)
// - Supports both data-only and notification payloads
// - Proper notification channel configuration
// - Service worker ALWAYS calls showNotification() to prevent Chrome fallback

importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

// Take control immediately
self.addEventListener('install', (event) => {
  console.log('[SW v7.0] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW v7.0] Activating...');
  event.waitUntil(
    (async () => {
      // Enable navigation preload for better performance
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
      // Take control of all clients immediately
      await clients.claim();
      console.log('[SW v7.0] ✅ Activated and controlling clients');
    })()
  );
});

// Handle skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW v7.0] Skip waiting requested');
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

// Build notification options from data payload - ENHANCED FOR MOBILE
function buildNotificationOptions(data, notification = {}) {
  const notificationId = data.notificationId || `jpco-${Date.now()}`;
  
  // Check if we've already shown this notification
  if (shownNotifications.has(notificationId)) {
    console.log('[SW v7.0] ⚠️ Duplicate notification prevented:', notificationId);
    return null;
  }
  
  shownNotifications.add(notificationId);
  
  // Extract body from data or notification object
  const body = data.body || notification.body || 'You have a new notification';
  const icon = data.icon || notification.icon || '/images/logo/logo-icon.svg';
  const image = data.image || notification.image;
  
  return {
    body,
    icon,
    badge: '/images/logo/logo-icon.svg',
    image, // Large image for rich notifications
    tag: notificationId,
    requireInteraction: true, // Keep notification visible until user interacts
    renotify: true, // Alert user even if notification with same tag exists
    vibrate: [200, 100, 200], // Vibration pattern for mobile
    silent: false, // Play sound
    data: {
      url: data.url || '/notifications',
      notificationId,
      type: data.type || 'general',
      taskId: data.taskId || null,
      timestamp: Date.now(),
    },
    // Add action buttons for better UX
    actions: [
      {
        action: 'open',
        title: 'Open',
        icon: '/images/logo/logo-icon.svg'
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/images/logo/logo-icon.svg'
      }
    ]
  };
}

// CRITICAL: Firebase intercepts push events, so we MUST use onBackgroundMessage
// The raw 'push' event handler below will NOT fire when Firebase SDK is loaded
messaging.onBackgroundMessage((payload) => {
  console.log('[SW v7.0] ===== onBackgroundMessage RECEIVED =====');
  console.log('[SW v7.0] Full payload:', JSON.stringify(payload, null, 2));
  
  try {
    // Extract data from FCM payload - support both data and notification objects
    const data = payload.data || {};
    const notification = payload.notification || {};
    
    // Priority: data.title > notification.title > default
    const title = data.title || notification.title || 'JPCO Dashboard';
    
    console.log('[SW v7.0] Extracted title:', title);
    console.log('[SW v7.0] Data keys:', Object.keys(data));
    console.log('[SW v7.0] Notification keys:', Object.keys(notification));
    
    const options = buildNotificationOptions(data, notification);
    
    if (!options) {
      console.log('[SW v7.0] ⚠️ Duplicate notification, skipping');
      return Promise.resolve();
    }
    
    console.log('[SW v7.0] 🔔 Displaying notification');
    console.log('[SW v7.0] 🔔 Title:', title);
    console.log('[SW v7.0] 🔔 Body:', options.body);
    console.log('[SW v7.0] 🔔 Tag:', options.tag);
    console.log('[SW v7.0] 🔔 URL:', options.data.url);
    
    // CRITICAL: Must return promise from showNotification
    return self.registration.showNotification(title, options);
  } catch (error) {
    console.error('[SW v7.0] ❌ onBackgroundMessage error:', error.message || error);
    console.error('[SW v7.0] ❌ Stack:', error.stack);
    
    // Fallback notification
    return self.registration.showNotification('JPCO Dashboard', {
      body: 'You have a new notification',
      icon: '/images/logo/logo-icon.svg',
      badge: '/images/logo/logo-icon.svg',
      tag: 'jpco-error-' + Date.now(),
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300],
    });
  }
});

// Handle notification click - ENHANCED FOR MOBILE
self.addEventListener('notificationclick', (event) => {
  console.log('[SW v7.0] Notification clicked:', event.notification.tag);
  console.log('[SW v7.0] Action:', event.action);
  
  event.notification.close();
  
  // Handle action buttons
  if (event.action === 'close') {
    console.log('[SW v7.0] Notification dismissed by user');
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/notifications';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;
  
  console.log('[SW v7.0] Opening URL:', fullUrl);
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        console.log('[SW v7.0] Found', clientList.length, 'open windows');
        
        // Check if there's already a window open with the target URL
        for (const client of clientList) {
          if (client.url === fullUrl && 'focus' in client) {
            console.log('[SW v7.0] Focusing existing window');
            return client.focus();
          }
        }
        
        // Check if there's any window from our origin
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            console.log('[SW v7.0] Navigating existing window');
            return client.focus().then(() => {
              // Navigate to the notification URL
              return client.postMessage({
                type: 'NOTIFICATION_CLICK',
                url: urlToOpen,
              });
            });
          }
        }
        
        // No window open, open a new one
        console.log('[SW v7.0] Opening new window');
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
      .catch((error) => {
        console.error('[SW v7.0] Error handling notification click:', error);
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW v7.0] Notification closed:', event.notification.tag);
});

console.log('[SW v7.0] ✅ Service worker loaded and ready');
