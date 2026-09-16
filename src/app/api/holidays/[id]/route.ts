import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * DELETE /api/holidays/[id]
 *
 * Admins can delete any holiday. Managers can delete only the team-scoped
 * holidays they created — never a company-wide one.
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

    const { uid, claims } = authResult.user;
    const role = claims.role;
    const { id } = await params;

    const docRef = adminDb.collection('holidays').doc(id);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return ErrorResponses.notFound('Holiday');
    }

    const data = snapshot.data()!;
    const isOwner = data.scope === 'manager' && data.createdBy === uid;
    if (role !== 'admin' && !isOwner) {
      return ErrorResponses.forbidden('You can only delete holidays you created');
    }

    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return handleApiError(error);
  }
}
