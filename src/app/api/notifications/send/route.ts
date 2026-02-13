import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';

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
  const startTime = Date.now();

  try {
    const { userIds, title, body, data } = await request.json();

    console.log('[Notification Send] Request received:', {
      userIds,
      title,
      body,
      dataKeys: data ? Object.keys(data) : [],
    });

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

    const results: Array<{ userId: string; messageId: string; deliveryTime: string }> = [];
    const errors: Array<{ userId: string; error: string }> = [];

    // Process all users in parallel for maximum speed
    const promises = userIds.map(async (userId: string) => {
      try {
        console.log(`[Notification Send] Processing user: ${userId}`);
        
        // Get user's FCM token
        const tokenDoc = await adminDb.collection('fcmTokens').doc(userId).get();

        if (!tokenDoc.exists) {
          console.log(`[Notification Send] ❌ No FCM token found for user ${userId}`);
          errors.push({ userId, error: 'No FCM token' });

          // Still store notification in Firestore (without sending push)
          await adminDb.collection('notifications').add({
            userId,
            title,
            body,
            data: data || {},
            read: false,
            sent: false,
            error: 'No FCM token',
            createdAt: new Date(),
          });
          return;
        }

        const fcmToken = tokenDoc.data()?.token;
        console.log(`[Notification Send] ✅ FCM token found for user ${userId}`);

        // Send FCM and store in Firestore IN PARALLEL
        const [fcmResult, firestoreResult] = await Promise.allSettled([
          // 1. Send FCM push notification directly (DATA-ONLY for service worker control)
          adminMessaging.send({
            data: {
              title: title,
              body: body,
              icon: '/images/logo/logo-icon.svg',
              badge: '/images/logo/logo-icon.svg',
              url: data?.url || '/notifications',
              type: data?.type || 'general',
              taskId: data?.taskId || '',
              timestamp: Date.now().toString(),
            },
            token: fcmToken,
            webpush: {
              headers: {
                Urgency: 'high',
                TTL: '86400',
              },
              fcmOptions: {
                link: data?.url || '/notifications',
              },
            },
          }),

          // 2. Store notification in Firestore for history/UI
          adminDb.collection('notifications').add({
            userId,
            fcmToken,
            title,
            body,
            data: data || {},
            read: false,
            sent: true,
            sentAt: new Date(),
            sentDirect: true, // Flag: sent directly, not via Cloud Function
            createdAt: new Date(),
          }),
        ]);

        if (fcmResult.status === 'fulfilled') {
          console.log(`[Notification Send] ✅ FCM sent to ${userId} in ${Date.now() - startTime}ms`);
          results.push({
            userId,
            messageId: fcmResult.value,
            deliveryTime: `${Date.now() - startTime}ms`,
          });
        } else {
          const error = fcmResult.reason;
          console.error(`[Notification Send] ❌ FCM failed for ${userId}:`, error.message);

          // Handle invalid/expired tokens
          if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
            // Clean up expired token
            await adminDb.collection('fcmTokens').doc(userId).delete();
            console.log(`[Notification Send] 🗑️ Cleaned up expired token for ${userId}`);
          }

          errors.push({ userId, error: error.message });
        }

        if (firestoreResult.status === 'rejected') {
          console.error(`[Notification Send] Firestore write failed for ${userId}:`, firestoreResult.reason);
        }

      } catch (error: any) {
        console.error(`[Notification Send] Error processing notification for ${userId}:`, error);
        errors.push({ userId, error: error.message });
      }
    });

    // Wait for all notifications to be processed
    await Promise.all(promises);

    const totalTime = Date.now() - startTime;
    console.log(`[Notification Send] 📬 Batch completed in ${totalTime}ms (${results.length} sent, ${errors.length} errors)`);

    return NextResponse.json(
      {
        message: 'Notifications processed',
        totalTime: `${totalTime}ms`,
        sent: results,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Notification Send] Error sending notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications', details: error.message },
      { status: 500 }
    );
  }
}
