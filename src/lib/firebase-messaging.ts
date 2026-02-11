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

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: 'BH5arpn_RZW-cMfEqaei2QO_Q6vG4Cp9gzBvCiZrC_PO8n6l9EuglcLGtAT_zYWqWa6hJSLACpBdUpPdhVc74GM',
      });
      
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
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) {
    console.error('Firebase Messaging not initialized');
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    
    // Show browser notification for foreground messages
    if (Notification.permission === 'granted') {
      const notificationTitle = payload.notification?.title || 'New Notification';
      const notificationOptions = {
        body: payload.notification?.body || 'You have a new notification',
        icon: payload.notification?.icon || '/images/logo/logo-icon.svg',
        badge: '/images/logo/logo-icon.svg',
        tag: payload.data?.taskId || 'notification',
        data: payload.data,
        requireInteraction: false,
      };

      // Create browser notification
      const notification = new Notification(notificationTitle, notificationOptions);
      
      notification.onclick = () => {
        window.focus();
        if (payload.data?.url) {
          window.location.href = payload.data.url;
        }
        notification.close();
      };
    }
    
    // Also call the callback for additional handling (like toast)
    callback(payload);
  });
}

/**
 * Save FCM token to Firestore for the user
 */
export async function saveFCMToken(userId: string, token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/fcm-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const response = await fetch('/api/notifications/fcm-token', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
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
