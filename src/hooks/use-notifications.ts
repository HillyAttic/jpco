import { useState, useEffect, useCallback } from 'react';
import { notificationService, Notification } from '@/services/notification.service';
import { useAuthEnhanced } from './use-auth-enhanced';

export function useNotifications() {
  const { user } = useAuthEnhanced();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to notifications
    const unsubscribe = notificationService.subscribeToNotifications(
      user.uid,
      (newNotifications) => {
        setNotifications(newNotifications);
        setUnreadCount(newNotifications.filter(n => !n.read).length);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    const permission = await notificationService.requestPermission();
    setPermissionGranted(permission === 'granted');
    return permission;
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.uid) return;

    try {
      await notificationService.markAllAsRead(user.uid);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user?.uid]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Delete all notifications
  const deleteAllNotifications = useCallback(async () => {
    if (!user?.uid) return;

    try {
      await notificationService.deleteAllNotifications(user.uid);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
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
  };
}
