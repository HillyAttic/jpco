import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/client-access
 * Returns all client_access documents (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can manage client access');
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const snapshot = await adminDb.collection('client_access').get();

    const docs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ data: docs });
  } catch (error) {
    console.error('[API /api/client-access] GET error:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/client-access
 * Create or update a user's allowed client list (admin only)
 * Body: { userId, userName, userEmail, allowedClientIds }
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can manage client access');
    }

    const body = await request.json();
    const { userId, userName, userEmail, allowedClientIds } = body;

    if (!userId || !Array.isArray(allowedClientIds)) {
      return ErrorResponses.badRequest('userId and allowedClientIds are required');
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const { FieldValue } = await import('firebase-admin/firestore');

    // Upsert: find existing doc by userId or create new one
    const existingSnapshot = await adminDb
      .collection('client_access')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    const data = {
      userId,
      userName: userName || '',
      userEmail: userEmail || '',
      allowedClientIds,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: authResult.user.uid,
    };

    if (existingSnapshot.empty) {
      await adminDb.collection('client_access').add(data);
    } else {
      await existingSnapshot.docs[0].ref.update(data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /api/client-access] POST error:', error);
    return handleApiError(error);
  }
}
