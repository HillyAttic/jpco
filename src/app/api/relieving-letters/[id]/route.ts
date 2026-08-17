/**
 * Relieving Letters API - Single Letter Operations
 * GET: Get letter by ID
 * PUT: Update letter (admin only)
 * DELETE: Hard delete letter (admin only)
 * PATCH: Toggle access granted (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { RelievingLetter } from '@/types/relieving-letter.types';

/**
 * GET /api/relieving-letters/[id]
 * Get single letter by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { id } = await params;
    const doc = await adminDb.collection('relieving-letters').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }

    const letter = { id: doc.id, ...doc.data() } as Record<string, unknown>;

    // Access control: employee can only read own letter if accessGranted
    if (authResult.user.claims.role === 'employee') {
      if (letter.employeeId !== authResult.user.uid || letter.accessGranted !== true) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json(letter, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/relieving-letters/[id]
 * Update letter (admin only) - can update ALL fields
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can update relieving letters');
    }

    const { id } = await params;
    const body = await request.json();

    console.log(`[API /api/relieving-letters/${id}] PUT - Admin: ${authResult.user.uid}`);

    const doc = await adminDb.collection('relieving-letters').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }

    // Update document
    await adminDb.collection('relieving-letters').doc(id).update({
      ...body,
      updatedAt: Timestamp.now(),
      updatedBy: authResult.user.uid,
    });

    console.log(`[API /api/relieving-letters/${id}] PUT - Updated successfully`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/relieving-letters/[id]
 * Hard delete letter (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can delete relieving letters');
    }

    const { id } = await params;

    console.log(`[API /api/relieving-letters/${id}] DELETE - Admin: ${authResult.user.uid}`);

    const doc = await adminDb.collection('relieving-letters').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }

    await adminDb.collection('relieving-letters').doc(id).delete();

    console.log(`[API /api/relieving-letters/${id}] DELETE - Deleted successfully`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/relieving-letters/[id]
 * Toggle access granted (admin only)
 * Sends notification to employee when accessGranted is set to true
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can toggle letter access');
    }

    const { id } = await params;
    const body = await request.json();

    console.log(`[API /api/relieving-letters/${id}] PATCH - Admin: ${authResult.user.uid}`);

    if (typeof body.accessGranted !== 'boolean') {
      return NextResponse.json(
        { error: 'accessGranted must be a boolean' },
        { status: 400 }
      );
    }

    const doc = await adminDb.collection('relieving-letters').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }

    const letterData = doc.data() as Record<string, unknown>;
    const previousAccessGranted = letterData.accessGranted as boolean;

    // Update accessGranted field
    await adminDb.collection('relieving-letters').doc(id).update({
      accessGranted: body.accessGranted,
      updatedAt: Timestamp.now(),
      updatedBy: authResult.user.uid,
    });

    let notificationSent = false;

    // Send notification when toggling to true
    if (body.accessGranted && !previousAccessGranted) {
      const employeeId = letterData.employeeId as string;

      // Look up employee's FCM token
      const userDoc = await adminDb.collection('users').doc(employeeId).get();
      const userData = userDoc.data();
      const fcmToken = userData?.fcmToken;

      // Send FCM push notification if token exists
      if (fcmToken) {
        try {
          await adminMessaging.send({
            token: fcmToken,
            notification: {
              title: 'Relieving Letter Available',
              body: 'Your relieving letter has been made available. Check your dashboard to view and download it.',
            },
            data: {
              type: 'relieving-letter',
              letterId: id,
              url: '/relieving-letter',
            },
          });
          notificationSent = true;
          console.log(`[API /api/relieving-letters/${id}] PATCH - FCM notification sent to employee ${employeeId}`);
        } catch (fcmError) {
          console.error(`[API /api/relieving-letters/${id}] PATCH - FCM notification failed:`, fcmError);
        }
      }

      // Always create in-app notification
      await adminDb.collection('notifications').add({
        userId: employeeId,
        type: 'relieving-letter-access',
        title: 'Relieving Letter Available',
        message: 'Your relieving letter has been made available. Visit the Relieving Letter page to view and download it.',
        read: false,
        createdAt: Timestamp.now(),
        metadata: { letterId: id },
      });
      notificationSent = true;
      console.log(`[API /api/relieving-letters/${id}] PATCH - In-app notification created for employee ${employeeId}`);
    }

    console.log(`[API /api/relieving-letters/${id}] PATCH - Access updated to ${body.accessGranted}`);
    return NextResponse.json({ success: true, notificationSent }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
