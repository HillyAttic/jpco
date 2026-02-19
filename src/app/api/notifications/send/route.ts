import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications/send-notification';
import { ErrorResponses } from '@/lib/api-error-handler';

/**
 * POST /api/notifications/send
 * Send push notification to user(s) - FAST direct FCM delivery
 * 
 * This endpoint:
 * 1. Sends FCM push notification DIRECTLY (no Cloud Function needed)
 * 2. Stores notification in Firestore for history (in parallel)
 * 
 * This eliminates the Cloud Function cold start delay (3-15 seconds)
 * making notifications nearly instant.
 */
export async function POST(request: NextRequest) {
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

    const { userIds, title, body, data } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      );
    }

    if (!title || !body) {
      return NextResponse.json(
        { error: 'title and body are required' },
        { status: 400 }
      );
    }

    const result = await sendNotification({
      userIds,
      title,
      body,
      data,
    });

    return NextResponse.json(
      {
        message: 'Notifications processed',
        totalTime: `${result.totalTime}ms`,
        sent: result.sent,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Notification Send API] Error sending notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications', details: error.message },
      { status: 500 }
    );
  }
}
