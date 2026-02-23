/**
 * Push Notification Service
 * Sends push notifications directly to users via FCM
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    type?: string;
    taskId?: string;
    [key: string]: any;
  };
}

class PushNotificationService {
  /**
   * Get user's FCM token from Firestore
   */
  private async getUserFCMToken(userId: string): Promise<string | null> {
    try {
      const tokenDoc = await getDoc(doc(db, 'fcmTokens', userId));
      if (tokenDoc.exists()) {
        return tokenDoc.data().token || null;
      }
      return null;
    } catch (error) {
      console.error('[Push] Error getting FCM token for user:', userId, error);
      return null;
    }
  }

  /**
   * Send push notification to a single user
   */
  async sendToUser(userId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      const token = await this.getUserFCMToken(userId);
      
      if (!token) {
        console.warn('[Push] No FCM token found for user:', userId);
        return false;
      }

      // Send notification via API route
      const response = await fetch('/api/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/images/logo/logo-icon.svg',
            badge: payload.badge || '/images/logo/logo-icon.svg',
          },
          data: payload.data || {},
        }),
      });

      if (!response.ok) {
        console.error('[Push] Failed to send notification:', await response.text());
        return false;
      }

      console.log('[Push] Notification sent successfully to user:', userId);
      return true;
    } catch (error) {
      console.error('[Push] Error sending notification:', error);
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds: string[], payload: NotificationPayload): Promise<number> {
    let successCount = 0;

    for (const userId of userIds) {
      const success = await this.sendToUser(userId, payload);
      if (success) successCount++;
    }

    console.log(`[Push] Sent notifications to ${successCount}/${userIds.length} users`);
    return successCount;
  }

  /**
   * Send task assignment notification
   */
  async notifyTaskAssignment(
    userId: string,
    taskTitle: string,
    taskId: string,
    isRecurring: boolean = false
  ): Promise<boolean> {
    return this.sendToUser(userId, {
      title: 'New Task Assigned',
      body: `You have been assigned: ${taskTitle}`,
      data: {
        url: isRecurring ? `/tasks/recurring/${taskId}` : `/tasks/${taskId}`,
        type: 'task_assignment',
        taskId,
      },
    });
  }

  /**
   * Send task assignment notifications to multiple users
   */
  async notifyTaskAssignments(
    userIds: string[],
    taskTitle: string,
    taskId: string,
    isRecurring: boolean = false
  ): Promise<number> {
    return this.sendToUsers(userIds, {
      title: 'New Task Assigned',
      body: `You have been assigned: ${taskTitle}`,
      data: {
        url: isRecurring ? `/tasks/recurring/${taskId}` : `/tasks/${taskId}`,
        type: 'task_assignment',
        taskId,
      },
    });
  }

  /**
   * Send leave approval notification
   */
  async notifyLeaveApproval(
    userId: string,
    leaveType: string,
    startDate: Date,
    endDate: Date,
    approved: boolean,
    rejectionReason?: string
  ): Promise<boolean> {
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
    };

    const title = approved ? 'Leave Request Approved' : 'Leave Request Rejected';
    const body = approved
      ? `Your ${leaveType} from ${formatDate(startDate)} to ${formatDate(endDate)} has been approved.`
      : `Your ${leaveType} from ${formatDate(startDate)} to ${formatDate(endDate)} has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`;

    return this.sendToUser(userId, {
      title,
      body,
      data: {
        url: '/attendance/leave',
        type: approved ? 'leave_approved' : 'leave_rejected',
      },
    });
  }

  /**
   * Send task completion reminder
   */
  async notifyTaskDue(
    userId: string,
    taskTitle: string,
    taskId: string,
    dueDate: Date,
    isRecurring: boolean = false
  ): Promise<boolean> {
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    };

    return this.sendToUser(userId, {
      title: 'Task Due Soon',
      body: `"${taskTitle}" is due on ${formatDate(dueDate)}`,
      data: {
        url: isRecurring ? `/tasks/recurring/${taskId}` : `/tasks/${taskId}`,
        type: 'task_reminder',
        taskId,
      },
    });
  }

  /**
   * Send attendance reminder
   */
  async notifyAttendanceReminder(userId: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: 'Attendance Reminder',
      body: "Don't forget to clock in for today",
      data: {
        url: '/attendance',
        type: 'attendance_reminder',
      },
    });
  }

  /**
   * Send team update notification
   */
  async notifyTeamUpdate(
    userIds: string[],
    teamName: string,
    message: string,
    teamId?: string
  ): Promise<number> {
    return this.sendToUsers(userIds, {
      title: `Team Update: ${teamName}`,
      body: message,
      data: {
        url: teamId ? `/teams/${teamId}` : '/teams',
        type: 'team_update',
        teamId,
      },
    });
  }
}

export const pushNotificationService = new PushNotificationService();
