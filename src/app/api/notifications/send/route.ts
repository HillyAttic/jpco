import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * POST /api/notifications/send
 * Send push notification to user(s) when task is assigned
 * 
 * This endpoint stores notification data in Firestore.
 * You'll need to set up Firebase Cloud Functions to actually send the push notifications.
 */
export async function POST(request: NextRequest) {
  try {
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

    const notifications = [];

    // Create notification for each user
    for (const userId of userIds) {
      // Get user's FCM token
      const tokenRef = doc(db, 'fcmTokens', userId);
      const tokenDoc = await getDoc(tokenRef);

      if (!tokenDoc.exists()) {
        console.log(`No FCM token found for user ${userId}`);
        continue;
      }

      const fcmToken = tokenDoc.data().token;

      // Store notification in Firestore
      const notificationRef = await addDoc(collection(db, 'notifications'), {
        userId,
        fcmToken,
        title,
        body,
        data: data || {},
        read: false,
        sent: false,
        createdAt: serverTimestamp(),
      });

      notifications.push({
        id: notificationRef.id,
        userId,
      });

      // In a production environment, you would trigger a Cloud Function here
      // to actually send the push notification using the FCM Admin SDK
      // For now, we'll just log it
      console.log(`Notification queued for user ${userId}:`, {
        title,
        body,
        data,
      });
    }

    return NextResponse.json(
      {
        message: 'Notifications queued successfully',
        notifications,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}
