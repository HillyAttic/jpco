import { NextRequest, NextResponse } from 'next/server';
import { recurringTaskService } from '@/services/recurring-task.service';
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
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;
    
    const updatedTask = await recurringTaskService.resume(id);
    
    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error) {
    // Check if it's a "not found" error
    if (error instanceof Error && error.message === 'Task not found') {
      return ErrorResponses.notFound('Recurring task');
    }
    
    return handleApiError(error);
  }
}
