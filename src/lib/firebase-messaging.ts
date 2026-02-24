"use client";

import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import app from './firebase';
import { registerServiceWorker, isServiceWorkerActive } from './register-sw';

// Utility: Clean VAPID key - strips ALL possible corruption from env vars
// Handles: literal \r\n strings, actual whitespace, quotes, and any other invalid chars
// VAPID keys are base64url encoded, so only A-Za-z0-9, -, _ and = are valid
function cleanVapidKey(raw: string | undefined): string {
  if (!raw) return '';
  let cleaned = raw;
  // Remove literal backslash sequences using split/join (avoids regex escaping issues)
  // These handle the case where env var contains actual backslash-r-backslash-n text
  cleaned = cleaned.split('\\r\\n').join('');
  cleaned = cleaned.split('\\r').join('');
  cleaned = cleaned.split('\\n').join('');
  // Remove quotes that might wrap the value
  cleaned = cleaned.replace(/["']/g, '');
  // Remove actual whitespace characters (spaces, tabs, real CR, LF)
  cleaned = cleaned.replace(/\s/g, '');
  return cleaned;
}

let messaging: Messaging | null = null;

// Initialize Firebase Messaging
export const initializeMessaging = () => {
  // CRITICAL: Only run in browser
  if (typeof window === 'undefined') {
    return null;
  }

  // CRITICAL: Check if browser supports required APIs
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    console.warn('[FCM] Browser does not support push notifications');
    return null;
  }

  // Check if running in secure context (HTTPS or localhost)
  if (!window.isSecureContext) {
    console.warn('[FCM] Push notifications require a secure context (HTTPS)');
    return null;
  }

  // CRITICAL: Validate VAPID key is configured
  const vapidKey = cleanVapidKey(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);
  if (!vapidKey) {
    console.error('[FCM] ❌ VAPID key not configured! Set NEXT_PUBLIC_FIREBASE_VAPID_KEY in environment variables');
    console.error('[FCM] 💡 Get your VAPID key from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates');
    return null;
  }

  // Log VAPID key info for debugging (first/last chars only)
  const rawKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';
  console.log(`[FCM] VAPID key: raw length=${rawKey.length}, clean length=${vapidKey.length}, key=${vapidKey.substring(0, 4)}...${vapidKey.substring(vapidKey.length - 4)}`);

  // Return existing instance if already initialized
  if (messaging) {
    return messaging;
  }

  // Initialize messaging with error handling
  try {
    messaging = getMessaging(app);
    console.log('[FCM] Messaging initialized successfully');
    return messaging;
  } catch (error: any) {
    // Handle specific Firebase errors
    if (error?.code === 'messaging/unsupported-browser') {
      console.warn('[FCM] This browser does not support Firebase Cloud Messaging');
    } else {
      console.error('[FCM] Failed to initialize messaging:', error);
    }
    return null;
  }
};

// Get FCM token with retry logic - OPTIMIZED FOR SPEED
export const getFCMToken = async (retries = 3): Promise<string | null> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const messagingInstance = initializeMessaging();
      if (!messagingInstance) {
        console.warn('[FCM] Messaging not available');
        return null;
      }

      // Request notification permission first (fast)
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[FCM] Notification permission denied');
        return null;
      }

      // Register service worker in parallel with permission request
      console.log(`[FCM] Registering service worker (attempt ${attempt}/${retries})...`);
      const registrationPromise = registerServiceWorker();

      // Don't wait for full registration, just wait for it to start
      const registration = await Promise.race([
        registrationPromise,
        new Promise<ServiceWorkerRegistration | null>((resolve) =>
          setTimeout(() => resolve(null), 2000) // 2 second timeout
        )
      ]);

      if (!registration) {
        // Try to get existing registration
        const existingReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        if (existingReg) {
          console.log('[FCM] Using existing service worker registration');
        } else {
          console.error('[FCM] ❌ Service worker registration timeout');
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          return null;
        }
      }

      console.log('[FCM] ✅ Service worker ready');

      // Get FCM token with explicit service worker registration
      console.log('[FCM] Requesting FCM token...');
      // CRITICAL: clean the VAPID key to strip any \r\n, quotes, or whitespace from env vars
      const vapidKey = cleanVapidKey(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);
      console.log(`[FCM] Using VAPID key: ${vapidKey.substring(0, 4)}...${vapidKey.substring(vapidKey.length - 4)} (length: ${vapidKey.length})`);

      const token = await getToken(messagingInstance, {
        vapidKey,
        serviceWorkerRegistration: registration || undefined,
      });

      if (token) {
        console.log('[FCM] ✅ Token obtained:', token.substring(0, 20) + '...');
        return token;
      }

      console.warn('[FCM] Failed to get token');
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      return null;
    } catch (error) {
      console.error(`[FCM] Error getting token (attempt ${attempt}/${retries}):`, error);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      return null;
    }
  }
  return null;
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
  const messagingInstance = initializeMessaging();
  if (!messagingInstance) return () => { };

  return onMessage(messagingInstance, (payload) => {
    console.log('[FCM] Foreground message received:', payload);
    callback(payload);
  });
};

// Save FCM token to Firestore
export const saveFCMToken = async (userId: string, token: string) => {
  try {
    // Import authenticatedFetch to include auth token
    const { authenticatedFetch } = await import('@/lib/api-client');

    const response = await authenticatedFetch('/api/notifications/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ userId, token }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save FCM token');
    }

    console.log('[FCM] Token saved successfully');
    return true;
  } catch (error) {
    console.error('[FCM] Error saving token:', error);
    return false;
  }
};

// Delete FCM token from Firestore
export const deleteFCMToken = async (userId: string) => {
  try {
    // Import authenticatedFetch to include auth token
    const { authenticatedFetch } = await import('@/lib/api-client');

    const response = await authenticatedFetch('/api/notifications/fcm-token', {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete FCM token');
    }

    console.log('[FCM] Token deleted successfully');
    return true;
  } catch (error) {
    console.error('[FCM] Error deleting token:', error);
    return false;
  }
};

// Helper function to check if device is mobile
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Helper function to check if device is iOS
export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

// Helper function to check if running as standalone PWA
export const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
};

// Helper function to get iOS version
export const getIOSVersion = (): number | null => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !isIOSDevice()) return null;
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : null;
};

// Request notification permission (desktop/web)
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    if (!('Notification' in window)) {
      console.warn('[FCM] Notifications not supported');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return await getFCMToken();
    }

    return null;
  } catch (error) {
    console.error('[FCM] Error requesting permission:', error);
    return null;
  }
};

// Request notification permission for mobile devices
export const requestNotificationPermissionMobile = async (): Promise<string | null> => {
  try {
    if (!('Notification' in window)) {
      console.warn('[FCM] Notifications not supported');
      return null;
    }

    // For iOS, check if running as PWA
    if (isIOSDevice() && !isStandalonePWA()) {
      console.warn('[FCM] iOS requires PWA to be installed for notifications');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return await getFCMToken();
    }

    return null;
  } catch (error) {
    console.error('[FCM] Error requesting mobile permission:', error);
    return null;
  }
};


// Setup token refresh listener - CRITICAL FOR MOBILE
export const setupTokenRefreshListener = (userId: string, onTokenRefresh?: (token: string) => void) => {
  const messagingInstance = initializeMessaging();
  if (!messagingInstance) {
    console.warn('[FCM] Messaging not available for token refresh');
    return () => { };
  }

  console.log('[FCM] Setting up token refresh listener');

  // Listen for token refresh
  const unsubscribe = onMessage(messagingInstance, async (payload) => {
    // Check if this is a token refresh message
    if (payload.data?.type === 'token_refresh') {
      console.log('[FCM] Token refresh requested');
      try {
        const newToken = await getFCMToken();
        if (newToken) {
          await saveFCMToken(userId, newToken);
          if (onTokenRefresh) {
            onTokenRefresh(newToken);
          }
          console.log('[FCM] ✅ Token refreshed successfully');
        }
      } catch (error) {
        console.error('[FCM] Error refreshing token:', error);
      }
    }
  });

  // Also check token validity periodically (every 24 hours)
  const intervalId = setInterval(async () => {
    console.log('[FCM] Periodic token check');
    try {
      const currentToken = await getFCMToken();
      if (currentToken) {
        await saveFCMToken(userId, currentToken);
        console.log('[FCM] ✅ Token validated and updated');
      }
    } catch (error) {
      console.error('[FCM] Error during periodic token check:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours

  // Return cleanup function
  return () => {
    unsubscribe();
    clearInterval(intervalId);
    console.log('[FCM] Token refresh listener cleaned up');
  };
};

// Check if notifications are supported and enabled
export const checkNotificationSupport = (): {
  supported: boolean;
  permission: NotificationPermission;
  isIOS: boolean;
  isPWA: boolean;
  iosVersion: number | null;
  requiresPWA: boolean;
} => {
  const isIOS = isIOSDevice();
  const isPWA = isStandalonePWA();
  const iosVersion = getIOSVersion();

  // iOS 16.4+ supports web push in PWA mode
  const requiresPWA = isIOS && (iosVersion === null || iosVersion >= 16);

  return {
    supported: 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window,
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
    isIOS,
    isPWA,
    iosVersion,
    requiresPWA,
  };
};
