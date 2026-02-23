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
      // Use the new test notification endpoint
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Sent in ${result.deliveryTime}! Check your device (even if locked/closed).` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message || 'Failed to send test notification' 
        });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      setMessage({ type: 'error', text: 'Error sending notification' });
    } finally {
      setIsSending(false);
      
      // Clear message after 5 seconds (longer to read the message)
      setTimeout(() => setMessage(null), 5000);
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
