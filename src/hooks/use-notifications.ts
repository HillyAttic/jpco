import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthEnhanced } from './use-auth-enhanced';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  message?: string;
  read: boolean;
  createdAt: string;
  type?: string;
  actionUrl?: string;
  data?: {
    taskId?: string;
    url?: string;
    type?: string;
  };
}

/**
 * useNotifications — fetches notifications via API route (Admin SDK)
 * instead of client-side Firestore onSnapshot (which is subject to security rules).
 *
 * Uses polling (every 30s) + manual refetch on FCM foreground messages.
 */
export function useNotifications() {
  const { user } = useAuthEnhanced();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  // Fetch notifications via API route (Admin SDK, bypasses security rules)
  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (!user?.uid) return;

    if (showLoading) setLoading(true);

    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(
        `/api/notifications?userId=${encodeURIComponent(user.uid)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const fetched: AppNotification[] = (data.notifications || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        body: n.body || n.message || '',
        message: n.body || n.message || '',
        read: n.read,
        createdAt: n.createdAt,
        type: n.type,
        actionUrl: n.actionUrl || n.data?.url,
        data: {
          taskId: n.data?.taskId,
          url: n.actionUrl || n.data?.url,
          type: n.type || n.data?.type,
        },
      }));

      if (isMounted.current) {
        setNotifications(fetched);
        setUnreadCount(fetched.filter(n => !n.read).length);
        setLoading(false);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      if (isMounted.current) {
        setError('Failed to load notifications');
        setLoading(false);
      }
    }
  }, [user?.uid]);

  // Initial fetch + polling
  useEffect(() => {
    isMounted.current = true;

    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchNotifications(true);

    // Poll every 30 seconds
    pollInterval.current = setInterval(() => {
      fetchNotifications(false);
    }, 30000);

    return () => {
      isMounted.current = false;
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    };
  }, [user?.uid, fetchNotifications]);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionGranted(permission === 'granted');
      return permission;
    }
    return 'denied' as NotificationPermission;
  }, []);

  // Mark notification as read via API (Admin SDK)
  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAsRead',
          notificationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as read');
      }
    } catch (error) {
      // Revert on error
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: false } : n)
      );
      setUnreadCount(prev => prev + 1);
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read via API (Admin SDK)
  const markAllAsRead = useCallback(async () => {
    if (!user?.uid) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAllAsRead',
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      // Refetch to get correct state
      fetchNotifications(false);
    }
  }, [user?.uid, fetchNotifications]);

  // Delete notification via API (Admin SDK)
  const deleteNotification = useCallback(async (notificationId: string) => {
    const deletedNotification = notifications.find(n => n.id === notificationId);

    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (deletedNotification && !deletedNotification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          notificationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }
    } catch (error) {
      // Revert on error
      if (deletedNotification) {
        setNotifications(prev =>
          [...prev, deletedNotification].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
        if (!deletedNotification.read) {
          setUnreadCount(prev => prev + 1);
        }
      }
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  // Delete all notifications via API
  const deleteAllNotifications = useCallback(async () => {
    if (!user?.uid) return;

    setNotifications([]);
    setUnreadCount(0);

    try {
      // Fetch all notification IDs, then delete one by one
      // (the API route doesn't have a deleteAll action, so we refetch after)
      const { authenticatedFetch } = await import('@/lib/api-client');

      // Delete each notification
      const deletePromises = notifications.map(n =>
        authenticatedFetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            notificationId: n.id,
          }),
        })
      );

      await Promise.allSettled(deletePromises);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      fetchNotifications(false);
    }
  }, [user?.uid, notifications, fetchNotifications]);

  // Refetch — triggers immediate API call
  const refetch = useCallback(() => {
    fetchNotifications(false);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    permissionGranted,
    requestPermission,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refetch,
  };
}
