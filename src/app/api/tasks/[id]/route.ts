import { NextRequest, NextResponse } from 'next/server';
import { nonRecurringTaskService, NonRecurringTask } from '@/services/nonrecurring-task.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

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
  category: z.string().optional(),
});

/**
 * GET /api/tasks/[id]
 * Get a specific task by ID
 * Validates Requirements: 2.3
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;
    const task = await nonRecurringTaskService.getById(id);
    
    if (!task) {
      return ErrorResponses.notFound('Task');
    }
    
    return NextResponse.json(task, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/tasks/[id]
 * Update a specific task
 * Validates Requirements: 2.3
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
    if (taskData.category !== undefined) taskToUpdate.category = taskData.category;
    
    const updatedTask = await nonRecurringTaskService.update(id, taskToUpdate);
    
    if (!updatedTask) {
      return ErrorResponses.notFound('Task');
    }
    
    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete a specific task
 * Validates Requirements: 2.3
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;
    
    await nonRecurringTaskService.delete(id);
    
    return NextResponse.json(
      { message: 'Task deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}