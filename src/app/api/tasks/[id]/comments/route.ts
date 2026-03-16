import { NextRequest, NextResponse } from 'next/server';
import { nonRecurringTaskAdminService } from '@/services/nonrecurring-task-admin.service';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { sendNotification } from '@/lib/notifications/send-notification';

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

    // Validate attachments if provided
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    // Look up user's display name from Firestore users collection
    const { adminDb } = await import('@/lib/firebase-admin');
    let authorName = authResult.user.email || 'Unknown User';
    try {
      const userDoc = await adminDb.collection('users').doc(authResult.user.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        authorName = userData?.displayName || userData?.name || authorName;
      }
    } catch (err) {
      console.error('Error fetching user name for comment:', err);
    }

    const newComment = await nonRecurringTaskAdminService.addComment(id, {
      author: authorName,
      authorId: authResult.user.uid,
      content: body.content.trim(),
      attachments,
    });

    // Notify task creator about the new comment
    try {
      const task = await nonRecurringTaskAdminService.getById(id);
      if (task?.createdBy && task.createdBy !== authResult.user.uid) {
        await sendNotification({
          userIds: [task.createdBy],
          title: 'New Comment on Your Task',
          body: `${authorName} commented on "${task.title}": ${body.content.trim().substring(0, 80)}${body.content.trim().length > 80 ? '...' : ''}`,
          data: {
            taskId: id,
            url: '/tasks',
            type: 'task_comment',
          },
        });
      }
    } catch (err) {
      console.error('[Comments API] Error sending comment notification:', err);
    }

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}