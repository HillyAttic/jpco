"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Handles notification clicks from service worker
 * Listens for messages from service worker and navigates to the appropriate URL
 */
export function NotificationClickHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        const url = event.data.url;
        console.log('[NotificationClick] Navigating to:', url);
        
        // Navigate to the URL
        if (url) {
          router.push(url);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [router]);

  return null;
}
