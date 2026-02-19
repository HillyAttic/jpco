import { NextRequest, NextResponse } from 'next/server';
import { nonRecurringTaskAdminService } from '@/services/nonrecurring-task-admin.service';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { id } = await params;
    const comments = await nonRecurringTaskAdminService.getComments(id);

    return NextResponse.json(comments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
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
    // Allow any authenticated user (admin, manager, employee) to comment
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const { id } = await params;
    const body = await request.json();

    if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
      return ErrorResponses.badRequest('Content is required');
    }

    // Use display name from auth token if author is not provided or to enforce identity
    const authorName = authResult.user.name || authResult.user.email || 'Unknown User';

    const newComment = await nonRecurringTaskAdminService.addComment(id, {
      author: authorName,
      content: body.content.trim(),
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}