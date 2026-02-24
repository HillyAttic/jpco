import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/notifications/debug
 * Debug endpoint to check notification setup
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);
    
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userId = authResult.user.uid;
    const userRole = authResult.user.claims.role;

    console.log('[Debug] Checking notification setup for user:', userId);

    // Check if user has FCM token
    const tokenDoc = await adminDb.collection('fcmTokens').doc(userId).get();
    const hasToken = tokenDoc.exists;
    const tokenData = tokenDoc.exists ? tokenDoc.data() : null;

    // Get all FCM tokens (admin only)
    let allTokens = null;
    if (userRole === 'admin') {
      const tokensSnapshot = await adminDb.collection('fcmTokens').get();
      allTokens = tokensSnapshot.docs.map(doc => ({
        userId: doc.id,
        platform: doc.data().platform,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || 'unknown',
        hasToken: !!doc.data().token,
      }));
    }

    // Check recent notifications
    const notificationsSnapshot = await adminDb
      .collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const recentNotifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      sent: doc.data().sent,
      error: doc.data().error,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || 'unknown',
    }));

    const debugInfo = {
      user: {
        id: userId,
        role: userRole,
      },
      fcmToken: {
        registered: hasToken,
        platform: tokenData?.platform || 'none',
        lastUpdated: tokenData?.updatedAt?.toDate?.()?.toISOString() || 'never',
      },
      recentNotifications,
      allTokens: userRole === 'admin' ? allTokens : 'Admin only',
      vapidKeyConfigured: !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerPath: '/firebase-messaging-sw.js',
    };

    console.log('[Debug] Notification setup:', debugInfo);

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error: any) {
    console.error('[Debug] Error:', error);
    return NextResponse.json(
      { error: 'Debug check failed', details: error.message },
      { status: 500 }
    );
  }
}
