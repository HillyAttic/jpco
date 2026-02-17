import { NextRequest, NextResponse } from 'next/server';
import { recurringTaskAdminService, RecurringTask } from '@/services/recurring-task-admin.service';
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
  dueDate: z.union([
    z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid due date format',
    }),
    z.date()
  ]).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['pending', 'in-progress', 'completed']).default('pending'),
  contactIds: z.array(z.string()).default([]),
  categoryId: z.string().optional(),
  teamId: z.string().optional(),
  teamMemberMappings: z.array(z.object({
    userId: z.string(),
    userName: z.string(),
    clientIds: z.array(z.string()),
  })).optional(),
  requiresArn: z.boolean().optional(),
});

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

    // Get user profile to check role using Admin SDK
    const { adminDb } = await import('@/lib/firebase-admin');
    let userProfile: any;
    try {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        console.error(`[Recurring Tasks API] ❌ User profile not found for userId: ${userId}`);
        return ErrorResponses.unauthorized();
      }
      userProfile = userDoc.data();
      console.log(`[Recurring Tasks API] ✅ User profile loaded for ${userId}, role: ${userProfile.role}`);
    } catch (error) {
      console.error('[Recurring Tasks API] ❌ Error getting user profile:', error);
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
    
    // Check if this is a calendar view request
    const isCalendarView = searchParams.get('view') === 'calendar';

    // Fetch all tasks using Admin SDK
    let tasks = await recurringTaskAdminService.getAll(filters);
    
    console.log(`[Recurring Tasks API] Total tasks fetched: ${tasks.length}`);
    console.log(`[Recurring Tasks API] User Firebase Auth UID: ${userId}`);
    console.log(`[Recurring Tasks API] User role: ${userProfile.role}`);
    console.log(`[Recurring Tasks API] Is Admin/Manager: ${isAdminOrManager}`);
    console.log(`[Recurring Tasks API] Is Calendar View: ${isCalendarView}`);
    
    // Filter tasks based on user role
    // Admin/Manager see all tasks in both calendar and list views
    // Team members see only their assigned tasks in both views
    if (!isAdminOrManager) {
      const { teamAdminService } = await import('@/services/team-admin.service');
      
      // OPTIMIZED: Batch all user ID lookups using Admin SDK
      const userIds = new Set<string>([userId]); // Start with Auth UID
      
      console.log(`[Recurring Tasks API] User email: ${userProfile.email}`);
      
      // Batch query for all user documents by email using Admin SDK
      try {
        const [usersSnapshot, empSnapshot] = await Promise.all([
          // Check users collection
          (async () => {
            try {
              const usersRef = adminDb.collection('users');
              const emailQuery = usersRef.where('email', '==', userProfile.email);
              return await emailQuery.get();
            } catch (error) {
              console.error(`[Recurring Tasks API] Error finding user by email:`, error);
              return { docs: [] };
            }
          })(),
          // Check employees collection
          (async () => {
            try {
              const employeesRef = adminDb.collection('employees');
              const empEmailQuery = employeesRef.where('email', '==', userProfile.email);
              return await empEmailQuery.get();
            } catch (error) {
              console.log(`[Recurring Tasks API] No employees collection found (this is normal)`);
              return { docs: [] };
            }
          })()
        ]);
        
        usersSnapshot.docs.forEach((doc: any) => {
          userIds.add(doc.id);
          console.log(`[Recurring Tasks API] Found user document by email: ${doc.id}`);
        });
        
        empSnapshot.docs.forEach((doc: any) => {
          userIds.add(doc.id);
          console.log(`[Recurring Tasks API] Found employee document by email: ${doc.id}`);
        });
      } catch (error) {
        console.error(`[Recurring Tasks API] Error in batch user lookup:`, error);
      }
      
      console.log(`[Recurring Tasks API] All possible user IDs:`, Array.from(userIds));
      
      // Get teams for ALL possible user IDs in parallel
      const teamPromises = Array.from(userIds).map(id => teamAdminService.getTeamsByMember(id));
      const teamResults = await Promise.all(teamPromises);
      
      // Flatten and deduplicate teams
      const userTeams: any[] = [];
      const seenTeamIds = new Set<string>();
      teamResults.forEach(teams => {
        teams.forEach(team => {
          if (team.id && !seenTeamIds.has(team.id)) {
            seenTeamIds.add(team.id);
            userTeams.push(team);
          }
        });
      });
      
      const userTeamIds = Array.from(seenTeamIds);
      
      console.log(`[Recurring Tasks API] User teams:`, userTeams.map(t => ({ id: t.id, name: t.name })));
      console.log(`[Recurring Tasks API] User team IDs:`, userTeamIds);
      
      // Employees see tasks that are:
      // 1. Directly assigned to them (in contactIds), OR
      // 2. Assigned to a team they are a member of, OR
      // 3. Assigned to them via team member mappings
      tasks = tasks.filter(task => {
        // Check if task is directly assigned to user (check all possible user IDs)
        const isDirectlyAssigned = task.contactIds && 
          Array.isArray(task.contactIds) && 
          Array.from(userIds).some(id => task.contactIds.includes(id));
        
        // Check if task is assigned to a team the user is a member of
        const isTeamAssigned = task.teamId && userTeamIds.includes(task.teamId);
        
        // Check if task has team member mappings for this user
        const isMappedToUser = task.teamMemberMappings && 
          Array.isArray(task.teamMemberMappings) &&
          task.teamMemberMappings.some(mapping => Array.from(userIds).includes(mapping.userId));
        
        console.log(`[Recurring Tasks API] Task "${task.title}":`, {
          taskId: task.id,
          teamId: task.teamId,
          contactIdsCount: task.contactIds?.length || 0,
          hasMappings: !!task.teamMemberMappings,
          isDirectlyAssigned,
          isTeamAssigned,
          isMappedToUser,
          willShow: isDirectlyAssigned || isTeamAssigned || isMappedToUser
        });
        
        return isDirectlyAssigned || isTeamAssigned || isMappedToUser;
      });
      
      console.log(`[Recurring Tasks API] Team member ${userId} filtered recurring tasks: ${tasks.length} (Calendar view: ${isCalendarView})`);
    } else {
      console.log(`[Recurring Tasks API] Admin/Manager ${userId} viewing all recurring tasks: ${tasks.length} (Calendar view: ${isCalendarView})`);
    }
    
    // Serialize dates to ISO strings for JSON response
    const serializedTasks = tasks.map(task => ({
      ...task,
      startDate: task.startDate ? (task.startDate.toDate ? task.startDate.toDate().toISOString() : new Date(task.startDate).toISOString()) : null,
      dueDate: task.dueDate ? (task.dueDate.toDate ? task.dueDate.toDate().toISOString() : new Date(task.dueDate).toISOString()) : null,
      createdAt: task.createdAt ? (task.createdAt.toDate ? task.createdAt.toDate().toISOString() : new Date(task.createdAt).toISOString()) : null,
      updatedAt: task.updatedAt ? (task.updatedAt.toDate ? task.updatedAt.toDate().toISOString() : new Date(task.updatedAt).toISOString()) : null,
    }));
    
    return NextResponse.json(serializedTasks, { status: 200 });
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
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ErrorResponses.unauthorized();
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Decode JWT token to get user ID
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

    const body = await request.json();
    console.log('📥 [POST /api/recurring-tasks] Received body:', JSON.stringify(body, null, 2));

    // Validate request body
    const validationResult = createRecurringTaskSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('❌ [POST /api/recurring-tasks] Validation failed:', validationResult.error);
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const taskData = validationResult.data;
    console.log('✅ [POST /api/recurring-tasks] Validation passed');
    console.log('🗺️ [POST /api/recurring-tasks] Team member mappings:', taskData.teamMemberMappings);

    // Calculate the due date based on start date and current date
    const startDate = taskData.startDate instanceof Date ? taskData.startDate : new Date(taskData.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    
    // If start date is in the past or today, calculate the next due date from today
    let dueDate = startDate;
    if (startDate <= today) {
      const { calculateNextOccurrence } = await import('@/utils/recurrence-scheduler');
      dueDate = calculateNextOccurrence(today, taskData.recurrencePattern);
    }

    // Convert date strings to Date objects and add createdBy
    const taskToCreate = {
      ...taskData,
      description: taskData.description || '',
      startDate: startDate,
      dueDate: taskData.dueDate 
        ? (taskData.dueDate instanceof Date ? taskData.dueDate : new Date(taskData.dueDate))
        : dueDate,
      createdBy: userId, // Store the creator's user ID
      completionHistory: [], // Initialize empty completion history
      isPaused: false, // Initialize as not paused
    };
    
    console.log('💾 [POST /api/recurring-tasks] Creating task in Firestore:', JSON.stringify(taskToCreate, null, 2));
    const newTask = await recurringTaskAdminService.create(taskToCreate as any);
    console.log('✅ [POST /api/recurring-tasks] Task created successfully with ID:', newTask.id);
    console.log('🗺️ [POST /api/recurring-tasks] Saved team member mappings:', newTask.teamMemberMappings);
    
    // Serialize dates for JSON response
    const serializedTask = {
      ...newTask,
      startDate: newTask.startDate ? (newTask.startDate.toDate ? newTask.startDate.toDate().toISOString() : new Date(newTask.startDate).toISOString()) : null,
      dueDate: newTask.dueDate ? (newTask.dueDate.toDate ? newTask.dueDate.toDate().toISOString() : new Date(newTask.dueDate).toISOString()) : null,
      createdAt: newTask.createdAt ? (newTask.createdAt.toDate ? newTask.createdAt.toDate().toISOString() : new Date(newTask.createdAt).toISOString()) : null,
      updatedAt: newTask.updatedAt ? (newTask.updatedAt.toDate ? newTask.updatedAt.toDate().toISOString() : new Date(newTask.updatedAt).toISOString()) : null,
    };
    
    return NextResponse.json(serializedTask, { status: 201 });
  } catch (error) {
    console.error('❌ [POST /api/recurring-tasks] Error:', error);
    return handleApiError(error);
  }
}
