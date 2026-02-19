import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * DELETE /api/manager-hierarchy/[managerId]
 * Delete manager hierarchy (admin only)
 * Uses Admin SDK to bypass Firestore security rules.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ managerId: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (userRole !== 'admin') {
      return ErrorResponses.forbidden('Only admins can delete manager hierarchies');
    }

    const { managerId } = await params;

    const { adminDb } = await import('@/lib/firebase-admin');

    // Find the hierarchy document by managerId field
    const snapshot = await adminDb
      .collection('manager-hierarchies')
      .where('managerId', '==', managerId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return ErrorResponses.notFound('Manager hierarchy');
    }

    await adminDb.collection('manager-hierarchies').doc(snapshot.docs[0].id).delete();

    return NextResponse.json(
      { message: 'Manager hierarchy deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
