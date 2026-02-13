import { NextRequest, NextResponse } from 'next/server';
import { nonRecurringTaskAdminService } from '@/services/nonrecurring-task-admin.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { adminDb } from '@/lib/firebase-admin';
import admin from '@/lib/firebase-admin';

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
  categoryId: z.string().optional(),
  contactId: z.string().optional(),
});

/**
 * GET /api/tasks
 * List all non-recurring tasks with optional filters
 * Role-based access: Admin/Manager see all tasks, Employees see only their assigned tasks
 * Validates Requirements: 2.3
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ErrorResponses.unauthorized();
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the Firebase token using Admin SDK
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return ErrorResponses.unauthorized();
    }

    const userId = decodedToken.uid;

    // Get user profile from Firestore using Admin SDK
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.error('User profile not found for:', userId);
      return ErrorResponses.unauthorized();
    }

    const userProfile = userDoc.data();
    const userRole = userProfile?.role || 'employee';
    const isAdminOrManager = userRole === 'admin' || userRole === 'manager';

    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    // Fetch all tasks
    let tasks = await nonRecurringTaskAdminService.getAll(filters);
    
    // Filter tasks based on user role
    if (!isAdminOrManager) {
      // Employees only see tasks assigned to them
      tasks = tasks.filter(task => {
        // Check if task has assignedTo array and if it includes the user's ID
        if (!task.assignedTo || !Array.isArray(task.assignedTo)) {
          return false;
        }
        return task.assignedTo.includes(userId);
      });
      
      console.log(`Employee ${userId} filtered tasks:`, tasks.length);
    } else {
      console.log(`Admin/Manager ${userId} viewing all tasks:`, tasks.length);
    }
    
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
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ErrorResponses.unauthorized();
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the Firebase token using Admin SDK
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return ErrorResponses.unauthorized();
    }

    const userId = decodedToken.uid;

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

    // Convert dueDate string to Date object and add createdBy
    const taskToCreate = {
      ...taskData,
      description: taskData.description || '',
      dueDate: new Date(taskData.dueDate),
      createdBy: userId, // Store the creator's user ID
    };
    
    const newTask = await nonRecurringTaskAdminService.create(taskToCreate);
    
    // Send push notifications to assigned users using Admin SDK
    if (taskData.assignedTo && taskData.assignedTo.length > 0) {
      try {
        console.log(`[Task API] Sending notifications to ${taskData.assignedTo.length} user(s):`, taskData.assignedTo);
        
        const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userIds: taskData.assignedTo,
            title: 'New Task Assigned',
            body: `You have been assigned a new task: ${taskData.title}`,
            data: {
              taskId: newTask.id,
              url: '/tasks',
              type: 'task_assigned',
            },
          }),
        });

        if (!notificationResponse.ok) {
          const errorData = await notificationResponse.json();
          console.error('[Task API] ❌ Failed to send notifications:', errorData);
        } else {
          const result = await notificationResponse.json();
          console.log('[Task API] ✅ Notification result:', result);
          
          // Log which users received notifications and which didn't
          if (result.sent && result.sent.length > 0) {
            console.log('[Task API] ✅ Notifications sent to:', result.sent.map((s: any) => s.userId));
          }
          if (result.errors && result.errors.length > 0) {
            console.log('[Task API] ⚠️ Notification errors:', result.errors);
            result.errors.forEach((err: any) => {
              if (err.error === 'No FCM token') {
                console.log(`[Task API] ⚠️ User ${err.userId} needs to enable notifications at /notifications page`);
              }
            });
          }
        }
      } catch (error) {
        console.error('[Task API] ❌ Error sending task assignment notifications:', error);
        // Don't fail the task creation if notification fails
      }
    }
    
    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}