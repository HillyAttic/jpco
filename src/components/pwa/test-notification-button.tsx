"use client";

import { useState } from 'react';
import { TouchOptimizedButton } from '@/components/ui/touch-optimized-input';
import { useResponsive } from '@/hooks/use-responsive';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';

export function TestNotificationButton() {
  const { isTouchDevice } = useResponsive();
  const { isEnabled } = usePushNotifications();
  const { user } = useEnhancedAuth();
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sendTestNotification = async () => {
    if (!user?.uid) {
      setMessage({ type: 'error', text: 'User not authenticated' });
      return;
    }

    setIsSending(true);
    setMessage(null);

    try {
      // Create a test notification using the notification service
      const response = await fetch('/api/fcm/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          title: 'Test Notification',
          body: 'This is a test notification from JPCO Dashboard',
          data: {
            url: '/notifications',
            type: 'test',
          },
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Test notification sent!' });
        
        // Also show a browser notification immediately
        if (Notification.permission === 'granted') {
          new Notification('Test Notification', {
            body: 'This is a test notification from JPCO Dashboard',
            icon: '/images/logo/logo-icon.svg',
            badge: '/images/logo/logo-icon.svg',
            tag: 'test-' + Date.now(),
          });
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to send test notification' });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      setMessage({ type: 'error', text: 'Error sending notification' });
    } finally {
      setIsSending(false);
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="space-y-2">
      <TouchOptimizedButton
        variant="ghost"
        size="sm"
        touchTargetSize={isTouchDevice ? 'md' : 'sm'}
        onClick={sendTestNotification}
        disabled={isSending}
        className="w-full"
      >
        {isSending ? 'Sending...' : 'Send Test Notification'}
      </TouchOptimizedButton>
      
      {message && (
        <div className={`p-2 rounded text-xs ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
