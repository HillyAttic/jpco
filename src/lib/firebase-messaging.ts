"use client";

import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import app from './firebase';
import { authenticatedFetch } from '@/lib/api-client';

// Utility: Clean VAPID key - strips ALL possible corruption from env vars
// VAPID keys are base64url encoded, so only A-Za-z0-9, -, _ and = are valid
function cleanVapidKey(raw: string | undefined): string {
  if (!raw) return '';
  let cleaned = raw;
  cleaned = cleaned.split('\\r\\n').join('');
  cleaned = cleaned.split('\\r').join('');
  cleaned = cleaned.split('\\n').join('');
  cleaned = cleaned.replace(/["']/g, '');
  cleaned = cleaned.replace(/\s/g, '');
  return cleaned;
}

// Pre-clean the VAPID key once at module load time (not on every call)
const VAPID_KEY = cleanVapidKey(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);

let messaging: Messaging | null = null;

// Initialize Firebase Messaging (cached singleton)
export const initializeMessaging = (): Messaging | null => {
  if (typeof window === 'undefined') return null;

  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    console.warn('[FCM] Browser does not support push notifications');
    return null;
  }

  if (!window.isSecureContext) {
    console.warn('[FCM] Push notifications require HTTPS');
    return null;
  }

  if (!VAPID_KEY) {
    console.error('[FCM] ❌ VAPID key not configured!');
    return null;
  }

  // Return cached instance
  if (messaging) return messaging;

  try {
    messaging = getMessaging(app);
    console.log('[FCM] Messaging initialized');
    return messaging;
  } catch (error: any) {
    if (error?.code === 'messaging/unsupported-browser') {
      console.warn('[FCM] Browser does not support FCM');
    } else {
      console.error('[FCM] Init failed:', error);
    }
    return null;
  }
};

/**
 * Get or reuse the firebase-messaging service worker registration.
 * FAST: Reuses existing registration immediately. Only registers new if none exists.
 * Does NOT unregister existing service workers (that was causing massive delays).
 */
async function getOrRegisterSW(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined;

  try {
    // 1. Check for existing registration first (instant — no network call)
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) {
      console.log('[FCM] Reusing existing SW registration');
      return existing;
    }

    // 2. Also check for firebase-specific registration
    const fbExisting = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (fbExisting) {
      console.log('[FCM] Reusing existing Firebase SW registration');
      return fbExisting;
    }

    // 3. No existing SW — register new one (only happens on first visit)
    console.log('[FCM] Registering new service worker...');
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' }
    );

    // Don't wait for full activation — Firebase SDK can work with installing/waiting SW
    console.log('[FCM] SW registered (state:', registration.active?.state || registration.installing?.state || 'pending', ')');
    return registration;
  } catch (error) {
    console.error('[FCM] SW registration error:', error);
    return undefined;
  }
}

/**
 * Get FCM token — ULTRA FAST version
 * No retry loops, no redundant permission requests, no SW lifecycle waits
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const messagingInstance = initializeMessaging();
    if (!messagingInstance) return null;

    // Get service worker registration (reuses existing — instant)
    const swRegistration = await getOrRegisterSW();

    // Get FCM token from Firebase — this is the only real network call
    console.log('[FCM] Requesting token...');
    const token = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      console.log('[FCM] ✅ Token obtained:', token.substring(0, 20) + '...');
      return token;
    }

    console.warn('[FCM] No token returned');
    return null;
  } catch (error) {
    console.error('[FCM] Error getting token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
  const messagingInstance = initializeMessaging();
  if (!messagingInstance) return () => { };

  return onMessage(messagingInstance, (payload) => {
    console.log('[FCM] Foreground message:', payload);
    callback(payload);
  });
};

// Save FCM token to Firestore — uses pre-imported authenticatedFetch (no dynamic import)
export const saveFCMToken = async (userId: string, token: string): Promise<boolean> => {
  try {
    const response = await authenticatedFetch('/api/notifications/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ userId, token }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save FCM token');
    }

    console.log('[FCM] Token saved');
    return true;
  } catch (error) {
    console.error('[FCM] Error saving token:', error);
    return false;
  }
};

// Delete FCM token from Firestore
export const deleteFCMToken = async (userId: string): Promise<boolean> => {
  try {
    const response = await authenticatedFetch('/api/notifications/fcm-token', {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete FCM token');
    }

    console.log('[FCM] Token deleted');
    return true;
  } catch (error) {
    console.error('[FCM] Error deleting token:', error);
    return false;
  }
};

// Device detection helpers
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
};

export const getIOSVersion = (): number | null => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !isIOSDevice()) return null;
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Request notification permission + get FCM token in ONE shot.
 * No redundant permission requests. No retry loops. Ultra fast.
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    if (!('Notification' in window)) {
      console.warn('[FCM] Notifications not supported');
      return null;
    }

    // If already granted, skip the permission prompt entirely
    if (Notification.permission === 'granted') {
      return await getFCMToken();
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

// Mobile-specific permission request (same as above but with iOS PWA check)
export const requestNotificationPermissionMobile = async (): Promise<string | null> => {
  try {
    if (!('Notification' in window)) {
      console.warn('[FCM] Notifications not supported');
      return null;
    }

    // iOS requires PWA mode
    if (isIOSDevice() && !isStandalonePWA()) {
      console.warn('[FCM] iOS requires PWA for notifications');
      return null;
    }

    // If already granted, skip prompt
    if (Notification.permission === 'granted') {
      return await getFCMToken();
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

// Token refresh listener
export const setupTokenRefreshListener = (userId: string, onTokenRefresh?: (token: string) => void) => {
  const messagingInstance = initializeMessaging();
  if (!messagingInstance) return () => { };

  console.log('[FCM] Setting up token refresh listener');

  const unsubscribe = onMessage(messagingInstance, async (payload) => {
    if (payload.data?.type === 'token_refresh') {
      console.log('[FCM] Token refresh requested');
      try {
        const newToken = await getFCMToken();
        if (newToken) {
          await saveFCMToken(userId, newToken);
          if (onTokenRefresh) onTokenRefresh(newToken);
          console.log('[FCM] ✅ Token refreshed');
        }
      } catch (error) {
        console.error('[FCM] Error refreshing token:', error);
      }
    }
  });

  // Check token validity every 24 hours
  const intervalId = setInterval(async () => {
    try {
      const currentToken = await getFCMToken();
      if (currentToken) {
        await saveFCMToken(userId, currentToken);
      }
    } catch (error) {
      console.error('[FCM] Periodic token check error:', error);
    }
  }, 24 * 60 * 60 * 1000);

  return () => {
    unsubscribe();
    clearInterval(intervalId);
  };
};

// Check notification support status
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
