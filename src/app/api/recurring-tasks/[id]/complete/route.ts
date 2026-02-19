import { NextRequest, NextResponse } from 'next/server';
import { recurringTaskAdminService } from '@/services/recurring-task-admin.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for completing a cycle
const completeCycleSchema = z.object({
  completedBy: z.string().default('system'),
  arnNumber: z.string().optional(),
  arnName: z.string().optional(),
});

/**
 * PATCH /api/recurring-tasks/[id]/complete
 * Complete a cycle and schedule the next occurrence
 * Uses Admin SDK to bypass Firestore security rules.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = completeCycleSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { completedBy, arnNumber, arnName } = validationResult.data;

    // Get task details before completion
    const task = await recurringTaskAdminService.getById(id);
    if (!task) {
      return ErrorResponses.notFound('Recurring task');
    }

    // Complete the task cycle using Admin SDK service
    const updatedTask = await recurringTaskAdminService.completeCycle(id, completedBy, arnNumber, arnName);

    // Record client visits if task has team member mappings
    if (task.teamMemberMappings && task.teamMemberMappings.length > 0) {
      const { adminDb } = await import('@/lib/firebase-admin');
      const { Timestamp } = await import('firebase-admin/firestore');

      for (const mapping of task.teamMemberMappings) {
        for (const clientId of mapping.clientIds) {
          try {
            // Get client name using Admin SDK
            const clientDoc = await adminDb.collection('clients').doc(clientId).get();
            if (clientDoc.exists) {
              const client = clientDoc.data()!;

              // Record client visit using Admin SDK
              await adminDb.collection('client-visits').add({
                clientId,
                clientName: client.name || '',
                employeeId: mapping.userId,
                employeeName: mapping.userName,
                visitDate: Timestamp.now(),
                taskId: id,
                taskTitle: task.title,
                taskType: 'recurring',
                completedAt: Timestamp.now(),
                arnNumber: arnNumber || null,
                arnName: arnName || null,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });
            }
          } catch (visitError) {
            console.error('Error recording client visit:', visitError);
            // Don't fail the whole operation if visit recording fails
          }
        }
      }
    }

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Task not found') {
      return ErrorResponses.notFound('Recurring task');
    }
    return handleApiError(error);
  }
}
