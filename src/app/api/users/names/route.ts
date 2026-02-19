import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/users/names
 * Get a map of user IDs to display names
 * Uses Admin SDK to bypass Firestore security rules.
 */
export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { adminDb } = await import('@/lib/firebase-admin');

    // Fetch all users from the users collection
    const snapshot = await adminDb.collection('users').get();
    const nameMap: Record<string, string> = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const name = data.displayName || data.name || data.email || 'Unknown User';
      nameMap[doc.id] = name;
      // Also map by employeeId if present
      if (data.employeeId && data.employeeId !== doc.id) {
        nameMap[data.employeeId] = name;
      }
    });

    return NextResponse.json(nameMap, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
