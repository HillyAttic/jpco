import { NextRequest, NextResponse } from 'next/server';
import { nonRecurringTaskAdminService } from '@/services/nonrecurring-task-admin.service';
import { NonRecurringTask } from '@/services/nonrecurring-task.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { sendNotification } from '@/lib/notifications/send-notification';

// Attachment schema
const attachmentSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  type: z.string(),
  size: z.number(),
  storagePath: z.string(),
});

// Validation schema for task update
const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  description: z.string().max(1000).optional(),
  dueDate: z.union([
    z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    }),
    z.object({
      seconds: z.number(),
      nanoseconds: z.number(),
    }).transform((ts) => new Date(ts.seconds * 1000).toISOString()),
  ]).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['todo', 'pending', 'in-progress', 'completed']).optional(),
  assignedTo: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  contactId: z.string().optional().nullable(),
  attachments: z.array(attachmentSchema).optional(),
});

/**
 * GET /api/tasks/[id]
 * Get a specific task by ID
 * Uses Admin SDK to bypass Firestore security rules
 * Validates Requirements: 2.3
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { id } = await params;
    const task = await nonRecurringTaskAdminService.getById(id);

    if (!task) {
      return ErrorResponses.notFound('Task');
    }

    // Check role-based permissions: admin/manager can access any task,
    // employees can only access tasks assigned to them
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      if (!task.assignedTo?.includes(authResult.user.uid)) {
        return ErrorResponses.forbidden('You do not have access to this task');
      }
    }

    console.log('[API /api/tasks/[id]] Task found:', id);
    return NextResponse.json(task, { status: 200 });
  } catch (error) {
    console.error('[API /api/tasks/[id]] Error:', error);
    return handleApiError(error);
  }
}

/**
 * PUT /api/tasks/[id]
 * Update a specific task
 * Allows any authenticated user who is assigned to the task to update it
 * Admins and managers can update any task
 * Validates Requirements: 2.3
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = updateTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const taskData = validationResult.data;

    // Convert dueDate string to Date object if present and filter out undefined values
    const taskToUpdate: Partial<NonRecurringTask> = {};

    if (taskData.title !== undefined) taskToUpdate.title = taskData.title;
    if (taskData.description !== undefined) taskToUpdate.description = taskData.description;
    if (taskData.dueDate !== undefined) taskToUpdate.dueDate = new Date(taskData.dueDate);
    if (taskData.priority !== undefined) taskToUpdate.priority = taskData.priority;
    if (taskData.status !== undefined) taskToUpdate.status = taskData.status;
    if (taskData.assignedTo !== undefined) taskToUpdate.assignedTo = taskData.assignedTo;
    if (taskData.categoryId !== undefined) taskToUpdate.categoryId = taskData.categoryId;
    if (taskData.contactId !== undefined) taskToUpdate.contactId = taskData.contactId ?? undefined;
    if (taskData.attachments !== undefined) taskToUpdate.attachments = taskData.attachments;

    // Check if user is assigned to the task or has admin/manager role
    const userRole = authResult.user.claims.role;
    const isAuthorized = userRole === 'admin' || userRole === 'manager';

    // Fetch current task before update (needed for permission check and notifications)
    const currentTask = await nonRecurringTaskAdminService.getById(id);

    if (!currentTask) {
      return ErrorResponses.notFound('Task');
    }

    if (!isAuthorized) {
      if (!currentTask.assignedTo?.includes(authResult.user.uid)) {
        return ErrorResponses.forbidden('You must be assigned to this task to update it');
      }
    }

    console.log('[API /api/tasks/[id]] PUT request received');

    const updatedTask = await nonRecurringTaskAdminService.update(id, taskToUpdate);

    if (!updatedTask) {
      return ErrorResponses.notFound('Task');
    }

    console.log('[API /api/tasks/[id]] Task updated:', id);

    // Send notifications (fire-and-forget, don't fail the update)
    try {
      const notificationPromises: Promise<unknown>[] = [];

      // 1. Notify task creator when status changes
      if (taskData.status && currentTask.status !== taskData.status && currentTask.createdBy && currentTask.createdBy !== authResult.user.uid) {
        const statusLabel =
          taskData.status === 'in-progress' ? 'In Progress' :
          taskData.status === 'completed' ? 'Completed' :
          taskData.status === 'todo' ? 'To Do' : taskData.status;

        notificationPromises.push(
          sendNotification({
            userIds: [currentTask.createdBy],
            title: 'Task Status Updated',
            body: `"${currentTask.title}" has been marked as ${statusLabel}`,
            data: {
              taskId: id,
              url: '/tasks',
              type: 'task_updated',
            },
          })
        );
      }

      // 2. Notify newly assigned users
      if (taskData.assignedTo && taskData.assignedTo.length > 0) {
        const newlyAssigned = taskData.assignedTo.filter(
          userId => !currentTask.assignedTo?.includes(userId)
        );

        if (newlyAssigned.length > 0) {
          console.log(`[Task Update API] Sending notifications to ${newlyAssigned.length} newly assigned user(s):`, newlyAssigned);

          notificationPromises.push(
            sendNotification({
              userIds: newlyAssigned,
              title: 'New Task Assigned',
              body: `You have been assigned to task: ${updatedTask.title || currentTask.title}`,
              data: {
                taskId: id,
                url: '/tasks',
                type: 'task_assigned',
              },
            })
          );
        }
      }

      // 3. Notify task creator on any other update (title, description, etc.) by non-creator
      if (notificationPromises.length === 0 && currentTask.createdBy && currentTask.createdBy !== authResult.user.uid) {
        notificationPromises.push(
          sendNotification({
            userIds: [currentTask.createdBy],
            title: 'Task Updated',
            body: `"${currentTask.title}" has been updated`,
            data: {
              taskId: id,
              url: '/tasks',
              type: 'task_updated',
            },
          })
        );
      }

      if (notificationPromises.length > 0) {
        const results = await Promise.allSettled(notificationPromises);
        results.forEach((result, i) => {
          if (result.status === 'rejected') {
            console.error(`[Task Update API] ❌ Notification ${i} failed:`, result.reason);
          } else {
            console.log(`[Task Update API] ✅ Notification ${i} sent`);
          }
        });
      }
    } catch (error) {
      console.error('[Task Update API] ❌ Error sending notifications:', error);
      // Don't fail the task update if notification fails
    }

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error) {
    console.error('[API /api/tasks/[id]] Error:', error);
    return handleApiError(error);
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete a specific task
 * Uses Admin SDK to bypass Firestore security rules
 * Validates Requirements: 2.3
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can access this resource');
    }

    console.log('[API /api/tasks/[id]] DELETE request received');

    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;

    await nonRecurringTaskAdminService.delete(id);

    console.log('[API /api/tasks/[id]] Task deleted:', id);

    return NextResponse.json(
      { message: 'Task deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/tasks/[id]] Error:', error);
    return handleApiError(error);
  }
}