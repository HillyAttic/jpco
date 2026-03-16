import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/recurring-tasks/delegate/available-users
 * Get admins and managers that a regular employee can delegate tasks to
 */
export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const userId = authResult.user.uid;

    // Get all admins and managers
    const usersSnapshot = await adminDb
      .collection('users')
      .where('role', 'in', ['admin', 'manager'])
      .get();

    const users = usersSnapshot.docs
      .filter((doc) => doc.id !== userId) // Exclude self
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.displayName || data.name || '',
          email: data.email || '',
          role: data.role || 'manager',
        };
      });

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
