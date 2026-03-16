import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { z } from 'zod';

const delegateSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  delegateToUserId: z.string().min(1, 'Delegate to user ID is required'),
  delegateToUserName: z.string().min(1, 'Delegate to user name is required'),
  delegatedByUserId: z.string().min(1, 'Delegated by user ID is required'),
  delegatedByUserName: z.string().min(1, 'Delegated by user name is required'),
  reason: z.string().optional(),
  clientIds: z.array(z.string()).default([]),
});

/**
 * POST /api/recurring-tasks/delegate
 * Delegate a recurring task to another user.
 * Updates the team member mappings to include the new user with the delegated client IDs.
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userId = authResult.user.uid;
    const userRole = authResult.user.claims.role;

    const body = await request.json();
    const validationResult = delegateSchema.safeParse(body);

    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const {
      taskId,
      delegateToUserId,
      delegateToUserName,
      delegatedByUserId,
      delegatedByUserName,
      reason,
      clientIds,
    } = validationResult.data;

    // Ensure the user is delegating their own task
    if (delegatedByUserId !== userId) {
      return ErrorResponses.forbidden('You can only delegate your own tasks');
    }

    const { adminDb } = await import('@/lib/firebase-admin');

    // Validate the delegate-to user exists
    const delegateToUserDoc = await adminDb.collection('users').doc(delegateToUserId).get();
    if (!delegateToUserDoc.exists) {
      return ErrorResponses.badRequest('Target user not found');
    }

    const delegateToUserData = delegateToUserDoc.data()!;
    const delegateToRole = delegateToUserData.role;

    // Validation: employees can only delegate to admins/managers
    if (userRole === 'employee' && !['admin', 'manager'].includes(delegateToRole)) {
      return ErrorResponses.forbidden('Employees can only delegate to admins or managers');
    }

    // Validation: managers can delegate to their assigned employees
    if (userRole === 'manager') {
      const hierarchySnapshot = await adminDb
        .collection('manager-hierarchies')
        .where('managerId', '==', userId)
        .limit(1)
        .get();

      if (!hierarchySnapshot.empty) {
        const hierarchy = hierarchySnapshot.docs[0].data();
        const managedEmployeeIds = new Set(hierarchy.employeeIds || []);

        // Managers can delegate to their managed employees OR to admins/managers
        if (!managedEmployeeIds.has(delegateToUserId) && !['admin', 'manager'].includes(delegateToRole)) {
          return ErrorResponses.forbidden('You can only delegate to your assigned employees or admins/managers');
        }
      }
    }

    // Get the recurring task
    const taskDoc = await adminDb.collection('recurring-tasks').doc(taskId).get();
    if (!taskDoc.exists) {
      return ErrorResponses.badRequest('Task not found');
    }

    const taskData = taskDoc.data()!;
    const existingMappings: Array<{
      userId: string;
      userName: string;
      clientIds: string[];
    }> = taskData.teamMemberMappings || [];

    // Find the delegator's mapping
    const delegatorMapping = existingMappings.find(m => m.userId === delegatedByUserId);
    const delegatedClientIds = clientIds.length > 0 ? clientIds : (delegatorMapping?.clientIds || []);

    // Check if the delegate-to user already has a mapping
    const existingDelegateeMapping = existingMappings.find(m => m.userId === delegateToUserId);

    let updatedMappings;
    if (existingDelegateeMapping) {
      // Merge client IDs with existing mapping
      const mergedClientIds = [...new Set([
        ...existingDelegateeMapping.clientIds,
        ...delegatedClientIds,
      ])];
      updatedMappings = existingMappings.map(m =>
        m.userId === delegateToUserId
          ? { ...m, clientIds: mergedClientIds }
          : m
      );
    } else {
      // Add new mapping for the delegatee
      updatedMappings = [
        ...existingMappings,
        {
          userId: delegateToUserId,
          userName: delegateToUserName,
          clientIds: delegatedClientIds,
        },
      ];
    }

    // Update the task with new mappings and delegation history
    const delegationRecord = {
      from: delegatedByUserId,
      fromName: delegatedByUserName,
      to: delegateToUserId,
      toName: delegateToUserName,
      reason: reason || '',
      clientIds: delegatedClientIds,
      timestamp: new Date().toISOString(),
    };

    const existingDelegations = taskData.delegationHistory || [];

    await adminDb.collection('recurring-tasks').doc(taskId).update({
      teamMemberMappings: updatedMappings,
      delegationHistory: [...existingDelegations, delegationRecord],
      updatedAt: new Date(),
    });

    // Send notification to the delegated user
    try {
      const { sendNotification } = await import('@/lib/notifications/send-notification');
      await sendNotification({
        userIds: [delegateToUserId],
        title: 'Task Delegated to You',
        body: `${delegatedByUserName} has delegated "${taskData.title}" to you${reason ? ` - Reason: ${reason}` : ''}`,
        data: {
          url: '/dashboard',
          type: 'task_delegation',
          taskId,
        },
      });
    } catch (notifError) {
      console.error('[Delegate API] Failed to send notification:', notifError);
    }

    return NextResponse.json(
      {
        message: 'Task delegated successfully',
        delegatedTo: delegateToUserName,
        clientCount: delegatedClientIds.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Delegate API] Error:', error);
    return handleApiError(error);
  }
}
