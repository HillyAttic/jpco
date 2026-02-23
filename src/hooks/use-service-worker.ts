import { useEffect, useState, useCallback, useRef } from 'react';
import { useResponsive } from './use-responsive';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
  error: string | null;
}

interface OfflineQueueItem {
  url: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  timestamp: number;
}

export function useServiceWorker() {
  const { device } = useResponsive();
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: navigator.onLine,
    updateAvailable: false,
    registration: null,
    error: null
  });

  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);
  const offlineQueueRef = useRef<OfflineQueueItem[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    offlineQueueRef.current = offlineQueue;
  }, [offlineQueue]);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      setState(prev => ({
        ...prev,
        isSupported: false,
        error: 'Service Worker not supported'
      }));
      return;
    }

    try {
      // Check if firebase-messaging-sw.js is already registered
      const existingRegistrations = await navigator.serviceWorker.getRegistrations();
      const firebaseSwRegistration = existingRegistrations.find(
        reg => reg.active?.scriptURL.includes('firebase-messaging-sw.js')
      );

      // If firebase-messaging-sw.js is already registered, use it
      if (firebaseSwRegistration) {
        console.log('[SW] firebase-messaging-sw.js already registered, skipping re-registration');
        
        setState(prev => ({
          ...prev,
          isSupported: true,
          isRegistered: true,
          registration: firebaseSwRegistration,
          error: null
        }));
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('[SW] Service worker is ready');
        
        // Check for updates
        firebaseSwRegistration.addEventListener('updatefound', () => {
          const newWorker = firebaseSwRegistration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState(prev => ({
                  ...prev,
                  updateAvailable: true
                }));
              }
            });
          }
        });
        
        return;
      }

      // Only unregister OTHER service workers (not firebase-messaging-sw.js)
      console.log('[SW Fix] Found', existingRegistrations.length, 'existing service workers');
      
      for (const reg of existingRegistrations) {
        if (reg.active && !reg.active.scriptURL.includes('firebase-messaging-sw.js')) {
          console.log('[SW Fix] Unregistering conflicting SW:', reg.active.scriptURL);
          await reg.unregister();
        }
      }

      // Wait a bit for unregistration to complete
      if (existingRegistrations.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Register Firebase messaging service worker for push notifications
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
        updateViaCache: 'none', // Always check for latest SW version
      });

      console.log('[SW] Registered firebase-messaging-sw.js successfully');

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('[SW] Service worker is ready');

      setState(prev => ({
        ...prev,
        isSupported: true,
        isRegistered: true,
        registration,
        error: null
      }));

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState(prev => ({
                ...prev,
                updateAvailable: true
              }));
            }
          });
        }
      });

      console.log('Service Worker registered successfully');
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Service Worker registration failed: ${error}`
      }));
      console.error('Service Worker registration failed:', error);
    }
  }, []);

  // Update service worker
  const updateServiceWorker = useCallback(async () => {
    if (state.registration) {
      try {
        await state.registration.update();
        window.location.reload();
      } catch (error) {
        console.error('Service Worker update failed:', error);
      }
    }
  }, [state.registration]);

  // Handle online/offline status
  const handleOnlineStatus = useCallback(() => {
    const isOnline = navigator.onLine;
    setState(prev => ({ ...prev, isOnline }));
    // Note: processOfflineQueue will be triggered by the useEffect that watches state.isOnline
  }, []); // Remove offlineQueue dependency to break the loop

  // Add request to offline queue
  const queueOfflineRequest = useCallback((
    url: string,
    method: string = 'GET',
    body?: any,
    headers?: Record<string, string>
  ) => {
    const queueItem: OfflineQueueItem = {
      url,
      method,
      body,
      headers,
      timestamp: Date.now()
    };

    setOfflineQueue(prev => [...prev, queueItem]);

    // Store in localStorage for persistence
    const existingQueue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
    localStorage.setItem('offline-queue', JSON.stringify([...existingQueue, queueItem]));
  }, []);

  // Process offline queue when back online
  const processOfflineQueue = useCallback(async () => {
    const currentQueue = offlineQueueRef.current;
    const isOnline = navigator.onLine;

    if (!isOnline || currentQueue.length === 0) return;

    const processedItems: string[] = [];

    for (const item of currentQueue) {
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
          processedItems.push(`${item.method}-${item.url}-${item.timestamp}`);
        }
      } catch (error) {
        console.error('Failed to process offline queue item:', error);
      }
    }

    // Remove processed items from queue
    setOfflineQueue(prev => {
      const filtered = prev.filter(item =>
        !processedItems.includes(`${item.method}-${item.url}-${item.timestamp}`)
      );

      // Update localStorage with remaining items
      localStorage.setItem('offline-queue', JSON.stringify(filtered));
      return filtered;
    });
  }, []); // Remove dependencies to break the loop

  // Cache critical resources - DISABLED
  const cacheCriticalResources = useCallback(async () => {
    // Caching disabled - no resources will be cached
    console.log('Resource caching is disabled');
  }, []);

  // Get cache usage information
  const getCacheUsage = useCallback(async () => {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0,
        percentage: estimate.quota ? Math.round((estimate.usage || 0) / estimate.quota * 100) : 0
      };
    } catch (error) {
      console.error('Failed to get cache usage:', error);
      return null;
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, []);

  // Initialize service worker and event listeners
  useEffect(() => {
    registerServiceWorker();

    // Load offline queue from localStorage
    const savedQueue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
    setOfflineQueue(savedQueue);

    // Add online/offline event listeners
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [registerServiceWorker]); // Remove handleOnlineStatus dependency to break the loop

  // Cache critical resources when service worker is ready - DISABLED
  // Caching is disabled, so this effect does nothing
  useEffect(() => {
    // No caching
  }, [state.isRegistered]);

  // Process offline queue when online status changes
  useEffect(() => {
    if (state.isOnline && offlineQueue.length > 0) {
      processOfflineQueue();
    }
  }, [state.isOnline]); // Only depend on isOnline, not processOfflineQueue or offlineQueue

  return {
    ...state,
    updateServiceWorker,
    queueOfflineRequest,
    processOfflineQueue,
    cacheCriticalResources,
    getCacheUsage,
    clearCache,
    offlineQueueLength: offlineQueue.length
  };
}

// Hook for offline-aware API calls
export function useOfflineAPI() {
  const { isOnline, queueOfflineRequest } = useServiceWorker();

  const apiCall = useCallback(async (
    url: string,
    options: RequestInit = {}
  ) => {
    if (!isOnline && options.method && options.method !== 'GET') {
      // Queue non-GET requests for later
      queueOfflineRequest(
        url,
        options.method,
        options.body,
        options.headers as Record<string, string>
      );

      // Register background sync to retry when online
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if ('sync' in registration) {
            await (registration as any).sync.register('sync-offline-requests');
            console.log('[Offline API] Background sync registered');
          }
        } catch (error) {
          console.error('[Offline API] Background sync registration failed:', error);
        }
      }

      throw new Error('Request queued for when online');
    }

    // Proceed with normal fetch
    return fetch(url, options);
  }, [isOnline, queueOfflineRequest]);

  return {
    apiCall,
    isOnline
  };
}

// Hook for offline-aware form submissions
export function useOfflineForm() {
  const { isOnline, queueOfflineRequest } = useServiceWorker();
  const [pendingSubmissions, setPendingSubmissions] = useState<number>(0);

  const submitForm = useCallback(async (
    url: string,
    formData: any,
    options: RequestInit = {}
  ) => {
    if (!isOnline) {
      queueOfflineRequest(
        url,
        'POST',
        formData,
        { 'Content-Type': 'application/json', ...options.headers as Record<string, string> }
      );

      setPendingSubmissions(prev => prev + 1);
      return { success: true, queued: true };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: JSON.stringify(formData),
        ...options
      });

      return { success: response.ok, queued: false, response };
    } catch (error) {
      throw error;
    }
  }, [isOnline, queueOfflineRequest]);

  return {
    submitForm,
    isOnline,
    pendingSubmissions
  };
}