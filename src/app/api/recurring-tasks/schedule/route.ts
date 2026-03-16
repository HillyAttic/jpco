import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { z } from 'zod';

const scheduleEntrySchema = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  scheduleDate: z.string().min(1), // YYYY-MM-DD
  startTime: z.string().min(1), // HH:mm
  endTime: z.string().min(1), // HH:mm
});

const scheduleSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  taskTitle: z.string().min(1, 'Task title is required'),
  scheduledBy: z.string().min(1, 'Scheduled by user ID is required'),
  entries: z.array(scheduleEntrySchema).min(1, 'At least one schedule entry is required'),
});

/**
 * POST /api/recurring-tasks/schedule
 * Manager schedules roster entries for multiple employees.
 * Creates roster entries (single-task type) for each schedule entry.
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;

    // Only managers and admins can schedule tasks
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can schedule tasks');
    }

    const body = await request.json();
    const validationResult = scheduleSchema.safeParse(body);

    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { taskId, taskTitle, scheduledBy, entries } = validationResult.data;

    const { adminDb } = await import('@/lib/firebase-admin');

    // Verify the task exists
    const taskDoc = await adminDb.collection('recurring-tasks').doc(taskId).get();
    if (!taskDoc.exists) {
      return ErrorResponses.badRequest('Task not found');
    }

    // Create roster entries in batch
    const batch = adminDb.batch();
    const rostersRef = adminDb.collection('rosters');
    let createdCount = 0;

    for (const entry of entries) {
      const scheduleDate = new Date(entry.scheduleDate);
      const [startHour, startMinute] = entry.startTime.split(':').map(Number);
      const [endHour, endMinute] = entry.endTime.split(':').map(Number);

      const timeStart = new Date(scheduleDate);
      timeStart.setHours(startHour, startMinute, 0, 0);

      const timeEnd = new Date(scheduleDate);
      timeEnd.setHours(endHour, endMinute, 0, 0);

      const durationHours = (timeEnd.getTime() - timeStart.getTime()) / (1000 * 60 * 60);

      const rosterEntry = {
        taskType: 'single',
        userId: entry.userId,
        userName: entry.userName,
        clientId: entry.clientId,
        clientName: entry.clientName,
        taskDetail: taskTitle,
        timeStart,
        timeEnd,
        taskDate: entry.scheduleDate,
        durationHours,
        createdBy: scheduledBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = rostersRef.doc();
      batch.set(docRef, rosterEntry);
      createdCount++;

      // Firestore batch limit is 500
      if (createdCount % 499 === 0) {
        await batch.commit();
      }
    }

    // Commit remaining entries
    if (createdCount % 499 !== 0) {
      await batch.commit();
    }

    // Send notifications to all scheduled employees
    try {
      const { sendNotification } = await import('@/lib/notifications/send-notification');
      const uniqueUserIds = [...new Set(entries.map(e => e.userId))];

      if (uniqueUserIds.length > 0) {
        await sendNotification({
          userIds: uniqueUserIds,
          title: 'New Schedule Added',
          body: `Your roster has been updated with new visits for "${taskTitle}"`,
          data: {
            url: '/roster/update-schedule',
            type: 'roster_schedule',
            taskId,
          },
        });
      }
    } catch (notifError) {
      console.error('[Schedule API] Failed to send notifications:', notifError);
    }

    return NextResponse.json(
      {
        message: 'Schedule created successfully',
        created: createdCount,
        employees: [...new Set(entries.map(e => e.userName))],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Schedule API] Error:', error);
    return handleApiError(error);
  }
}
