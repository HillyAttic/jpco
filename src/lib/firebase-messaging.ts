"use client";

import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import app from './firebase';

let messaging: Messaging | null = null;

// Initialize Firebase Messaging
export const initializeMessaging = () => {
  if (typeof window === 'undefined') return null;
  
  if (!messaging) {
    try {
      messaging = getMessaging(app);
      console.log('[FCM] Messaging initialized');
    } catch (error) {
      console.error('[FCM] Failed to initialize messaging:', error);
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

    // Check if service worker is registered
    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
      console.warn('[FCM] Service worker not registered');
      return null;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission denied');
      return null;
    }

    // Get FCM token
    const token = await getToken(messagingInstance, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('[FCM] Token obtained:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.warn('[FCM] No token available');
      return null;
    }
  } catch (error) {
    console.error('[FCM] Error getting token:', error);
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
