import { NextRequest, NextResponse } from 'next/server';
import { recurringTaskAdminService } from '@/services/recurring-task-admin.service';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * PATCH /api/recurring-tasks/[id]/resume
 * Resume a paused recurring task to continue generating occurrences
 * Validates Requirements: 3.5
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can access this resource');
    }

    const { id } = await params;

    const updatedTask = await recurringTaskAdminService.resume(id);

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error) {
    // Check if it's a "not found" error
    if (error instanceof Error && error.message === 'Task not found') {
      return ErrorResponses.notFound('Recurring task');
    }

    return handleApiError(error);
  }
}
