"use client";

import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import app from './firebase';
import { registerServiceWorker, isServiceWorkerActive } from './register-sw';

let messaging: Messaging | null = null;

// Initialize Firebase Messaging
export const initializeMessaging = () => {
  if (typeof window === 'undefined') return null;
  
  // Check if browser supports required APIs
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    console.warn('[FCM] Browser does not support push notifications');
    return null;
  }
  
  // Check if running in secure context (HTTPS or localhost)
  if (!window.isSecureContext) {
    console.warn('[FCM] Push notifications require a secure context (HTTPS)');
    return null;
  }
  
  if (!messaging) {
    try {
      messaging = getMessaging(app);
      console.log('[FCM] Messaging initialized');
    } catch (error) {
      console.error('[FCM] Failed to initialize messaging:', error);
      return null;
    }
  }
  
  return messaging;
};

// Get FCM token
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const messagingInstance = initializeMessaging();
    if (!messagingInstance) {
      console.warn('[FCM] Messaging not available');
      return null;
    }

    // CRITICAL FIX: Explicitly register service worker FIRST
    console.log('[FCM] Registering service worker...');
    const registration = await registerServiceWorker();
    
    if (!registration) {
      console.error('[FCM] ❌ Failed to register service worker');
      return null;
    }

    // Verify service worker is active
    const isActive = await isServiceWorkerActive();
    if (!isActive) {
      console.error('[FCM] ❌ Service worker not active');
      return null;
    }

    console.log('[FCM] ✅ Service worker ready');

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission denied');
      return null;
    }

    // Get FCM token with explicit service worker registration
    console.log('[FCM] Requesting FCM token...');
    const token = await getToken(messagingInstance, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('[FCM] ✅ Token obtained:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.warn('[FCM] ❌ No token available');
      return null;
    }
  } catch (error) {
    console.error('[FCM] ❌ Error getting token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
  const messagingInstance = initializeMessaging();
  if (!messagingInstance) return () => {};

  return onMessage(messagingInstance, (payload) => {
    console.log('[FCM] Foreground message received:', payload);
    callback(payload);
  });
};

// Save FCM token to Firestore
export const saveFCMToken = async (userId: string, token: string) => {
  try {
    const response = await fetch('/api/fcm/save-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, token }),
    });

    if (!response.ok) {
      throw new Error('Failed to save FCM token');
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
    const response = await fetch('/api/fcm/delete-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete FCM token');
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
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Helper function to check if device is iOS
export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
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
  if (typeof window === 'undefined' || !isIOSDevice()) return null;
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
