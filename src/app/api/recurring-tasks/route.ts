import { NextRequest, NextResponse } from 'next/server';
import { recurringTaskService } from '@/services/recurring-task.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for recurring task creation
const createRecurringTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  recurrencePattern: z.enum(['monthly', 'quarterly', 'half-yearly', 'yearly']),
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
 * Role-based access: Admin/Manager see all tasks, Employees see only their assigned tasks
 * Validates Requirements: 3.1, 3.4
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ErrorResponses.unauthorized('No authentication token provided');
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Decode JWT token to get user ID (without verification for now)
    // In production, you should verify the token properly
    let userId: string;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.user_id || payload.sub;
      
      if (!userId) {
        return ErrorResponses.unauthorized('Invalid token payload');
      }
    } catch (error) {
      return ErrorResponses.unauthorized('Invalid token format');
    }

    // Get user profile to check role
    const { roleManagementService } = await import('@/services/role-management.service');
    const userProfile = await roleManagementService.getUserProfile(userId);
    if (!userProfile) {
      return ErrorResponses.unauthorized('User profile not found');
    }

    const isAdminOrManager = userProfile.role === 'admin' || userProfile.role === 'manager';

    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      isPaused: searchParams.get('isPaused') === 'true' ? true : searchParams.get('isPaused') === 'false' ? false : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    // Fetch all tasks
    let tasks = await recurringTaskService.getAll(filters);
    
    // Filter tasks based on user role
    if (!isAdminOrManager) {
      // Employees only see tasks assigned to them
      tasks = tasks.filter(task => {
        // Check if task has contactIds array and if it includes the user's ID
        if (!task.contactIds || !Array.isArray(task.contactIds)) {
          return false;
        }
        return task.contactIds.includes(userId);
      });
      
      console.log(`Employee ${userId} filtered recurring tasks:`, tasks.length);
    } else {
      console.log(`Admin/Manager ${userId} viewing all recurring tasks:`, tasks.length);
    }
    
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
