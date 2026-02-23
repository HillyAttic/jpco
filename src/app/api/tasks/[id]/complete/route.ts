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
    
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);
    
    console.log('[API /api/tasks/[id]/complete] Auth result:', { 
      success: authResult.success, 
      error: authResult.error,
      hasUser: !!authResult.user 
    });
    
    if (!authResult.success || !authResult.user) {
      console.error('[API /api/tasks/[id]/complete] Authentication failed:', authResult.error);
      return ErrorResponses.unauthorized(authResult.error);
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    console.log('[API /api/tasks/[id]/complete] User role:', userRole);
    
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      console.error('[API /api/tasks/[id]/complete] Insufficient permissions for role:', userRole);
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const { id } = await params;
    console.log('[API /api/tasks/[id]/complete] Toggling task:', id);
    
    const updatedTask = await nonRecurringTaskAdminService.toggleComplete(id);
    
    console.log('[API /api/tasks/[id]/complete] Task toggled successfully:', id);
    
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
