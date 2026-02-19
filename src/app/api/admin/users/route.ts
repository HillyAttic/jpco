import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/admin/users
 * Get all users with their roles (admin only)
 * Uses Admin SDK to bypass Firestore security rules.
 */
export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only admins and managers can view all users');
    }

    // Use Admin SDK to bypass Firestore security rules
    const { adminDb } = await import('@/lib/firebase-admin');
    const usersSnapshot = await adminDb.collection('users').get();
    const users = usersSnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
