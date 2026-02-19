import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can reject leave requests');
    }

    const { id } = await params;
    const body = await request.json();
    const approverId = body.approverId || authResult.user.uid;
    const reason = body.reason;

    if (!reason) {
      return ErrorResponses.badRequest('Rejection reason is required');
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const { Timestamp } = await import('firebase-admin/firestore');

    const docRef = adminDb.collection('leave-requests').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return ErrorResponses.notFound('Leave request');
    }

    await docRef.update({
      status: 'rejected',
      approverId,
      rejectionReason: reason,
      rejectedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    const updated = await docRef.get();
    const data = updated.data()!;

    return NextResponse.json(
      {
        id,
        ...data,
        startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : data.startDate,
        endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : data.endDate,
        rejectedAt: data.rejectedAt?.toDate ? data.rejectedAt.toDate().toISOString() : data.rejectedAt,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
