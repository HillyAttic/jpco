import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ErrorResponses } from '@/lib/api-error-handler';
import { verifyAuthToken } from '@/lib/server-auth';

/**
 * POST /api/notifications/fcm-token
 * Save user's FCM token
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const { userId, token } = await request.json();

    if (!userId || !token) {
      return NextResponse.json(
        { error: 'userId and token are required' },
        { status: 400 }
      );
    }

    // Save FCM token using Admin SDK (faster, more reliable)
    await adminDb.collection('fcmTokens').doc(userId).set(
      {
        token,
        updatedAt: new Date(),
        platform: 'web',
      },
      { merge: true }
    );

    console.log(`FCM token saved for user ${userId}`);

    return NextResponse.json(
      { message: 'FCM token saved successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error saving FCM token:', error);
    return NextResponse.json(
      { error: 'Failed to save FCM token', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/fcm-token
 * Remove user's FCM token
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    await adminDb.collection('fcmTokens').doc(userId).delete();

    console.log(`FCM token deleted for user ${userId}`);

    return NextResponse.json(
      { message: 'FCM token deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting FCM token:', error);
    return NextResponse.json(
      { error: 'Failed to delete FCM token', details: error.message },
      { status: 500 }
    );
  }
}
