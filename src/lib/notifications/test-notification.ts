/**
 * Test notification utility
 * Use this to test push notifications in development
 */

export async function sendTestNotification(userId: string) {
  try {
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds: [userId],
        title: 'Test Notification',
        body: 'This is a test notification to verify push notifications are working correctly.',
        data: {
          url: '/notifications',
          type: 'test',
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send test notification');
    }

    const result = await response.json();
    console.log('[Test] Notification sent:', result);
    return result;
  } catch (error) {
    console.error('[Test] Error sending notification:', error);
    throw error;
  }
}

export async function checkNotificationSetup() {
  const checks = {
    serviceWorkerSupported: 'serviceWorker' in navigator,
    notificationSupported: 'Notification' in window,
    pushManagerSupported: 'PushManager' in window,
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'unknown',
    serviceWorkerRegistered: false,
    serviceWorkerActive: false,
    fcmTokenAvailable: false,
  };

  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    checks.serviceWorkerRegistered = !!registration;
    checks.serviceWorkerActive = !!registration?.active;
  } catch (error) {
    console.error('[Test] Error checking service worker:', error);
  }

  console.log('[Test] Notification setup check:', checks);
  return checks;
}
