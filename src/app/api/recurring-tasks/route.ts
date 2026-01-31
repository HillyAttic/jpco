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
  requiresArn: z.boolean().optional(),
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
      return ErrorResponses.unauthorized();
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Decode JWT token to get user ID (without verification for now)
    // In production, you should verify the token properly
    let userId: string;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.user_id || payload.sub;
      
      if (!userId) {
        return ErrorResponses.unauthorized();
      }
    } catch (error) {
      return ErrorResponses.unauthorized();
    }

    // Get user profile to check role
    const { roleManagementService } = await import('@/services/role-management.service');
    const userProfile = await roleManagementService.getUserProfile(userId);
    if (!userProfile) {
      return ErrorResponses.unauthorized();
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
    
    // Check if this is a calendar view request (show all tasks to all users)
    const isCalendarView = searchParams.get('view') === 'calendar';

    // Fetch all tasks
    let tasks = await recurringTaskService.getAll(filters);
    
    console.log(`[Recurring Tasks API] Total tasks fetched: ${tasks.length}`);
    console.log(`[Recurring Tasks API] User Firebase Auth UID: ${userId}`);
    console.log(`[Recurring Tasks API] User role: ${userProfile.role}`);
    console.log(`[Recurring Tasks API] Is Admin/Manager: ${isAdminOrManager}`);
    console.log(`[Recurring Tasks API] Is Calendar View: ${isCalendarView}`);
    
    // Filter tasks based on user role
    // CALENDAR VIEW: Show all tasks to all users (no filtering)
    // LIST VIEW: Filter based on role and assignments
    if (!isAdminOrManager && !isCalendarView) {
      // CRITICAL FIX: Team members are stored with OLD employee IDs, not Firebase Auth UIDs
      // We need to find ALL possible IDs that could represent this user
      
      const { teamService } = await import('@/services/team.service');
      const { collection: firestoreCollection, query: firestoreQuery, where: firestoreWhere, getDocs: firestoreGetDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      // Collect all possible user IDs
      const userIds = new Set<string>([userId]); // Start with Auth UID
      
      console.log(`[Recurring Tasks API] User email: ${userProfile.email}`);
      
      // Find all user/employee documents that might represent this user
      // Check by email match in users collection
      try {
        const usersRef = firestoreCollection(db, 'users');
        const emailQuery = firestoreQuery(usersRef, firestoreWhere('email', '==', userProfile.email));
        const emailSnapshot = await firestoreGetDocs(emailQuery);
        
        emailSnapshot.forEach(doc => {
          userIds.add(doc.id);
          console.log(`[Recurring Tasks API] Found user document by email: ${doc.id}`);
        });
      } catch (error) {
        console.error(`[Recurring Tasks API] Error finding user by email:`, error);
      }
      
      // Also check old employees collection if it exists
      try {
        const employeesRef = firestoreCollection(db, 'employees');
        const empEmailQuery = firestoreQuery(employeesRef, firestoreWhere('email', '==', userProfile.email));
        const empSnapshot = await firestoreGetDocs(empEmailQuery);
        
        empSnapshot.forEach(doc => {
          userIds.add(doc.id);
          console.log(`[Recurring Tasks API] Found employee document by email: ${doc.id}`);
        });
      } catch (error) {
        // employees collection might not exist, that's okay
        console.log(`[Recurring Tasks API] No employees collection found (this is normal)`);
      }
      
      console.log(`[Recurring Tasks API] All possible user IDs:`, Array.from(userIds));
      
      // Get teams for ALL possible user IDs
      let userTeams: any[] = [];
      for (const id of userIds) {
        const teams = await teamService.getTeamsByMember(id);
        teams.forEach(team => {
          if (!userTeams.some(t => t.id === team.id)) {
            userTeams.push(team);
          }
        });
      }
      
      const userTeamIds = userTeams.map(team => team.id);
      
      console.log(`[Recurring Tasks API] User teams:`, userTeams.map(t => ({ id: t.id, name: t.name })));
      console.log(`[Recurring Tasks API] User team IDs:`, userTeamIds);
      
      // Employees see tasks that are:
      // 1. Directly assigned to them (in contactIds), OR
      // 2. Assigned to a team they are a member of
      tasks = tasks.filter(task => {
        // Check if task is directly assigned to user (check all possible user IDs)
        const isDirectlyAssigned = task.contactIds && 
          Array.isArray(task.contactIds) && 
          Array.from(userIds).some(id => task.contactIds.includes(id));
        
        // Check if task is assigned to a team the user is a member of
        const isTeamAssigned = task.teamId && userTeamIds.includes(task.teamId);
        
        console.log(`[Recurring Tasks API] Task "${task.title}":`, {
          taskId: task.id,
          teamId: task.teamId,
          contactIdsCount: task.contactIds?.length || 0,
          isDirectlyAssigned,
          isTeamAssigned,
          willShow: isDirectlyAssigned || isTeamAssigned
        });
        
        return isDirectlyAssigned || isTeamAssigned;
      });
      
      console.log(`[Recurring Tasks API] Employee ${userId} filtered recurring tasks: ${tasks.length}`);
    } else if (isCalendarView) {
      console.log(`[Recurring Tasks API] Calendar view - showing all ${tasks.length} recurring tasks to user ${userId}`);
    } else {
      console.log(`[Recurring Tasks API] Admin/Manager ${userId} viewing all recurring tasks: ${tasks.length}`);
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
