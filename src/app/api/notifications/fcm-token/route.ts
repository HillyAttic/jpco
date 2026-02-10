import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

/**
 * POST /api/notifications/fcm-token
 * Save FCM token for a user
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, token } = await request.json();

    if (!userId || !token) {
      return NextResponse.json(
        { error: 'userId and token are required' },
        { status: 400 }
      );
    }

    // Save token to Firestore
    const tokenRef = doc(db, 'fcmTokens', userId);
    await setDoc(tokenRef, {
      token,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return NextResponse.json(
      { message: 'FCM token saved successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return NextResponse.json(
      { error: 'Failed to save FCM token' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/fcm-token
 * Delete FCM token for a user
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Delete token from Firestore
    const tokenRef = doc(db, 'fcmTokens', userId);
    await deleteDoc(tokenRef);

    return NextResponse.json(
      { message: 'FCM token deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting FCM token:', error);
    return NextResponse.json(
      { error: 'Failed to delete FCM token' },
      { status: 500 }
    );
  }
}
