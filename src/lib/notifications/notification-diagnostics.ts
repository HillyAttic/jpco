/**
 * Notification Diagnostics
 * Helps identify why push notifications aren't working
 */

export interface NotificationDiagnostics {
  supported: boolean;
  permission: NotificationPermission;
  serviceWorkerRegistered: boolean;
  serviceWorkerActive: boolean;
  vapidKeyConfigured: boolean;
  fcmTokenExists: boolean;
  issues: string[];
  recommendations: string[];
}

export async function diagnoseNotifications(userId?: string): Promise<NotificationDiagnostics> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check browser support
  const supported = 
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  if (!supported) {
    issues.push('Browser does not support push notifications');
    recommendations.push('Use a modern browser like Chrome, Firefox, or Edge');
  }

  // Check notification permission
  const permission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
  if (permission === 'denied') {
    issues.push('Notification permission denied');
    recommendations.push('Enable notifications in browser settings');
  } else if (permission === 'default') {
    issues.push('Notification permission not requested');
    recommendations.push('Click "Enable Notifications" when prompted');
  }

  // Check service worker
  let serviceWorkerRegistered = false;
  let serviceWorkerActive = false;
  
  if (supported) {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      serviceWorkerRegistered = !!registration;
      serviceWorkerActive = !!registration?.active;

      if (!serviceWorkerRegistered) {
        issues.push('Service worker not registered');
        recommendations.push('Refresh the page to register service worker');
      } else if (!serviceWorkerActive) {
        issues.push('Service worker not active');
        recommendations.push('Wait a few seconds and refresh the page');
      }
    } catch (error) {
      issues.push('Failed to check service worker status');
      recommendations.push('Check browser console for errors');
    }
  }

  // Check VAPID key
  const vapidKeyConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKeyConfigured) {
    issues.push('VAPID key not configured');
    recommendations.push('Contact administrator to configure Firebase Cloud Messaging');
  }

  // Check FCM token (if userId provided)
  let fcmTokenExists = false;
  if (userId) {
    try {
      const response = await fetch(`/api/notifications/check-token?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        fcmTokenExists = data.hasToken;
        
        if (!fcmTokenExists) {
          issues.push('FCM token not registered');
          recommendations.push('Click "Enable Notifications" to register for push notifications');
        }
      }
    } catch (error) {
      issues.push('Failed to check FCM token status');
      recommendations.push('Check network connection and try again');
    }
  }

  return {
    supported,
    permission,
    serviceWorkerRegistered,
    serviceWorkerActive,
    vapidKeyConfigured,
    fcmTokenExists,
    issues,
    recommendations,
  };
}

export function getNotificationStatusMessage(diagnostics: NotificationDiagnostics): string {
  if (diagnostics.issues.length === 0) {
    return 'Push notifications are configured correctly';
  }

  return `Push notifications not working: ${diagnostics.issues.join(', ')}`;
}
