import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/dashboard/tasks
 * Optimized paginated task fetching with user data denormalization
 * Supports filtering by status and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userId = authResult.user.uid;
    const userRole = authResult.user.claims.role;
    const isAdmin = userRole === 'admin';
    const isManager = userRole === 'manager';

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor');
    const includeRecurring = searchParams.get('includeRecurring') !== 'false';

    // Build base query
    let tasksQuery = adminDb.collection('tasks').orderBy('createdAt', 'desc').limit(limit);
    
    if (status) {
      tasksQuery = tasksQuery.where('status', '==', status) as any;
    }

    if (cursor) {
      const cursorDoc = await adminDb.collection('tasks').doc(cursor).get();
      if (cursorDoc.exists) {
        tasksQuery = tasksQuery.startAfter(cursorDoc) as any;
      }
    }

    // Apply role-based filtering
    if (isAdmin) {
      tasksQuery = tasksQuery.where('createdBy', '==', userId) as any;
    } else if (isManager) {
      // Get manager's team
      const hierarchySnapshot = await adminDb
        .collection('manager-hierarchies')
        .where('managerId', '==', userId)
        .limit(1)
        .get();
      
      const managedEmployeeIds = new Set<string>([userId]);
      if (!hierarchySnapshot.empty) {
        const hierarchy = hierarchySnapshot.docs[0].data();
        (hierarchy.employeeIds || []).forEach((id: string) => managedEmployeeIds.add(id));
      }

      // Fetch tasks created by manager or assigned to team
      const [createdTasks, assignedTasks] = await Promise.all([
        adminDb.collection('tasks')
          .where('createdBy', '==', userId)
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .get(),
        adminDb.collection('tasks')
          .where('assignedTo', 'array-contains-any', Array.from(managedEmployeeIds).slice(0, 10))
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .get()
      ]);

      const tasks = await enrichTasksWithUserData([...createdTasks.docs, ...assignedTasks.docs]);
      
      return NextResponse.json({
        tasks,
        hasMore: tasks.length === limit,
        nextCursor: tasks.length > 0 ? tasks[tasks.length - 1].id : null
      });
    } else {
      // Employee
      tasksQuery = tasksQuery.where('assignedTo', 'array-contains', userId) as any;
    }

    const snapshot = await tasksQuery.get();
    const tasks = await enrichTasksWithUserData(snapshot.docs);

    // Optionally include recurring tasks
    let recurringTasks: any[] = [];
    if (includeRecurring) {
      let recurringQuery = adminDb.collection('recurring-tasks')
        .orderBy('createdAt', 'desc')
        .limit(Math.floor(limit / 2));

      if (isAdmin) {
        recurringQuery = recurringQuery.where('createdBy', '==', userId) as any;
      } else if (!isManager) {
        recurringQuery = recurringQuery.where('teamMemberMappings', 'array-contains', { userId }) as any;
      }

      const recurringSnapshot = await recurringQuery.get();
      recurringTasks = await enrichTasksWithUserData(recurringSnapshot.docs, true);
    }

    return NextResponse.json({
      tasks: [...tasks, ...recurringTasks],
      hasMore: tasks.length === limit,
      nextCursor: tasks.length > 0 ? tasks[tasks.length - 1].id : null
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Batch fetch user data and enrich tasks
 * Reduces N+1 queries to single batch read
 */
async function enrichTasksWithUserData(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  isRecurring = false
) {
  // Collect unique user IDs
  const userIds = new Set<string>();
  docs.forEach(doc => {
    const data = doc.data();
    if (data.createdBy) userIds.add(data.createdBy);
    if (data.assignedTo) {
      data.assignedTo.forEach((id: string) => userIds.add(id));
    }
    if (data.teamMemberMappings) {
      data.teamMemberMappings.forEach((mapping: any) => {
        if (mapping.userId) userIds.add(mapping.userId);
      });
    }
  });

  // Batch fetch user data (max 10 at a time due to Firestore limits)
  const userDataMap = new Map<string, any>();
  const userIdArray = Array.from(userIds);
  
  for (let i = 0; i < userIdArray.length; i += 10) {
    const batch = userIdArray.slice(i, i + 10);
    const userDocs = await adminDb.collection('users')
      .where('__name__', 'in', batch)
      .select('name', 'displayName', 'email')
      .get();
    
    userDocs.forEach(doc => {
      const data = doc.data();
      userDataMap.set(doc.id, {
        id: doc.id,
        name: data.name || data.displayName || data.email || 'Unknown User'
      });
    });
  }

  // Enrich tasks with user data
  return docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      isRecurring,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      dueDate: data.dueDate?.toDate?.()?.toISOString() || null,
      createdByName: userDataMap.get(data.createdBy)?.name || 'Unknown',
      assignedToNames: (data.assignedTo || []).map((id: string) => 
        userDataMap.get(id)?.name || 'Unknown'
      )
    };
  });
}
