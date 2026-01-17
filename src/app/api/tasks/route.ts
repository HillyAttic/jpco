import { NextRequest, NextResponse } from 'next/server';
import { nonRecurringTaskService } from '@/services/nonrecurring-task.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for task creation
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['pending', 'in-progress', 'completed']).default('pending'),
  assignedTo: z.array(z.string()).default([]),
  category: z.string().optional(),
});

/**
 * GET /api/tasks
 * List all non-recurring tasks with optional filters
 * Validates Requirements: 2.3
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    const tasks = await nonRecurringTaskService.getAll(filters);
    
    return NextResponse.json(tasks, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/tasks
 * Create a new non-recurring task
 * Validates Requirements: 2.3
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const body = await request.json();

    // Validate request body
    const validationResult = createTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const taskData = validationResult.data;

    // Convert dueDate string to Date object
    const taskToCreate = {
      ...taskData,
      description: taskData.description || '',
      dueDate: new Date(taskData.dueDate),
    };
    
    const newTask = await nonRecurringTaskService.create(taskToCreate);
    
    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}