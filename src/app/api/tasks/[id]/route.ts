import { NextRequest, NextResponse } from 'next/server';
import { nonRecurringTaskAdminService } from '@/services/nonrecurring-task-admin.service';
import { NonRecurringTask } from '@/services/nonrecurring-task.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { sendNotification } from '@/lib/notifications/send-notification';

// Validation schema for task update
const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  description: z.string().max(1000).optional(),
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'in-progress', 'completed']).optional(),
  assignedTo: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  contactId: z.string().optional(),
});

/**
 * GET /api/tasks/[id]
 * Get a specific task by ID
 * Uses Admin SDK to bypass Firestore security rules
 * Validates Requirements: 2.3
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('[API /api/tasks/[id]] GET request received');
    
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;
    const task = await nonRecurringTaskAdminService.getById(id);
    
    if (!task) {
      return ErrorResponses.notFound('Task');
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
 * Uses Admin SDK to bypass Firestore security rules
 * Validates Requirements: 2.3
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('[API /api/tasks/[id]] PUT request received');
    
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

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
    if (taskData.contactId !== undefined) taskToUpdate.contactId = taskData.contactId;
    
    const updatedTask = await nonRecurringTaskAdminService.update(id, taskToUpdate);
    
    if (!updatedTask) {
      return ErrorResponses.notFound('Task');
    }
    
    console.log('[API /api/tasks/[id]] Task updated:', id);
    
    // Send notifications to newly assigned users directly (no fetch needed)
    if (taskData.assignedTo && taskData.assignedTo.length > 0) {
      try {
        // Get the original task to compare assignees
        const originalTask = await nonRecurringTaskAdminService.getById(id);
        
        if (originalTask) {
          // Find newly assigned users
          const newlyAssigned = taskData.assignedTo.filter(
            userId => !originalTask.assignedTo?.includes(userId)
          );
          
          if (newlyAssigned.length > 0) {
            console.log(`[Task Update API] Sending notifications to ${newlyAssigned.length} newly assigned user(s):`, newlyAssigned);
            
            const result = await sendNotification({
              userIds: newlyAssigned,
              title: 'New Task Assigned',
              body: `You have been assigned to task: ${updatedTask.title}`,
              data: {
                taskId: updatedTask.id,
                url: '/tasks',
                type: 'task_assigned',
              },
            });

            console.log('[Task Update API] ✅ Notification result:', {
              totalTime: `${result.totalTime}ms`,
              sent: result.sent.length,
              errors: result.errors.length,
            });
          }
        }
      } catch (error) {
        console.error('[Task Update API] ❌ Error sending task assignment notifications:', error);
        // Don't fail the task update if notification fails
      }
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