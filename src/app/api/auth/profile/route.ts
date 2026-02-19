import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * GET /api/auth/profile - Get current user profile
 * Uses Admin SDK to bypass Firestore security rules.
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user?.uid;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const data = userDoc.data()!;
    const userProfile = {
      uid: userDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
    };

    return NextResponse.json({ success: true, data: userProfile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
});

/**
 * PUT /api/auth/profile - Update current user profile
 * Uses Admin SDK to bypass Firestore security rules.
 */
export const PUT = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user?.uid;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await request.json();
    const { displayName, department, phoneNumber } = body;

    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    const updates: any = {
      displayName: displayName.trim(),
      updatedAt: Timestamp.now(),
    };

    if (department !== undefined) updates.department = department?.trim() ?? null;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber?.trim() ?? null;

    await adminDb.collection('users').doc(userId).update(updates);

    const updatedDoc = await adminDb.collection('users').doc(userId).get();
    const data = updatedDoc.data()!;
    const updatedProfile = {
      uid: updatedDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
    };

    return NextResponse.json({ success: true, data: updatedProfile });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
  }
});