// Firebase Cloud Messaging Service Worker
// This file must be in the public folder and served from the root

importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/images/logo/logo-icon.svg',
    badge: '/images/logo/logo-icon.svg',
    tag: payload.data?.taskId || 'jpco-notification',
    data: {
      url: payload.data?.url || '/notifications',
      taskId: payload.data?.taskId,
      type: payload.data?.type,
    },
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
    requireInteraction: false,
    vibrate: [200, 100, 200],
    // Mobile-specific options
    silent: false,
    timestamp: Date.now(),
    renotify: true,
  };

  console.log('[firebase-messaging-sw.js] Showing notification:', notificationTitle);
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') {
    console.log('[firebase-messaging-sw.js] Notification dismissed');
    return;
  }

  const urlToOpen = event.notification.data?.url || '/notifications';
  console.log('[firebase-messaging-sw.js] Opening URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        console.log('[firebase-messaging-sw.js] Found', windowClients.length, 'open windows');
        
        // Check if there's already a window open with the target URL
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen, self.location.origin);
          
          // If same path, focus the existing window
          if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
            console.log('[firebase-messaging-sw.js] Focusing existing window');
            return client.focus();
          }
        }
        
        // If there's any window open, navigate it to the target URL
        if (windowClients.length > 0 && windowClients[0].navigate) {
          console.log('[firebase-messaging-sw.js] Navigating existing window');
          return windowClients[0].navigate(urlToOpen).then(client => client?.focus());
        }
        
        // If no window is open, open a new one
        if (clients.openWindow) {
          console.log('[firebase-messaging-sw.js] Opening new window');
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((error) => {
        console.error('[firebase-messaging-sw.js] Error handling notification click:', error);
      })
  );
});

// Handle push events (for additional logging)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received:', event);
  
  // Firebase messaging handles this automatically via onBackgroundMessage
  // This listener is just for logging
});
