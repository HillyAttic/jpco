import { NextRequest, NextResponse } from 'next/server';
import { nonRecurringTaskService } from '@/services/nonrecurring-task.service';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * PATCH /api/tasks/[id]/complete
 * Toggle task completion status
 * Validates Requirements: 2.6
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;
    
    const updatedTask = await nonRecurringTaskService.toggleComplete(id);
    
    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error) {
    // Check if it's a "not found" error
    if (error instanceof Error && error.message === 'Task not found') {
      return ErrorResponses.notFound('Task');
    }
    
    return handleApiError(error);
  }
}
