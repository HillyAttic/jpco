// Service Worker for JPCO Dashboard
// Provides offline functionality, caching, and responsive asset management

const CACHE_NAME = 'jpco-dashboard-v2'; // Incremented version to force cache refresh
const STATIC_CACHE = 'jpco-static-v2';
const DYNAMIC_CACHE = 'jpco-dynamic-v2';
const IMAGE_CACHE = 'jpco-images-v2';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/offline',
  '/manifest.json',
  '/images/logo/logo.svg',
  '/images/logo/logo-icon.svg',
  // Core CSS and JS files will be added by Next.js automatically
];

// Routes to cache dynamically
const DYNAMIC_ROUTES = [
  '/categories',
  '/clients',
  '/employees',
  '/teams',
  '/tasks',
  '/attendance'
];

// Image extensions to cache
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/categories/,
  /\/api\/clients/,
  /\/api\/employees/,
  /\/api\/teams/
];

// Utility functions
const isImageRequest = (url) => {
  return IMAGE_EXTENSIONS.some(ext => url.pathname.includes(ext));
};

const isAPIRequest = (url) => {
  return url.pathname.startsWith('/api/');
};

const isCacheableAPI = (url) => {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
};

const getDeviceType = () => {
  // Simple device detection based on user agent
  const userAgent = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
    return 'mobile';
  } else if (/tablet|ipad/i.test(userAgent)) {
    return 'tablet';
  }
  return 'desktop';
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except for images)
  if (url.origin !== location.origin && !isImageRequest(url)) {
    return;
  }

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Handle different types of requests with appropriate caching strategies
    
    // 1. Static assets - Cache First
    if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
      return await cacheFirst(request, STATIC_CACHE);
    }
    
    // 2. Images - Cache First with responsive optimization
    if (isImageRequest(url)) {
      return await handleImageRequest(request);
    }
    
    // 3. API requests - Network First with cache fallback
    if (isAPIRequest(url)) {
      return await handleAPIRequest(request);
    }
    
    // 4. Navigation requests - Network First with offline fallback
    if (request.mode === 'navigate') {
      return await handleNavigationRequest(request);
    }
    
    // 5. Other requests - Network First
    return await networkFirst(request, DYNAMIC_CACHE);
    
  } catch (error) {
    console.error('Service Worker: Request failed', error);
    return await handleOfflineRequest(request);
  }
}

// Caching strategies
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function handleImageRequest(request) {
  // For images in /images/icons/ directory, always fetch fresh (no cache)
  // These are critical UI images that should not be cached
  const url = new URL(request.url);
  if (url.pathname.includes('/images/icons/')) {
    try {
      const networkResponse = await fetch(request);
      return networkResponse;
    } catch (error) {
      // If network fails, try cache as fallback
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  }
  
  // For other images, use cache-first strategy
  return await cacheFirst(request, IMAGE_CACHE);
}

function getOptimizedImageUrl(url, deviceType) {
  // Disabled responsive image optimization to prevent 404 errors
  // Images are served as-is from their original paths
  return url.href;
}

async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  // For cacheable API endpoints, use stale-while-revalidate
  if (isCacheableAPI(url)) {
    return await staleWhileRevalidate(request, DYNAMIC_CACHE);
  }
  
  // For other API requests, always try network first
  return await networkFirst(request, DYNAMIC_CACHE);
}

async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Network failed, return cached version if available
    return cachedResponse;
  });
  
  // Return cached version immediately if available, otherwise wait for network
  return cachedResponse || await fetchPromise;
}

async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return await caches.match('/offline') || new Response(
      createOfflinePage(),
      { 
        headers: { 'Content-Type': 'text/html' },
        status: 200
      }
    );
  }
}

async function handleOfflineRequest(request) {
  const url = new URL(request.url);
  
  // Try to return cached version
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Return appropriate offline response based on request type
  if (request.mode === 'navigate') {
    return new Response(createOfflinePage(), {
      headers: { 'Content-Type': 'text/html' },
      status: 200
    });
  }
  
  if (isImageRequest(url)) {
    return new Response(createOfflineImageSVG(), {
      headers: { 'Content-Type': 'image/svg+xml' },
      status: 200
    });
  }
  
  if (isAPIRequest(url)) {
    return new Response(JSON.stringify({ 
      error: 'Offline', 
      message: 'This feature is not available offline' 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503
    });
  }
  
  return new Response('Offline', { status: 503 });
}

function createOfflinePage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - JPCO Dashboard</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f8fafc;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .offline-container {
          text-align: center;
          max-width: 400px;
          padding: 40px 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .offline-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
          opacity: 0.6;
        }
        h1 {
          margin: 0 0 16px;
          font-size: 24px;
          font-weight: 600;
        }
        p {
          margin: 0 0 24px;
          color: #64748b;
          line-height: 1.6;
        }
        .retry-button {
          background: #5750f1;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .retry-button:hover {
          background: #4338ca;
        }
        @media (max-width: 480px) {
          .offline-container {
            margin: 20px;
            padding: 30px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <svg class="offline-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 11-9.75 9.75 9.75 9.75 0 019.75-9.75z" />
        </svg>
        <h1>You're Offline</h1>
        <p>It looks like you've lost your internet connection. Some features may not be available until you're back online.</p>
        <button class="retry-button" onclick="window.location.reload()">
          Try Again
        </button>
      </div>
    </body>
    </html>
  `;
}

function createOfflineImageSVG() {
  return `
    <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="150" fill="#f1f5f9"/>
      <circle cx="100" cy="75" r="30" fill="#cbd5e1"/>
      <path d="M85 65 L115 65 L115 85 L85 85 Z" fill="#94a3b8"/>
      <circle cx="92" cy="72" r="3" fill="#64748b"/>
      <text x="100" y="120" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="12">Image unavailable offline</text>
    </svg>
  `;
}

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // Handle any pending operations when connection is restored
  console.log('Service Worker: Handling background sync');
  
  // You could implement queued API calls, form submissions, etc.
  // For now, just update caches
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    // Refresh critical data
    const criticalUrls = ['/api/user', '/api/dashboard-stats'];
    
    for (const url of criticalUrls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.log('Service Worker: Failed to sync', url);
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// Handle push notifications (if needed in the future)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/images/logo/logo-icon.svg',
      badge: '/images/logo/logo-icon.svg',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

console.log('Service Worker: Loaded successfully');