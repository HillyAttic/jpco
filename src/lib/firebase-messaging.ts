import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import app from './firebase';

let messaging: Messaging | null = null;

// Initialize messaging only on client side
if (typeof window !== 'undefined') {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
  }
}

/**
 * Mobile device detection utilities
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}

export function getIOSVersion(): number | null {
  if (!isIOSDevice()) return null;
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Initialize Firebase Messaging with service worker
 */
export async function initializeMessaging(): Promise<string | null> {
  if (!messaging) {
    console.error('Firebase Messaging not initialized');
    return null;
  }

  try {
    // Wait for service worker to be ready
    console.log('Waiting for service worker to be ready...');
    const registration = await navigator.serviceWorker.ready;
    console.log('Service worker ready:', registration.active?.scriptURL);

    // Get token with the service worker registration
    const token = await getToken(messaging, {
      vapidKey: 'BH5arpn_RZW-cMfEqaei2QO_Q6vG4Cp9gzBvCiZrC_PO8n6l9EuglcLGtAT_zYWqWa6hJSLACpBdUpPdhVc74GM',
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('FCM Token obtained:', token);
      return token;
    } else {
      console.error('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Error initializing messaging:', error);
    return null;
  }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    if (!messaging) {
      console.error('Firebase Messaging not initialized');
      return null;
    }

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications');
      return null;
    }

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.error('Service workers not supported');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('Notification permission granted');

      // Initialize messaging and get token
      const token = await initializeMessaging();

      if (token) {
        console.log('FCM Token:', token);
        return token;
      } else {
        console.error('No registration token available');
        return null;
      }
    } else if (permission === 'denied') {
      console.error('Notification permission denied');
      return null;
    } else {
      console.log('Notification permission dismissed');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
}

/**
 * Request notification permission with mobile-specific handling
 */
export async function requestNotificationPermissionMobile(): Promise<string | null> {
  try {
    // Check if iOS and not in standalone mode
    if (isIOSDevice() && !isStandalonePWA()) {
      console.error('iOS requires PWA mode for notifications');
      throw new Error('On iOS, please add this app to your home screen first to enable notifications');
    }

    // Check iOS version
    if (isIOSDevice()) {
      const iosVersion = getIOSVersion();
      if (iosVersion && iosVersion < 16.4) {
        throw new Error('Push notifications require iOS 16.4 or later');
      }
    }

    // Check if notifications are supported
    if (!('Notification' in window)) {
      throw new Error('Notifications are not supported on this device');
    }

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers are not supported on this device');
    }

    // Wait for service worker to be ready
    console.log('Waiting for service worker...');
    await navigator.serviceWorker.ready;
    console.log('Service worker is ready');

    // Request permission
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      throw new Error('Notification permission was denied');
    }

    // Get FCM token
    return await requestNotificationPermission();
  } catch (error) {
    console.error('Error in mobile notification permission:', error);
    throw error;
  }
}

/**
 * Listen for foreground messages
 * IMPORTANT: Only calls the callback, does NOT create duplicate browser notifications
 * The service worker handles all notification display to prevent duplicates
 */
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) {
    console.error('Firebase Messaging not initialized');
    return () => { };
  }

  return onMessage(messaging, (payload) => {
    console.log('[Foreground] Message received:', payload);

    // With data-only messages, title/body are in payload.data
    // Fall back to payload.notification for backward compatibility
    const data = payload.data || {};
    const notificationTitle = data.title || payload.notification?.title || 'New Notification';
    const notificationBody = data.body || payload.notification?.body || 'You have a new notification';

    // DO NOT create browser notification here - let service worker handle it
    // This prevents duplicate notifications (one from SW, one from here)
    
    // Only call the callback for UI updates (like updating notification badge)
    // Include extracted title/body for convenience
    callback({
      ...payload,
      notification: {
        ...payload.notification,
        title: notificationTitle,
        body: notificationBody,
      }
    });
  });
}

import { authenticatedFetch } from '@/lib/api-client';

/**
 * Save FCM token to Firestore for the user
 */
export async function saveFCMToken(userId: string, token: string): Promise<boolean> {
  try {
    const response = await authenticatedFetch('/api/notifications/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ userId, token }),
    });

    if (!response.ok) {
      throw new Error('Failed to save FCM token');
    }

    console.log('FCM token saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return false;
  }
}

/**
 * Delete FCM token from Firestore
 */
export async function deleteFCMToken(userId: string): Promise<boolean> {
  try {
    const response = await authenticatedFetch('/api/notifications/fcm-token', {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete FCM token');
    }

    console.log('FCM token deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting FCM token:', error);
    return false;
  }
}

export { messaging };
