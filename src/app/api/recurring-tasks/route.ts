import { NextRequest, NextResponse } from 'next/server';
import { recurringTaskService } from '@/services/recurring-task.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for recurring task creation
const createRecurringTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  recurrencePattern: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly']),
  startDate: z.union([
    z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid start date format',
    }),
    z.date()
  ]),
  endDate: z.union([
    z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid end date format',
    }),
    z.date()
  ]).optional(),
  nextOccurrence: z.union([
    z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid next occurrence date format',
    }),
    z.date()
  ]).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['pending', 'in-progress', 'completed']).default('pending'),
  contactIds: z.array(z.string()).default([]),
  categoryId: z.string().optional(),
  teamId: z.string().optional(),
}).refine(
  (data) => {
    if (!data.endDate) return true;
    const endDate = data.endDate instanceof Date ? data.endDate : new Date(data.endDate);
    const startDate = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
    return endDate > startDate;
  },
  { message: 'End date must be after start date', path: ['endDate'] }
);

/**
 * GET /api/recurring-tasks
 * Fetch all recurring tasks with optional filters
 * Validates Requirements: 3.1, 3.4
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
      isPaused: searchParams.get('isPaused') === 'true' ? true : searchParams.get('isPaused') === 'false' ? false : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    const tasks = await recurringTaskService.getAll(filters);
    
    return NextResponse.json(tasks, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/recurring-tasks
 * Create a new recurring task
 * Validates Requirements: 3.2, 3.4
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
    const validationResult = createRecurringTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const taskData = validationResult.data;

    // Convert date strings to Date objects
    const taskToCreate = {
      ...taskData,
      description: taskData.description || '',
      startDate: taskData.startDate instanceof Date ? taskData.startDate : new Date(taskData.startDate),
      endDate: taskData.endDate ? (taskData.endDate instanceof Date ? taskData.endDate : new Date(taskData.endDate)) : undefined,
      nextOccurrence: taskData.nextOccurrence 
        ? (taskData.nextOccurrence instanceof Date ? taskData.nextOccurrence : new Date(taskData.nextOccurrence))
        : (taskData.startDate instanceof Date ? taskData.startDate : new Date(taskData.startDate)),
    };
    
    const newTask = await recurringTaskService.create(taskToCreate);
    
    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
