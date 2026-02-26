/**
 * Push Notification Service
 * Sends push notifications directly to users via FCM
 */

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
   * Format date for notifications
   */
  private formatDate(date: Date, includeYear: boolean = true): string {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };
    
    if (includeYear) {
      options.year = 'numeric';
    }
    
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }

  /**
   * Send push notification to a single user
   */
  async sendToUser(userId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: [userId],
          title: payload.title,
          body: payload.body,
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
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds,
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
        }),
      });

      if (!response.ok) {
        console.error('[Push] Failed to send notifications:', await response.text());
        return 0;
      }

      const result = await response.json();
      const successCount = result.sent?.length || 0;
      console.log(`[Push] Sent notifications to ${successCount}/${userIds.length} users`);
      return successCount;
    } catch (error) {
      console.error('[Push] Error sending notifications:', error);
      return 0;
    }
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
    const title = approved ? 'Leave Request Approved' : 'Leave Request Rejected';
    const dateRange = `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`;
    const body = approved
      ? `Your ${leaveType} from ${dateRange} has been approved.`
      : `Your ${leaveType} from ${dateRange} has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`;

    return this.sendToUser(userId, {
      title,
      body,
      data: {
        url: '/attendance',
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
    return this.sendToUser(userId, {
      title: 'Task Due Soon',
      body: `"${taskTitle}" is due on ${this.formatDate(dueDate, false)}`,
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

  /**
   * Send leave request notification to admins
   */
  async notifyLeaveRequest(
    adminIds: string[],
    employeeName: string,
    leaveType: string,
    startDate: Date,
    endDate: Date,
    duration: number
  ): Promise<number> {
    const dateRange = `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`;
    const daysText = `${duration} day${duration > 1 ? 's' : ''}`;

    return this.sendToUsers(adminIds, {
      title: 'New Leave Request',
      body: `${employeeName} requested ${leaveType} (${daysText}) from ${dateRange}`,
      data: {
        url: '/admin/leave-approvals',
        type: 'leave_request',
      },
    });
  }
}

export const pushNotificationService = new PushNotificationService();
