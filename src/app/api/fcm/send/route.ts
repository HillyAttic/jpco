import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  );
  
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token, notification, data } = await request.json();

    if (!token || !notification) {
      return NextResponse.json(
        { error: 'Missing token or notification' },
        { status: 400 }
      );
    }

    // Send notification using Firebase Admin SDK (HTTP v1 API)
    const messaging = getMessaging();
    
    const message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.icon || '/images/logo/logo-icon.svg',
      },
      data: {
        ...data,
        notificationId: `jpco-${Date.now()}`,
        icon: notification.icon || '/images/logo/logo-icon.svg',
        badge: notification.badge || '/images/logo/logo-icon.svg',
        url: data?.url || '/notifications',
      },
      webpush: {
        notification: {
          icon: notification.icon || '/images/logo/logo-icon.svg',
          badge: notification.badge || '/images/logo/logo-icon.svg',
        },
        fcmOptions: {
          link: data?.url || '/notifications',
        },
      },
    };

    const messageId = await messaging.send(message);
    console.log('[FCM] Notification sent successfully:', messageId);

    return NextResponse.json({ 
      success: true,
      messageId 
    });
  } catch (error: any) {
    console.error('[FCM] Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification', details: error.message },
      { status: 500 }
    );
  }
}
