import { useState, useEffect, useCallback } from 'react';
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

export function useNotifications() {
  const { user } = useAuthEnhanced();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Fetch notifications from server API
  const fetchNotifications = useCallback(async () => {
    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/notifications?userId=${encodeURIComponent(user.uid)}`);
      if (!response.ok) {
        console.error('Failed to fetch notifications:', response.statusText);
        setLoading(false);
        return;
      }

      const { notifications: notifs } = await response.json();
      setNotifications(notifs || []);
      setUnreadCount((notifs || []).filter((n: AppNotification) => !n.read).length);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    }
  }, [user?.uid]);

  // Fetch on mount and poll every 15 seconds
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

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

  // Mark notification as read via API
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAsRead', notificationId }),
      });

      // Optimistic update
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read via API
  const markAllAsRead = useCallback(async () => {
    if (!user?.uid) return;

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllAsRead', userId: user.uid }),
      });

      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user?.uid]);

  // Delete notification via API
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', notificationId }),
      });

      // Optimistic update
      setNotifications(prev => {
        const updated = prev.filter(n => n.id !== notificationId);
        setUnreadCount(updated.filter(n => !n.read).length);
        return updated;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Delete all notifications
  const deleteAllNotifications = useCallback(async () => {
    if (!user?.uid) return;
    // Not implemented server-side yet, but included for interface compatibility
    console.warn('deleteAllNotifications not yet implemented server-side');
  }, [user?.uid]);

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
    refetch: fetchNotifications,
  };
}
