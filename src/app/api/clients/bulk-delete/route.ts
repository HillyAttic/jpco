import { NextRequest, NextResponse } from 'next/server';
import { clientAdminService } from '@/services/client-admin.service';
import { ErrorResponses, handleApiError } from '@/lib/api-error-handler';

/**
 * POST /api/clients/bulk-delete
 * Delete multiple clients at once
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can delete clients');
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: ids must be a non-empty array' },
        { status: 400 }
      );
    }

    // Delete clients in parallel
    const deletePromises = ids.map(id => clientAdminService.delete(id));
    await Promise.all(deletePromises);

    return NextResponse.json(
      { message: `Successfully deleted ${ids.length} client(s)`, count: ids.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/clients/bulk-delete] Error:', error);
    return handleApiError(error);
  }
}
