import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/task-completions
 * Fetch task completions with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const recurringTaskId = searchParams.get('recurringTaskId');
    const clientId = searchParams.get('clientId');

    if (!recurringTaskId) {
      return ErrorResponses.badRequest('recurringTaskId is required');
    }

    const { taskCompletionAdminService } = await import('@/services/task-completion-admin.service');

    // Fetch completions based on filters
    let completions;
    if (clientId) {
      completions = await taskCompletionAdminService.getByClientAndTask(clientId, recurringTaskId);
    } else {
      completions = await taskCompletionAdminService.getByTaskId(recurringTaskId);
    }

    return NextResponse.json(completions);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/task-completions
 * Create or update task completion
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const body = await request.json();
    const { taskCompletionAdminService } = await import('@/services/task-completion-admin.service');

    const completion = await taskCompletionAdminService.createOrUpdate(body);

    return NextResponse.json(completion, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/task-completions
 * Bulk update task completions
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const body = await request.json();
    const { recurringTaskId, completions, completedBy } = body;

    console.log('[Task Completions API] Bulk update request:', {
      recurringTaskId,
      completionsCount: completions?.length,
      completedBy,
      userId: authResult.user.uid,
    });

    if (!recurringTaskId || !completions || !Array.isArray(completions)) {
      return ErrorResponses.badRequest('recurringTaskId and completions array are required');
    }

    const { taskCompletionAdminService } = await import('@/services/task-completion-admin.service');

    // Process each completion
    const results = [];
    for (const comp of completions) {
      try {
        if (comp.isCompleted) {
          const result = await taskCompletionAdminService.createOrUpdate({
            recurringTaskId,
            clientId: comp.clientId,
            monthKey: comp.monthKey,
            isCompleted: true,
            completedAt: new Date(),
            completedBy: completedBy || authResult.user!.uid,
            arnNumber: comp.arnNumber,
            arnName: comp.arnName,
          });
          results.push({ success: true, clientId: comp.clientId, monthKey: comp.monthKey });
        } else {
          // Find and delete existing completion
          const existing = await taskCompletionAdminService.getByClientAndTask(comp.clientId, recurringTaskId);
          const toDelete = existing.find(e => e.monthKey === comp.monthKey);
          if (toDelete && toDelete.id) {
            await taskCompletionAdminService.delete(toDelete.id);
            results.push({ success: true, clientId: comp.clientId, monthKey: comp.monthKey, deleted: true });
          } else {
            results.push({ success: true, clientId: comp.clientId, monthKey: comp.monthKey, noAction: true });
          }
        }
      } catch (error) {
        console.error('[Task Completions API] Error processing completion:', {
          clientId: comp.clientId,
          monthKey: comp.monthKey,
          error,
        });
        results.push({ success: false, clientId: comp.clientId, monthKey: comp.monthKey, error: String(error) });
      }
    }

    console.log('[Task Completions API] Bulk update completed:', {
      total: completions.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('[Task Completions API] Bulk update error:', error);
    return handleApiError(error);
  }
}

/**
 * DELETE /api/task-completions
 * Delete task completion
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return ErrorResponses.badRequest('id is required');
    }

    const { taskCompletionAdminService } = await import('@/services/task-completion-admin.service');
    await taskCompletionAdminService.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
