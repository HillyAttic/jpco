import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'task' | 'attendance' | 'team' | 'employee' | 'system';
  read: boolean;
  actionUrl?: string;
  metadata?: {
    taskId?: string;
    employeeId?: string;
    teamId?: string;
    [key: string]: any;
  };
  createdAt: Date;
  readAt?: Date;
}

class NotificationService {
  private collectionName = 'notifications';

  /**
   * Get notifications for a specific user
   */
  async getUserNotifications(
    userId: string,
    limitCount: number = 20,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (unreadOnly) {
        q = query(
          collection(db, this.collectionName),
          where('userId', '==', userId),
          where('read', '==', false),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        readAt: doc.data().readAt?.toDate(),
      })) as Notification[];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
  ): () => void {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        readAt: doc.data().readAt?.toDate(),
      })) as Notification[];

      callback(notifications);
    });

    return unsubscribe;
  }

  /**
   * Create a new notification
   */
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...notification,
        createdAt: serverTimestamp(),
      });

      // Send push notification if user has enabled it
      await this.sendPushNotification(notification);

      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.collectionName, notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(doc =>
        updateDoc(doc.ref, {
          read: true,
          readAt: serverTimestamp(),
        })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<void> {
    try {
      // Check if push notifications are supported
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        return;
      }

      // Check if user has granted permission
      if (Notification.permission !== 'granted') {
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Show notification
      await registration.showNotification(notification.title, {
        body: notification.message,
        icon: '/images/logo/logo-icon.svg',
        badge: '/images/logo/logo-icon.svg',
        tag: notification.type,
        data: {
          url: notification.actionUrl || '/',
          notificationId: notification.id,
        },
        actions: notification.actionUrl ? [
          {
            action: 'open',
            title: 'View',
          },
          {
            action: 'close',
            title: 'Dismiss',
          },
        ] : [],
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  /**
   * Request push notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Helper: Create task notification
   */
  async notifyTaskAssigned(userId: string, taskTitle: string, taskId: string): Promise<void> {
    await this.createNotification({
      userId,
      title: 'New Task Assigned',
      message: `You have been assigned to: ${taskTitle}`,
      type: 'task',
      read: false,
      actionUrl: `/tasks/${taskId}`,
      metadata: { taskId },
    });
  }

  /**
   * Helper: Create attendance notification
   */
  async notifyAttendanceReminder(userId: string): Promise<void> {
    await this.createNotification({
      userId,
      title: 'Attendance Reminder',
      message: 'Don\'t forget to clock in for today',
      type: 'attendance',
      read: false,
      actionUrl: '/attendance',
    });
  }

  /**
   * Helper: Create team notification
   */
  async notifyTeamUpdate(userId: string, teamName: string, message: string, teamId: string): Promise<void> {
    await this.createNotification({
      userId,
      title: `Team Update: ${teamName}`,
      message,
      type: 'team',
      read: false,
      actionUrl: `/teams`,
      metadata: { teamId },
    });
  }
}

export const notificationService = new NotificationService();
