import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ErrorResponses } from '@/lib/api-error-handler';
import { verifyAuthToken } from '@/lib/server-auth';

/**
 * GET /api/notifications/check-token?userId=xxx
 * Check if a user has an FCM token registered
 * Useful for debugging notification issues
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[Check Token] Checking FCM token for user: ${userId}`);

    const tokenDoc = await adminDb.collection('fcmTokens').doc(userId).get();

    if (!tokenDoc.exists) {
      console.log(`[Check Token] ❌ No FCM token found for user: ${userId}`);
      return NextResponse.json({
        exists: false,
        message: 'No FCM token found for this user',
        userId,
        action: 'User needs to enable notifications at /notifications page',
        instructions: [
          '1. Visit /notifications page',
          '2. Click "Enable Notifications" button',
          '3. Grant permission when browser prompts',
          '4. Token will be automatically saved'
        ]
      }, { status: 404 });
    }

    const data = tokenDoc.data();
    const tokenPreview = data?.token ?
      `${data.token.substring(0, 20)}...${data.token.substring(data.token.length - 10)}` :
      'N/A';

    console.log(`[Check Token] ✅ FCM token found for user: ${userId}`);
    console.log(`[Check Token] Token preview: ${tokenPreview}`);

    return NextResponse.json({
      exists: true,
      userId,
      hasToken: !!data?.token,
      tokenLength: data?.token?.length || 0,
      tokenPreview,
      platform: data?.platform || 'unknown',
      updatedAt: data?.updatedAt?.toDate?.() || null,
      message: 'FCM token found - notifications should work',
      status: 'ready'
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Check Token] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check FCM token',
        details: error.message
      },
      { status: 500 }
    );
  }
}
