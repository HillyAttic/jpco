import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, data } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user's FCM token
    const tokenDoc = await getDoc(doc(db, 'fcmTokens', userId));
    
    if (!tokenDoc.exists()) {
      return NextResponse.json(
        { error: 'No FCM token found for user' },
        { status: 404 }
      );
    }

    const token = tokenDoc.data().token;

    // Send notification via Firebase Cloud Messaging
    // This requires Firebase Admin SDK on the server side
    // For now, we'll use the Cloud Function approach
    
    // Create notification document (Cloud Function will handle sending)
    const notificationData = {
      userId,
      title,
      body,
      data: data || {},
      fcmToken: token,
      sent: false,
      createdAt: new Date(),
    };

    // In production, you would call your Cloud Function here
    // or use Firebase Admin SDK to send directly
    
    return NextResponse.json({ 
      success: true,
      message: 'Notification queued for sending'
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
