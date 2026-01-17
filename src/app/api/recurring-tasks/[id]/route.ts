import { NextRequest, NextResponse } from 'next/server';
import { recurringTaskService } from '@/services/recurring-task.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for recurring task update
const updateRecurringTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  description: z.string().max(1000).optional(),
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }).optional(),
  recurrencePattern: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).optional(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid start date format',
  }).optional(),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid end date format',
  }).optional(),
  nextOccurrence: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid next occurrence date format',
  }).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'in-progress', 'completed']).optional(),
  assignedTo: z.array(z.string()).optional(),
  category: z.string().optional(),
  isPaused: z.boolean().optional(),
});

/**
 * GET /api/recurring-tasks/[id]
 * Fetch a single recurring task by ID
 * Validates Requirements: 3.1
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;
    const task = await recurringTaskService.getById(id);
    
    if (!task) {
      return ErrorResponses.notFound('Recurring task');
    }
    
    return NextResponse.json(task, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/recurring-tasks/[id]
 * Update a recurring task
 * Validates Requirements: 3.2, 3.8
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
    const validationResult = updateRecurringTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const taskData = validationResult.data;
    
    // Convert date strings to Date objects if present
    const taskToUpdate: any = { ...taskData };
    if (taskData.dueDate) {
      taskToUpdate.dueDate = new Date(taskData.dueDate);
    }
    if (taskData.startDate) {
      taskToUpdate.startDate = new Date(taskData.startDate);
    }
    if (taskData.endDate) {
      taskToUpdate.endDate = new Date(taskData.endDate);
    }
    if (taskData.nextOccurrence) {
      taskToUpdate.nextOccurrence = new Date(taskData.nextOccurrence);
    }

    // Validate end date is after start date if both are provided
    if (taskToUpdate.endDate && taskToUpdate.startDate && taskToUpdate.endDate <= taskToUpdate.startDate) {
      return ErrorResponses.badRequest('End date must be after start date', {
        endDate: ['End date must be after start date'],
      });
    }
    
    const updatedTask = await recurringTaskService.update(id, taskToUpdate);
    
    if (!updatedTask) {
      return ErrorResponses.notFound('Recurring task');
    }
    
    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/recurring-tasks/[id]
 * Delete a recurring task with options
 * Validates Requirements: 3.10
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    // Get delete option: 'all' or 'stop' (default: 'all')
    const deleteOption = searchParams.get('option') || 'all';
    
    if (deleteOption === 'stop') {
      // Stop recurrence by setting end date to now
      await recurringTaskService.update(id, {
        endDate: new Date(),
        isPaused: true,
      });
      
      return NextResponse.json(
        { message: 'Recurring task stopped successfully' },
        { status: 200 }
      );
    } else {
      // Delete all future occurrences
      await recurringTaskService.delete(id);
      
      return NextResponse.json(
        { message: 'Recurring task deleted successfully' },
        { status: 200 }
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
