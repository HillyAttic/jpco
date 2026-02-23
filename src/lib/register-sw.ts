/**
 * Service Worker Registration Utility
 * 
 * Explicitly registers the Firebase messaging service worker
 * and ensures it's active before FCM token generation.
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[SW] Service workers not supported');
    return null;
  }

  try {
    // Check if our service worker is already registered
    const existingRegistration = await navigator.serviceWorker.getRegistration('/');
    
    if (existingRegistration?.active?.scriptURL.includes('firebase-messaging-sw.js')) {
      console.log('[SW] Already registered:', existingRegistration.scope);
      return existingRegistration;
    }

    // Unregister any other service workers (clean slate)
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      if (!registration.active?.scriptURL.includes('firebase-messaging-sw.js')) {
        console.log('[SW] Unregistering old service worker:', registration.scope);
        await registration.unregister();
      }
    }

    // Register the Firebase messaging service worker
    console.log('[SW] Registering firebase-messaging-sw.js...');
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { 
        scope: '/',
        updateViaCache: 'none' // Always fetch fresh service worker
      }
    );

    // Wait for service worker to be active
    if (registration.installing) {
      console.log('[SW] Installing...');
      await new Promise<void>((resolve) => {
        registration.installing!.addEventListener('statechange', (e) => {
          const state = (e.target as ServiceWorker).state;
          console.log('[SW] State changed to:', state);
          if (state === 'activated') {
            resolve();
          }
        });
      });
    } else if (registration.waiting) {
      console.log('[SW] Waiting to activate...');
      // Skip waiting and activate immediately
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[SW] Controller changed');
          resolve();
        }, { once: true });
      });
    }

    // Ensure service worker is controlling the page
    if (!navigator.serviceWorker.controller) {
      console.log('[SW] Waiting for controller...');
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[SW] Controller ready');
          resolve();
        }, { once: true });
      });
    }

    console.log('[SW] ✅ Registered and active:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[SW] ❌ Registration failed:', error);
    return null;
  }
}

/**
 * Check if service worker is registered and active
 */
export async function isServiceWorkerActive(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    return !!(registration?.active?.scriptURL.includes('firebase-messaging-sw.js'));
  } catch {
    return false;
  }
}

/**
 * Unregister all service workers (for debugging)
 */
export async function unregisterAllServiceWorkers(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(reg => reg.unregister()));
  console.log('[SW] All service workers unregistered');
}
