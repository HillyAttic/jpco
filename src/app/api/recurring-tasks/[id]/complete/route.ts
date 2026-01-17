import { NextRequest, NextResponse } from 'next/server';
import { recurringTaskService } from '@/services/recurring-task.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for completing a cycle
const completeCycleSchema = z.object({
  completedBy: z.string().default('system'),
});

/**
 * PATCH /api/recurring-tasks/[id]/complete
 * Complete a cycle and schedule the next occurrence
 * Validates Requirements: 3.4, 3.6
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
    const body = await request.json();
    
    // Validate request body
    const validationResult = completeCycleSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { completedBy } = validationResult.data;
    
    const updatedTask = await recurringTaskService.completeCycle(id, completedBy);
    
    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error) {
    // Check if it's a "not found" error
    if (error instanceof Error && error.message === 'Task not found') {
      return ErrorResponses.notFound('Recurring task');
    }
    
    return handleApiError(error);
  }
}
