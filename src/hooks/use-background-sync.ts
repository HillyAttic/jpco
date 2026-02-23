"use client";

import { useEffect, useCallback } from 'react';

export function useBackgroundSync() {
  const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype;

  // Register a background sync
  const registerSync = useCallback(async (tag: string = 'sync-offline-requests') => {
    if (!isSupported) {
      console.log('[Background Sync] Not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      console.log('[Background Sync] Registered:', tag);
      return true;
    } catch (error) {
      console.error('[Background Sync] Registration failed:', error);
      return false;
    }
  }, [isSupported]);

  // Register periodic background sync (requires permission)
  const registerPeriodicSync = useCallback(async (
    tag: string,
    minInterval: number = 24 * 60 * 60 * 1000 // 24 hours default
  ) => {
    if (!isSupported || !('periodicSync' in ServiceWorkerRegistration.prototype)) {
      console.log('[Periodic Sync] Not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync' as PermissionName,
      });

      if (status.state === 'granted') {
        await (registration as any).periodicSync.register(tag, {
          minInterval,
        });
        console.log('[Periodic Sync] Registered:', tag);
        return true;
      } else {
        console.log('[Periodic Sync] Permission not granted');
        return false;
      }
    } catch (error) {
      console.error('[Periodic Sync] Registration failed:', error);
      return false;
    }
  }, [isSupported]);

  // Get registered periodic syncs
  const getPeriodicSyncs = useCallback(async () => {
    if (!isSupported || !('periodicSync' in ServiceWorkerRegistration.prototype)) {
      return [];
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const tags = await (registration as any).periodicSync.getTags();
      return tags;
    } catch (error) {
      console.error('[Periodic Sync] Failed to get tags:', error);
      return [];
    }
  }, [isSupported]);

  // Unregister a periodic sync
  const unregisterPeriodicSync = useCallback(async (tag: string) => {
    if (!isSupported || !('periodicSync' in ServiceWorkerRegistration.prototype)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).periodicSync.unregister(tag);
      console.log('[Periodic Sync] Unregistered:', tag);
      return true;
    } catch (error) {
      console.error('[Periodic Sync] Unregister failed:', error);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    registerSync,
    registerPeriodicSync,
    getPeriodicSyncs,
    unregisterPeriodicSync,
  };
}
