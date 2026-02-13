import { NextRequest, NextResponse } from 'next/server';
import { nonRecurringTaskAdminService } from '@/services/nonrecurring-task-admin.service';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * PATCH /api/tasks/[id]/complete
 * Toggle task completion status
 * Uses Admin SDK to bypass Firestore security rules
 * Validates Requirements: 2.6
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[API /api/tasks/[id]/complete] PATCH request received');
    
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;
    
    const updatedTask = await nonRecurringTaskAdminService.toggleComplete(id);
    
    console.log('[API /api/tasks/[id]/complete] Task toggled:', id);
    
    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error) {
    console.error('[API /api/tasks/[id]/complete] Error:', error);
    
    // Check if it's a "not found" error
    if (error instanceof Error && error.message === 'Task not found') {
      return ErrorResponses.notFound('Task');
    }
    
    return handleApiError(error);
  }
}
